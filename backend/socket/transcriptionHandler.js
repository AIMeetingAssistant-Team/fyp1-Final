import Meeting from '../models/Meeting.js';
import { getTranscriptionLanguage } from '../utils/transcriptionConfig.js';

const CHUNK_INTERVAL_MS = parseInt(process.env.LIVE_TRANSCRIPTION_INTERVAL_MS || '5000', 10);
const MIN_BUFFER_BYTES = parseInt(process.env.LIVE_TRANSCRIPTION_MIN_BYTES || '80000', 10);
const MAX_CHUNK_SECONDS = parseFloat(process.env.LIVE_TRANSCRIPTION_MAX_SECONDS || '4', 10);
const TARGET_SAMPLE_RATE = 16000;
const MIN_SPEECH_RMS = parseFloat(process.env.LIVE_TRANSCRIPTION_MIN_SPEECH_RMS || '0.008', 10);

/** Prevent overlapping Whisper calls and backlog growth per speaker. */
const liveProcessingLocks = new Map();

/** Live captions are ephemeral; full AI pipeline runs on saved recordings only. */
const PERSIST_LIVE_TO_DB = process.env.LIVE_TRANSCRIPTION_PERSIST === 'true';

function audioPayloadToBuffer(audioData) {
  if (Buffer.isBuffer(audioData)) return audioData;
  if (audioData instanceof ArrayBuffer) return Buffer.from(audioData);
  if (ArrayBuffer.isView(audioData)) {
    return Buffer.from(audioData.buffer, audioData.byteOffset, audioData.byteLength);
  }
  if (Array.isArray(audioData)) {
    const int16 = Int16Array.from(audioData);
    return Buffer.from(int16.buffer, int16.byteOffset, int16.byteLength);
  }
  return Buffer.from(audioData);
}

function downsamplePcm16(pcmBuffer, fromRate, toRate = TARGET_SAMPLE_RATE) {
  if (!fromRate || fromRate <= toRate) return { buffer: pcmBuffer, sampleRate: fromRate || toRate };
  const ratio = fromRate / toRate;
  const inSamples = Math.floor(pcmBuffer.length / 2);
  const outSamples = Math.floor(inSamples / ratio);
  if (outSamples <= 0) return { buffer: pcmBuffer, sampleRate: fromRate };

  const out = Buffer.allocUnsafe(outSamples * 2);
  for (let i = 0; i < outSamples; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), inSamples);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j += 1) {
      sum += pcmBuffer.readInt16LE(j * 2);
      count += 1;
    }
    const sample = count ? Math.round(sum / count) : 0;
    out.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }
  return { buffer: out, sampleRate: toRate };
}

function pcmRms(pcmBuffer) {
  const samples = pcmBuffer.length / 2;
  if (!samples) return 0;
  let sumSquares = 0;
  for (let i = 0; i < samples; i += 1) {
    const sample = pcmBuffer.readInt16LE(i * 2) / 32768;
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / samples);
}

function appendTranscript(previous, chunk) {
  const prev = (previous || '').trim();
  const next = (chunk || '').trim();
  if (!next) return prev;
  if (!prev) return next;
  if (next === prev) return prev;
  if (next.startsWith(prev)) return next;

  let overlap = 0;
  const max = Math.min(prev.length, next.length);
  for (let i = max; i > 8; i -= 1) {
    if (prev.slice(-i).toLowerCase() === next.slice(0, i).toLowerCase()) {
      overlap = i;
      break;
    }
  }
  if (overlap) return prev + next.slice(overlap);
  return `${prev} ${next}`;
}

function trimProcessedChunks(session) {
  const keep = session.audioChunks.filter((chunk) => !chunk.processed);
  if (keep.length !== session.audioChunks.length) {
    session.audioChunks = keep;
  }
}

function userCanCaption(meeting, userId) {
  if (meeting.isHost(userId)) return true;
  if (meeting.isParticipant(userId)) return true;
  if (!meeting.isPrivate) return true;
  return false;
}

class TranscriptionHandlers {
  constructor(socket, io) {
    this.socket = socket;
    this.io = io;
    /** @type {Map<string, object>} */
    this.activeTranscriptions = new Map();
    this.setupHandlers();
  }

  setupHandlers() {
    this.socket.on('join-room', (data) => {
      const { meetingId } = data;
      if (meetingId) {
        this.socket.join(`meeting:${String(meetingId)}`);
      }
    });

    this.socket.on('transcription:audio-config', (data) => {
      try {
        const { meetingId, sampleRate, channels } = data;
        const session = this.activeTranscriptions.get(String(meetingId));
        if (session) {
          if (sampleRate) session.sampleRate = sampleRate;
          session.channels = channels || 1;
        }
      } catch (error) {
        console.error('Audio config error:', error);
      }
    });

    this.socket.on('transcription:start', async (data) => {
      const { meetingId, language } = data;
      const meetingKey = String(meetingId);
      const roomName = `meeting:${meetingKey}`;

      try {
        this.socket.join(roomName);

        // Register session immediately so early audio chunks are not dropped.
        let session = this.activeTranscriptions.get(meetingKey);
        if (!session) {
          session = {
            meetingId: meetingKey,
            audioChunks: [],
            startTime: new Date(),
            isActive: true,
            sampleRate: 16000,
            channels: 1,
            language: language || getTranscriptionLanguage(),
            contributors: new Map(),
            processingInterval: null,
            lastTranscriptByUser: new Map(),
          };
          session.processingInterval = setInterval(() => {
            this.processBufferedChunksForTranscription(meetingKey).catch((err) => {
              console.error('Live transcription interval error:', err);
            });
          }, CHUNK_INTERVAL_MS);
          this.activeTranscriptions.set(meetingKey, session);
        }

        session.contributors.set(this.socket.userId, {
          userId: this.socket.userId,
          userName: this.socket.user.name,
          isActive: true,
        });
        session.isActive = true;
        if (language) session.language = language;

        const meeting = await Meeting.findById(meetingKey);
        if (!meeting) {
          this.socket.emit('error', { message: 'Meeting not found' });
          return;
        }

        if (!userCanCaption(meeting, this.socket.userId)) {
          session.contributors.delete(this.socket.userId);
          this.socket.emit('error', { message: 'You are not a participant in this meeting' });
          return;
        }

        this.io.to(roomName).emit('transcription:started', {
          meetingId: meetingKey,
          startedBy: { id: this.socket.userId, name: this.socket.user.name },
          startTime: session.startTime,
        });

        console.log(`🎙️ Live transcript on for meeting ${meetingKey} (${this.socket.user.name})`);
      } catch (error) {
        console.error('Start transcription error:', error);
        this.socket.emit('error', { message: 'Failed to start live transcript' });
      }
    });

    this.socket.on('transcription:audio-chunk', async (data) => {
      try {
        const { meetingId, audioData, isFinal = false, sampleRate } = data;
        const meetingKey = String(meetingId);
        const session = this.activeTranscriptions.get(meetingKey);
        if (!session?.isActive) return;

        if (sampleRate) session.sampleRate = sampleRate;

        if (!session.contributors.has(this.socket.userId)) {
          session.contributors.set(this.socket.userId, {
            userId: this.socket.userId,
            userName: this.socket.user.name,
            isActive: true,
          });
        }

        const contributor = session.contributors.get(this.socket.userId);
        if (!contributor?.isActive) return;

        session.audioChunks.push({
          userId: this.socket.userId,
          userName: this.socket.user.name,
          audioData: audioPayloadToBuffer(audioData),
          timestamp: new Date(),
          isFinal,
          processed: false,
        });

        if (isFinal) {
          await this.processBufferedChunksForTranscription(meetingKey, this.socket.userId);
        }
      } catch (error) {
        console.error('Audio chunk error:', error);
      }
    });

    this.socket.on('transcription:stop', async (data) => {
      try {
        const { meetingId } = data;
        const meetingKey = String(meetingId);
        const session = this.activeTranscriptions.get(meetingKey);
        if (!session) return;

        session.contributors.delete(this.socket.userId);

        if (session.contributors.size > 0) {
          await this.processBufferedChunksForTranscription(meetingKey, this.socket.userId);
          return;
        }

        session.isActive = false;
        session.endTime = new Date();

        if (session.processingInterval) {
          clearInterval(session.processingInterval);
        }

        await this.processBufferedChunksForTranscription(meetingKey);
        await this.finalizeTranscription(meetingKey);

        const roomName = `meeting:${meetingKey}`;
        this.io.to(roomName).emit('transcription:stopped', {
          meetingId: meetingKey,
          stoppedBy: { id: this.socket.userId, name: this.socket.user.name },
          endTime: session.endTime,
        });

        console.log(`🛑 Live transcript off for meeting ${meetingKey}`);
      } catch (error) {
        console.error('Stop transcription error:', error);
        this.socket.emit('error', { message: 'Failed to stop live captions' });
      }
    });

    this.socket.on('transcription:status', (data) => {
      const { meetingId } = data;
      const meetingKey = String(meetingId);
      const session = this.activeTranscriptions.get(meetingKey);
      if (!session) {
        this.socket.emit('transcription:status-response', {
          meetingId: meetingKey,
          isActive: false,
          message: 'No active live captions',
        });
        return;
      }

      this.socket.emit('transcription:status-response', {
        meetingId: meetingKey,
        isActive: session.isActive,
        startTime: session.startTime,
        duration: Date.now() - session.startTime,
        chunkCount: session.audioChunks.length,
        participantCount: session.contributors.size,
      });
    });

    this.socket.on('disconnect', () => {
      for (const [meetingId, session] of this.activeTranscriptions.entries()) {
        if (session.contributors.has(this.socket.userId)) {
          session.contributors.delete(this.socket.userId);
          if (session.contributors.size === 0) {
            session.isActive = false;
            if (session.processingInterval) clearInterval(session.processingInterval);
            this.activeTranscriptions.delete(meetingId);
          }
        }
      }
    });
  }

  convertPCMToWAV(pcmBuffer, sampleRate, channels, bitDepth) {
    const length = pcmBuffer.length;
    const wavBuffer = Buffer.allocUnsafe(44 + length);

    wavBuffer.write('RIFF', 0);
    wavBuffer.writeUInt32LE(36 + length, 4);
    wavBuffer.write('WAVE', 8);
    wavBuffer.write('fmt ', 12);
    wavBuffer.writeUInt32LE(16, 16);
    wavBuffer.writeUInt16LE(1, 20);
    wavBuffer.writeUInt16LE(channels, 22);
    wavBuffer.writeUInt32LE(sampleRate, 24);
    wavBuffer.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
    wavBuffer.writeUInt16LE(channels * (bitDepth / 8), 32);
    wavBuffer.writeUInt16LE(bitDepth, 34);
    wavBuffer.write('data', 36);
    wavBuffer.writeUInt32LE(length, 40);

    pcmBuffer.copy(wavBuffer, 44);
    return wavBuffer;
  }

  async processBufferedChunksForTranscription(meetingId, onlyUserId = null) {
    const meetingKey = String(meetingId);
    const session = this.activeTranscriptions.get(meetingKey);
    if (!session) return;

    const unprocessed = session.audioChunks.filter((chunk) => {
      if (chunk.processed) return false;
      if (onlyUserId && chunk.userId !== onlyUserId) return false;
      return true;
    });
    if (unprocessed.length === 0) return;

    const byUser = new Map();
    for (const chunk of unprocessed) {
      if (!byUser.has(chunk.userId)) byUser.set(chunk.userId, []);
      byUser.get(chunk.userId).push(chunk);
    }

    const aiService = (await import('../utils/aiService.js')).default;
    const roomName = `meeting:${meetingKey}`;
    const language = session.language || getTranscriptionLanguage();
    const sourceRate = session.sampleRate || TARGET_SAMPLE_RATE;
    const bytesPerSecond = sourceRate * (session.channels || 1) * 2;
    const maxBytes = Math.max(MIN_BUFFER_BYTES, Math.floor(bytesPerSecond * MAX_CHUNK_SECONDS));

    for (const [userId, chunks] of byUser.entries()) {
      const lockKey = `${meetingKey}:${userId}`;
      if (liveProcessingLocks.get(lockKey)) continue;

      const totalLength = chunks.reduce((sum, c) => sum + c.audioData.length, 0);
      if (totalLength < MIN_BUFFER_BYTES) continue;

      let combined = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        chunk.audioData.copy(combined, offset);
        offset += chunk.audioData.length;
      }

      // Sliding window: only transcribe the most recent few seconds to avoid backlog.
      if (combined.length > maxBytes) {
        combined = combined.subarray(combined.length - maxBytes);
      }

      const downsampled = downsamplePcm16(combined, sourceRate, TARGET_SAMPLE_RATE);
      const energy = pcmRms(downsampled.buffer);
      if (energy < MIN_SPEECH_RMS) {
        chunks.forEach((c) => { c.processed = true; });
        trimProcessedChunks(session);
        continue;
      }

      const wavBuffer = this.convertPCMToWAV(
        downsampled.buffer,
        downsampled.sampleRate,
        session.channels || 1,
        16,
      );
      liveProcessingLocks.set(lockKey, true);
      try {
        const previous = session.lastTranscriptByUser.get(userId) || '';
        const result = await aiService.transcribeStreamChunk(
          wavBuffer,
          `live-${meetingKey}-${userId}-${Date.now()}.wav`,
          language,
          previous,
        );

        if (result.success && result.text?.trim()) {
          const chunkText = result.text.trim();
          const fullText = appendTranscript(previous, chunkText);
          if (fullText === previous) {
            continue;
          }
          session.lastTranscriptByUser.set(userId, fullText);

          const confidence = typeof result.confidence === 'number'
            ? result.confidence
            : 0.85;

          this.io.to(roomName).emit('transcription:partial', {
            meetingId: meetingKey,
            userId,
            text: chunkText,
            fullText,
            language: result.language || language,
            confidence,
            timestamp: new Date().toISOString(),
            isPartial: false,
          });
          console.log(`📝 Live transcript [${meetingKey}]: ${fullText.slice(-80)}`);
        }
      } catch (err) {
        console.error('Live chunk transcribe error:', err.message);
      } finally {
        liveProcessingLocks.delete(lockKey);
        chunks.forEach((c) => { c.processed = true; });
        trimProcessedChunks(session);
      }
    }
  }

  async finalizeTranscription(meetingId) {
    const meetingKey = String(meetingId);
    const session = this.activeTranscriptions.get(meetingKey);
    if (!session) return;

    if (PERSIST_LIVE_TO_DB) {
      console.warn('LIVE_TRANSCRIPTION_PERSIST=true: legacy DB save path (not recommended)');
    }

    this.activeTranscriptions.delete(meetingKey);

    const roomName = `meeting:${meetingKey}`;
    this.io.to(roomName).emit('transcription:completed', {
      meetingId: meetingKey,
      message: 'Live captions ended',
      completedAt: new Date(),
    });
  }
}

export default TranscriptionHandlers;

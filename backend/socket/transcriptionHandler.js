import Meeting from '../models/Meeting.js';
import { getTranscriptionLanguage } from '../utils/transcriptionConfig.js';

const CHUNK_INTERVAL_MS = parseInt(process.env.LIVE_TRANSCRIPTION_INTERVAL_MS || '4000', 10);
const MIN_BUFFER_BYTES = parseInt(process.env.LIVE_TRANSCRIPTION_MIN_BYTES || '24000', 10);

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
        this.socket.join(`meeting:${meetingId}`);
      }
    });

    this.socket.on('transcription:audio-config', (data) => {
      try {
        const { meetingId, sampleRate, channels } = data;
        const session = this.activeTranscriptions.get(meetingId);
        if (session) {
          session.sampleRate = sampleRate || 16000;
          session.channels = channels || 1;
        }
      } catch (error) {
        console.error('Audio config error:', error);
      }
    });

    this.socket.on('transcription:start', async (data) => {
      try {
        const { meetingId, language } = data;
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
          this.socket.emit('error', { message: 'Meeting not found' });
          return;
        }

        if (!userCanCaption(meeting, this.socket.userId)) {
          this.socket.emit('error', { message: 'You are not a participant in this meeting' });
          return;
        }

        const roomName = `meeting:${meetingId}`;
        this.socket.join(roomName);

        let session = this.activeTranscriptions.get(meetingId);
        if (!session) {
          session = {
            meetingId,
            audioChunks: [],
            startTime: new Date(),
            isActive: true,
            sampleRate: 16000,
            channels: 1,
            language: language || getTranscriptionLanguage(),
            contributors: new Map(),
            processingInterval: null,
          };
          session.processingInterval = setInterval(() => {
            this.processBufferedChunksForTranscription(meetingId).catch((err) => {
              console.error('Live transcription interval error:', err);
            });
          }, CHUNK_INTERVAL_MS);
          this.activeTranscriptions.set(meetingId, session);
        }

        session.contributors.set(this.socket.userId, {
          userId: this.socket.userId,
          userName: this.socket.user.name,
          isActive: true,
        });
        session.isActive = true;

        this.io.to(roomName).emit('transcription:started', {
          meetingId,
          startedBy: { id: this.socket.userId, name: this.socket.user.name },
          startTime: session.startTime,
        });

        console.log(`🎙️ Live captions on for meeting ${meetingId} (${this.socket.user.name})`);
      } catch (error) {
        console.error('Start transcription error:', error);
        this.socket.emit('error', { message: 'Failed to start live captions' });
      }
    });

    this.socket.on('transcription:audio-chunk', async (data) => {
      try {
        const { meetingId, audioData, isFinal = false } = data;
        const session = this.activeTranscriptions.get(meetingId);
        if (!session?.isActive) return;

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
          await this.processBufferedChunksForTranscription(meetingId, this.socket.userId);
        }
      } catch (error) {
        console.error('Audio chunk error:', error);
      }
    });

    this.socket.on('transcription:stop', async (data) => {
      try {
        const { meetingId } = data;
        const session = this.activeTranscriptions.get(meetingId);
        if (!session) return;

        session.contributors.delete(this.socket.userId);

        if (session.contributors.size > 0) {
          await this.processBufferedChunksForTranscription(meetingId, this.socket.userId);
          return;
        }

        session.isActive = false;
        session.endTime = new Date();

        if (session.processingInterval) {
          clearInterval(session.processingInterval);
        }

        await this.processBufferedChunksForTranscription(meetingId);
        await this.finalizeTranscription(meetingId);

        const roomName = `meeting:${meetingId}`;
        this.io.to(roomName).emit('transcription:stopped', {
          meetingId,
          stoppedBy: { id: this.socket.userId, name: this.socket.user.name },
          endTime: session.endTime,
        });

        console.log(`🛑 Live captions off for meeting ${meetingId}`);
      } catch (error) {
        console.error('Stop transcription error:', error);
        this.socket.emit('error', { message: 'Failed to stop live captions' });
      }
    });

    this.socket.on('transcription:status', (data) => {
      const { meetingId } = data;
      const session = this.activeTranscriptions.get(meetingId);
      if (!session) {
        this.socket.emit('transcription:status-response', {
          meetingId,
          isActive: false,
          message: 'No active live captions',
        });
        return;
      }

      this.socket.emit('transcription:status-response', {
        meetingId,
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
    const session = this.activeTranscriptions.get(meetingId);
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
    const roomName = `meeting:${meetingId}`;
    const language = session.language || getTranscriptionLanguage();

    for (const [userId, chunks] of byUser.entries()) {
      const totalLength = chunks.reduce((sum, c) => sum + c.audioData.length, 0);
      if (totalLength < MIN_BUFFER_BYTES) continue;

      const combined = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        chunk.audioData.copy(combined, offset);
        offset += chunk.audioData.length;
      }

      const sampleRate = session.sampleRate || 16000;
      const wavBuffer = this.convertPCMToWAV(combined, sampleRate, session.channels || 1, 16);
      const speaker = chunks[0]?.userName || 'Speaker';

      try {
        const result = await aiService.transcribeStreamChunk(
          wavBuffer,
          `live-${meetingId}-${userId}-${Date.now()}.wav`,
          language,
        );

        if (result.success && result.text?.trim()) {
          this.io.to(roomName).emit('transcription:partial', {
            meetingId,
            userId,
            speaker,
            text: result.text.trim(),
            language: result.language || language,
            confidence: result.confidence ?? 0.85,
            timestamp: new Date(),
            isPartial: true,
          });
        }
      } catch (err) {
        console.error('Live chunk transcribe error:', err.message);
      }

      chunks.forEach((c) => { c.processed = true; });
    }
  }

  async finalizeTranscription(meetingId) {
    const session = this.activeTranscriptions.get(meetingId);
    if (!session) return;

    if (PERSIST_LIVE_TO_DB) {
      console.warn('LIVE_TRANSCRIPTION_PERSIST=true: legacy DB save path (not recommended)');
    }

    this.activeTranscriptions.delete(meetingId);

    const roomName = `meeting:${meetingId}`;
    this.io.to(roomName).emit('transcription:completed', {
      meetingId,
      message: 'Live captions ended',
      completedAt: new Date(),
    });
  }
}

export default TranscriptionHandlers;

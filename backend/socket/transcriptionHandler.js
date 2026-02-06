import Meeting from '../models/Meeting.js';
import aiService from '../utils/aiService.js';

class TranscriptionHandlers {
  constructor(socket, io) {
    this.socket = socket;
    this.io = io;
    this.activeTranscriptions = new Map(); // meetingId -> transcription data
    this.setupHandlers();
  }

  setupHandlers() {
    // Join room handler
    this.socket.on('join-room', (data) => {
      const { meetingId } = data;
      if (meetingId) {
        const roomName = `meeting:${meetingId}`;
        this.socket.join(roomName);
        console.log(`👤 ${this.socket.user.name} joined room: ${roomName}`);
      }
    });

    // Receive audio configuration
    this.socket.on('transcription:audio-config', (data) => {
      try {
        const { meetingId, sampleRate, channels } = data;
        const transcription = this.activeTranscriptions.get(meetingId);
        if (transcription) {
          transcription.sampleRate = sampleRate || 16000;
          transcription.channels = channels || 1;
        }
      } catch (error) {
        console.error('Audio config error:', error);
      }
    });

    // Start real-time transcription for a meeting
    this.socket.on('transcription:start', async (data) => {
      try {
        const { meetingId } = data;
        
        console.log(`🎙️ Starting transcription for meeting: ${meetingId}`);
        
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
          this.socket.emit('error', { message: 'Meeting not found' });
          return;
        }

        // Check if user is host
        const isHost = meeting.host.toString() === this.socket.userId;
        if (!isHost) {
          this.socket.emit('error', { message: 'Only host can start transcription' });
          return;
        }

        // Join the room
        const roomName = `meeting:${meetingId}`;
        this.socket.join(roomName);

        // Initialize transcription data
        this.activeTranscriptions.set(meetingId, {
          meetingId,
          hostId: this.socket.userId,
          participants: new Set([this.socket.userId]),
          audioChunks: [],
          processedChunks: [],
          startTime: new Date(),
          isActive: true,
          accumulatedText: '',
          lastProcessTime: null,
          processingInterval: null,
          sampleRate: 16000,
          channels: 1
        });

        // Start periodic processing of audio chunks (every 5 seconds)
        const transcription = this.activeTranscriptions.get(meetingId);
        transcription.processingInterval = setInterval(async () => {
          await this.processBufferedChunksForTranscription(meetingId);
        }, 5000);

        // Notify all participants
        this.io.to(roomName).emit('transcription:started', {
          meetingId,
          startedBy: {
            id: this.socket.userId,
            name: this.socket.user.name
          },
          startTime: new Date()
        });

        console.log(`✅ Transcription started for meeting: ${meetingId}`);

      } catch (error) {
        console.error('Start transcription error:', error);
        this.socket.emit('error', { message: 'Failed to start transcription' });
      }
    });

    // Send audio chunk for transcription
    this.socket.on('transcription:audio-chunk', async (data) => {
      try {
        const { meetingId, audioData, isFinal = false } = data;
        
        const transcription = this.activeTranscriptions.get(meetingId);
        if (!transcription || !transcription.isActive) {
          return;
        }

        // Store audio chunk
        transcription.audioChunks.push({
          userId: this.socket.userId,
          userName: this.socket.user.name,
          audioData: Buffer.from(audioData),
          timestamp: new Date(),
          isFinal,
          processed: false
        });

        // If this is a final chunk, process it
        if (isFinal) {
          await this.processAudioChunk(meetingId, this.socket.userId);
        }

      } catch (error) {
        console.error('Audio chunk error:', error);
      }
    });

    // Stop transcription
    this.socket.on('transcription:stop', async (data) => {
      try {
        const { meetingId } = data;
        
        const transcription = this.activeTranscriptions.get(meetingId);
        if (!transcription) {
          return;
        }

        // Mark as inactive
        transcription.isActive = false;
        transcription.endTime = new Date();

        // Clear processing interval
        if (transcription.processingInterval) {
          clearInterval(transcription.processingInterval);
        }

        // Process any remaining chunks one more time
        await this.processBufferedChunksForTranscription(meetingId);

        // Wait a moment for final processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Finalize and save
        await this.finalizeTranscription(meetingId);

        // Notify participants
        const roomName = `meeting:${meetingId}`;
        this.io.to(roomName).emit('transcription:stopped', {
          meetingId,
          stoppedBy: {
            id: this.socket.userId,
            name: this.socket.user.name
          },
          endTime: new Date(),
          duration: transcription.endTime - transcription.startTime
        });

        console.log(`🛑 Transcription stopped for meeting: ${meetingId}`);

      } catch (error) {
        console.error('Stop transcription error:', error);
        this.socket.emit('error', { message: 'Failed to stop transcription' });
      }
    });

    // Get transcription status
    this.socket.on('transcription:status', (data) => {
      const { meetingId } = data;
      
      const transcription = this.activeTranscriptions.get(meetingId);
      if (!transcription) {
        this.socket.emit('transcription:status-response', {
          meetingId,
          isActive: false,
          message: 'No active transcription'
        });
        return;
      }

      this.socket.emit('transcription:status-response', {
        meetingId,
        isActive: transcription.isActive,
        startTime: transcription.startTime,
        duration: new Date() - transcription.startTime,
        chunkCount: transcription.audioChunks.length,
        participantCount: transcription.participants.size
      });
    });
  }

  async processAudioChunk(meetingId, userId) {
    try {
      const transcription = this.activeTranscriptions.get(meetingId);
      if (!transcription) return;

      // Get user's audio chunks
      const userChunks = transcription.audioChunks.filter(
        chunk => chunk.userId === userId && !chunk.processed
      );

      if (userChunks.length === 0) return;

      // Process chunks periodically - accumulate and send to AI service
      // For real-time, we process every 5 seconds
      if (!transcription.lastProcessTime || (Date.now() - transcription.lastProcessTime) > 5000) {
        await this.processBufferedChunksForTranscription(meetingId);
        transcription.lastProcessTime = Date.now();
      }

      // Mark as processed
      userChunks.forEach(chunk => chunk.processed = true);

    } catch (error) {
      console.error('Process audio chunk error:', error);
    }
  }

  async processBufferedChunksForTranscription(meetingId) {
    try {
      const transcription = this.activeTranscriptions.get(meetingId);
      if (!transcription || !transcription.isActive) return;

      const unprocessedChunks = transcription.audioChunks.filter(chunk => !chunk.processed);
      if (unprocessedChunks.length === 0) return;

      // Need minimum audio for processing (at least 3 seconds worth)
      const minChunksNeeded = 3;
      if (unprocessedChunks.length < minChunksNeeded) {
        return; // Wait for more chunks
      }

      // Combine audio chunks
      const totalLength = unprocessedChunks.reduce((sum, chunk) => sum + chunk.audioData.length, 0);
      if (totalLength < 32000) return; // Need at least ~1 second of audio

      const combinedBuffer = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (const chunk of unprocessedChunks) {
        chunk.audioData.copy(combinedBuffer, offset);
        offset += chunk.audioData.length;
      }

      // Convert PCM to WAV and send to AI service
      try {
        const sampleRate = transcription.sampleRate || 16000;
        const channels = transcription.channels || 1;
        const wavBuffer = this.convertPCMToWAV(combinedBuffer, sampleRate, channels, 16);
        
        const aiService = (await import('../utils/aiService.js')).default;
        const transcriptionResult = await aiService.transcribeAudio(
          wavBuffer,
          `realtime-${meetingId}-${Date.now()}.wav`,
          'en'
        );

        if (transcriptionResult.success && transcriptionResult.text) {
          const text = transcriptionResult.text.trim();
          if (text) {
            // Accumulate text
            if (!transcription.accumulatedText) {
              transcription.accumulatedText = '';
            }
            transcription.accumulatedText += ' ' + text;

            // Emit to client
            const roomName = `meeting:${meetingId}`;
            this.io.to(roomName).emit('transcription:partial', {
              meetingId,
              text: text,
              timestamp: new Date(),
              isPartial: true
            });
          }
        }
      } catch (transcribeError) {
        console.error('Error transcribing chunk:', transcribeError);
      }

      // Mark chunks as processed
      unprocessedChunks.forEach(chunk => {
        chunk.processed = true;
        transcription.processedChunks.push(chunk);
      });
      
    } catch (error) {
      console.error('Process buffered chunks error:', error);
    }
  }

  convertPCMToWAV(pcmBuffer, sampleRate, channels, bitDepth) {
    const length = pcmBuffer.length;
    const wavBuffer = Buffer.allocUnsafe(44 + length);
    
    // WAV header
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

  async finalizeTranscription(meetingId) {
    try {
      const transcription = this.activeTranscriptions.get(meetingId);
      if (!transcription) return;

      console.log(`📄 Finalizing transcription for meeting: ${meetingId}`);

      // Get accumulated transcription text
      const accumulatedText = transcription.accumulatedText || '';
      
      if (accumulatedText.trim()) {
        // Save transcription to database
        const meeting = await Meeting.findById(meetingId);
        if (meeting) {
          // Get the latest recording index (for real-time, it's usually the last one)
          const recordingIndex = meeting.recordings ? meeting.recordings.length - 1 : 0;
          
          const transcriptionResult = {
            text: accumulatedText.trim(),
            segments: [],
            language: 'en',
            confidence: 0.9
          };

          // Save transcription
          await meeting.completeTranscription(transcriptionResult, recordingIndex);
          console.log(`✅ Real-time transcription saved to database`);

          // Generate minutes automatically for real-time transcriptions
          try {
            const aiService = (await import('../utils/aiService.js')).default;
            const minutesResult = await aiService.generateMinutes(
              accumulatedText.trim(),
              meeting.meetingType || 'general'
            );

            if (minutesResult.success) {
              await meeting.generateMinutes({
                summary: minutesResult.summary || '',
                keyPoints: minutesResult.minutes?.key_points || minutesResult.key_points || [],
                decisions: minutesResult.minutes?.decisions || minutesResult.decisions || [],
                actionItems: minutesResult.minutes?.next_steps?.map((step) => ({
                  text: step,
                  assignedTo: null,
                  deadline: null,
                  status: 'pending'
                })) || []
              });
              console.log(`✅ Minutes generated for real-time transcription`);
            }
          } catch (minutesError) {
            console.error('Failed to generate minutes:', minutesError);
          }
        }
      }

      // Emit completion event
      const roomName = `meeting:${meetingId}`;
      this.io.to(roomName).emit('transcription:completed', {
        meetingId,
        message: 'Transcription completed and saved',
        totalChunks: transcription.audioChunks.length,
        duration: transcription.endTime - transcription.startTime,
        completedAt: new Date()
      });

      // Clear from memory
      this.activeTranscriptions.delete(meetingId);

    } catch (error) {
      console.error('Finalize transcription error:', error);
    }
  }
}

export default TranscriptionHandlers;
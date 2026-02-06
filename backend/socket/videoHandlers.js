import Meeting from '../models/Meeting.js';
import zegoTokenGenerator from '../utils/zegoTokenGenerator.js';

class VideoHandlers {
  constructor(socket, io) {
    this.socket = socket;
    this.io = io;
    this.activeVideoRooms = new Map(); // roomId -> Set of socketIds
    this.setupHandlers();
  }

  setupHandlers() {
    // User joins video room
    this.socket.on('video:join-room', async (data) => {
      try {
        const { meetingId } = data;

        console.log('🎥 [Socket] User joining video room:', meetingId, this.socket.user.name);

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
          this.socket.emit('error', { message: 'Meeting not found' });
          return;
        }

        // Check if user has access
        const isHost = meeting.host.toString() === this.socket.userId;
        const isParticipant = meeting.participants.some(
          p => p.user.toString() === this.socket.userId
        );

        if (!isHost && !isParticipant && meeting.isPrivate) {
          this.socket.emit('error', { message: 'Not authorized to join video meeting' });
          return;
        }

        // Ensure roomId exists
        const roomId = meeting.videoRoomId || `meeting_${meeting._id}`;
        
        // Mark participant as joined in meeting
        await meeting.markParticipantJoinedVideo(this.socket.userId, this.socket.id);
        
        // Join socket room
        await this.socket.join(`video:${roomId}`);

        // Track active users
        if (!this.activeVideoRooms.has(roomId)) {
          this.activeVideoRooms.set(roomId, new Set());
        }
        this.activeVideoRooms.get(roomId).add(this.socket.id);

        // Get current participants
        const participants = this.getVideoRoomParticipants(roomId);

        console.log(`🎥 User ${this.socket.user.name} joined video room ${roomId}`);
        console.log(`👥 Active participants: ${participants.length}`);

        // Notify others in the room
        this.socket.to(`video:${roomId}`).emit('video:user-joined', {
          user: {
            id: this.socket.userId,
            name: this.socket.user.name,
            profilePicture: this.socket.user.profilePicture,
            isHost
          },
          participantCount: participants.length,
          participants: participants,
          joinedAt: new Date()
        });

        // Send current participants to the joining user
        this.socket.emit('video:room-info', {
          roomId,
          participants,
          participantCount: participants.length,
          meeting: {
            id: meeting._id,
            title: meeting.title,
            host: meeting.host
          }
        });

      } catch (error) {
        console.error('Video join room error:', error);
        this.socket.emit('error', { message: 'Failed to join video room' });
      }
    });

    // User leaves video room
    this.socket.on('video:leave-room', async (data) => {
      try {
        const { meetingId } = data;

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) return;

        const roomId = meeting.videoRoomId || `meeting_${meeting._id}`;
        
        // Mark participant as left
        await meeting.markParticipantLeftVideo(this.socket.userId);
        
        // Leave socket room
        this.socket.leave(`video:${roomId}`);

        // Remove from tracking
        if (this.activeVideoRooms.has(roomId)) {
          this.activeVideoRooms.get(roomId).delete(this.socket.id);
          if (this.activeVideoRooms.get(roomId).size === 0) {
            this.activeVideoRooms.delete(roomId);
          }
        }

        const participants = this.getVideoRoomParticipants(roomId);
        
        // Notify others
        this.socket.to(`video:${roomId}`).emit('video:user-left', {
          user: {
            id: this.socket.userId,
            name: this.socket.user.name
          },
          participantCount: participants.length,
          leftAt: new Date()
        });

        console.log(`🎥 User ${this.socket.user.name} left video room ${roomId}`);

      } catch (error) {
        console.error('Video leave room error:', error);
      }
    });

    // User toggles video/audio
    this.socket.on('video:toggle-media', (data) => {
      const { meetingId, mediaType, enabled } = data;
      const meeting = Meeting.findById(meetingId);
      const roomId = meeting?.videoRoomId || `meeting_${meetingId}`;

      this.socket.to(`video:${roomId}`).emit('video:media-toggled', {
        user: {
          id: this.socket.userId,
          name: this.socket.user.name
        },
        mediaType, // 'video' or 'audio'
        enabled,
        timestamp: new Date()
      });
    });

    // Screen sharing
    this.socket.on('video:screen-share', (data) => {
      const { meetingId, sharing } = data;
      const meeting = Meeting.findById(meetingId);
      const roomId = meeting?.videoRoomId || `meeting_${meetingId}`;

      this.socket.to(`video:${roomId}`).emit('video:screen-sharing', {
        user: {
          id: this.socket.userId,
          name: this.socket.user.name
        },
        sharing,
        timestamp: new Date()
      });
    });

    // Handle disconnection
    this.socket.on('disconnect', async () => {
      // Clean up from all video rooms
      for (const [roomId, socketIds] of this.activeVideoRooms.entries()) {
        if (socketIds.has(this.socket.id)) {
          socketIds.delete(this.socket.id);
          
          if (socketIds.size === 0) {
            this.activeVideoRooms.delete(roomId);
          } else {
            // Notify others
            this.socket.to(`video:${roomId}`).emit('video:user-disconnected', {
              userId: this.socket.userId,
              disconnectedAt: new Date()
            });
          }
        }
      }
    });
  }

  getVideoRoomParticipants(roomId) {
    const room = this.io.sockets.adapter.rooms.get(`video:${roomId}`);
    if (!room) return [];

    const participants = [];
    
    for (const socketId of room) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.user) {
        participants.push({
          id: socket.userId,
          name: socket.user.name,
          profilePicture: socket.user.profilePicture,
          socketId
        });
      }
    }

    return participants;
  }

  getVideoRoomCount(roomId) {
    const room = this.io.sockets.adapter.rooms.get(`video:${roomId}`);
    return room ? room.size : 0;
  }
}

export default VideoHandlers;
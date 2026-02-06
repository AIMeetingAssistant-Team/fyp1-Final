import Meeting from '../models/Meeting.js';

class MeetingHandlers {
  constructor(socket, io) {
    this.socket = socket;
    this.io = io;
    this.setupHandlers();
  }

  setupHandlers() {
    // Join a meeting room
    this.socket.on('meeting:join', async (data) => {
      try {
        const { meetingId } = data;
        
        if (!meetingId) {
          this.socket.emit('error', { message: 'Meeting ID is required' });
          return;
        }

        // Verify meeting exists and user has access
        const meeting = await Meeting.findById(meetingId)
          .populate('host', 'name email profilePicture')
          .populate('participants.user', 'name email profilePicture');

        if (!meeting) {
          this.socket.emit('error', { message: 'Meeting not found' });
          return;
        }

        // Check if user is host or participant
        const isHost = meeting.host._id.toString() === this.socket.userId;
        const isParticipant = meeting.participants.some(
          p => p.user._id.toString() === this.socket.userId
        );

        if (!isHost && !isParticipant && meeting.isPrivate) {
          this.socket.emit('error', { message: 'Not authorized to join this meeting' });
          return;
        }

        // Leave previous meeting rooms
        this.socket.rooms.forEach(room => {
          if (room.startsWith('meeting:')) {
            this.socket.leave(room);
          }
        });

        // Join the meeting room
        const roomName = `meeting:${meetingId}`;
        await this.socket.join(roomName);

        // Initialize meeting room if it doesn't exist
        if (!this.io.sockets.adapter.rooms.get(roomName)) {
          this.io.sockets.adapter.rooms.set(roomName, new Set());
        }

        // Add to our tracking
        const roomParticipants = this.io.sockets.adapter.rooms.get(roomName);
        roomParticipants.add(this.socket.id);

        console.log(`🎯 User ${this.socket.user.name} joined meeting ${meetingId}`);

        // Notify others in the meeting
        this.socket.to(roomName).emit('meeting:participant-joined', {
          user: {
            id: this.socket.userId,
            name: this.socket.user.name,
            profilePicture: this.socket.user.profilePicture,
            isHost: isHost
          },
          participantCount: roomParticipants.size,
          joinedAt: new Date()
        });

        // Send current participants to the joining user
        const participants = await this.getRoomParticipants(roomName);
        this.socket.emit('meeting:participants', {
          participants,
          participantCount: participants.length
        });

        // Send meeting details
        this.socket.emit('meeting:joined', {
          meeting: {
            id: meeting._id,
            title: meeting.title,
            description: meeting.description,
            status: meeting.status,
            host: meeting.host,
            startTime: meeting.startTime,
            endTime: meeting.endTime
          },
          userRole: isHost ? 'host' : 'participant'
        });

      } catch (error) {
        console.error('Meeting join error:', error);
        this.socket.emit('error', { message: 'Failed to join meeting' });
      }
    });

    // Leave a meeting room
    this.socket.on('meeting:leave', (data) => {
      const { meetingId } = data;
      const roomName = `meeting:${meetingId}`;

      this.socket.leave(roomName);
      
      // Notify others
      this.socket.to(roomName).emit('meeting:participant-left', {
        user: {
          id: this.socket.userId,
          name: this.socket.user.name
        },
        participantCount: this.io.sockets.adapter.rooms.get(roomName)?.size || 0,
        leftAt: new Date()
      });

      console.log(`🚪 User ${this.socket.user.name} left meeting ${meetingId}`);
    });

    // Update meeting status (host only)
    this.socket.on('meeting:status-update', async (data) => {
      try {
        const { meetingId, status } = data;

        if (!['scheduled', 'in-progress', 'completed', 'cancelled'].includes(status)) {
          this.socket.emit('error', { message: 'Invalid status' });
          return;
        }

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
          this.socket.emit('error', { message: 'Meeting not found' });
          return;
        }

        // Check if user is host
        if (meeting.host.toString() !== this.socket.userId) {
          this.socket.emit('error', { message: 'Only host can update meeting status' });
          return;
        }

        // Update meeting status
        meeting.status = status;
        await meeting.save();

        // Notify all participants
        const roomName = `meeting:${meetingId}`;
        this.io.to(roomName).emit('meeting:status-updated', {
          status,
          updatedBy: {
            id: this.socket.userId,
            name: this.socket.user.name
          },
          updatedAt: new Date()
        });

        console.log(`🔄 Meeting ${meetingId} status updated to ${status} by ${this.socket.user.name}`);

      } catch (error) {
        console.error('Meeting status update error:', error);
        this.socket.emit('error', { message: 'Failed to update meeting status' });
      }
    });

    // Raise hand in meeting
    this.socket.on('meeting:raise-hand', (data) => {
      const { meetingId } = data;
      const roomName = `meeting:${meetingId}`;

      this.socket.to(roomName).emit('meeting:hand-raised', {
        user: {
          id: this.socket.userId,
          name: this.socket.user.name,
          profilePicture: this.socket.user.profilePicture
        },
        raisedAt: new Date()
      });
    });

    // Lower hand in meeting
    this.socket.on('meeting:lower-hand', (data) => {
      const { meetingId } = data;
      const roomName = `meeting:${meetingId}`;

      this.socket.to(roomName).emit('meeting:hand-lowered', {
        userId: this.socket.userId,
        loweredAt: new Date()
      });
    });
  }

  async getRoomParticipants(roomName) {
    const room = this.io.sockets.adapter.rooms.get(roomName);
    if (!room) return [];

    const participants = [];
    
    for (const socketId of room) {
      const socket = this.io.sockets.sockets.get(socketId); // ✅ correct
      if (socket && socket.user) {
        const isHost = await this.isUserMeetingHost(socket.userId, roomName.replace('meeting:', ''));
        participants.push({
          id: socket.userId,
          name: socket.user.name,
          profilePicture: socket.user.profilePicture,
          isHost,
          socketId
        });
      }
    }

    return participants;
  }

  async isUserMeetingHost(userId, meetingId) {
    const meeting = await Meeting.findById(meetingId);
    return meeting && meeting.host.toString() === userId;
  }
}

export default MeetingHandlers;
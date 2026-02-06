import ChatMessage from '../models/ChatMessage.js';

class ChatHandlers {
  constructor(socket, io) {
    this.socket = socket;
    this.io = io;
    this.typingUsers = new Map(); // meetingId -> Set of userIds
    this.setupHandlers();
  }

  setupHandlers() {
    // Send message in meeting chat
    this.socket.on('chat:send-message', async (data) => {
      try {
        const { meetingId, message, type = 'text' } = data;

        if (!message || message.trim() === '') {
          this.socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        // Create chat message in database
        const chatMessage = await ChatMessage.create({
          meeting: meetingId,
          user: this.socket.userId,
          message: message.trim(),
          type,
          timestamp: new Date()
        });

        // Populate user data
        await chatMessage.populate('user', 'name email profilePicture');

        const roomName = `meeting:${meetingId}`;
        
        // Broadcast message to all in the meeting
        this.io.to(roomName).emit('chat:new-message', {
          id: chatMessage._id,
          message: chatMessage.message,
          type: chatMessage.type,
          user: {
            id: chatMessage.user._id,
            name: chatMessage.user.name,
            profilePicture: chatMessage.user.profilePicture
          },
          timestamp: chatMessage.timestamp
        });

        console.log(`💬 ${this.socket.user.name} sent message in meeting ${meetingId}`);

      } catch (error) {
        console.error('Chat message error:', error);
        this.socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // User starts typing
    this.socket.on('chat:typing-start', (data) => {
      const { meetingId } = data;
      const roomName = `meeting:${meetingId}`;

      // Add user to typing users for this meeting
      if (!this.typingUsers.has(meetingId)) {
        this.typingUsers.set(meetingId, new Set());
      }
      this.typingUsers.get(meetingId).add(this.socket.userId);

      // Notify others in the meeting
      this.socket.to(roomName).emit('chat:user-typing', {
        user: {
          id: this.socket.userId,
          name: this.socket.user.name
        },
        typingUsers: Array.from(this.typingUsers.get(meetingId))
      });
    });

    // User stops typing
    this.socket.on('chat:typing-stop', (data) => {
      const { meetingId } = data;
      const roomName = `meeting:${meetingId}`;

      // Remove user from typing users
      if (this.typingUsers.has(meetingId)) {
        this.typingUsers.get(meetingId).delete(this.socket.userId);
        
        // Notify others
        this.socket.to(roomName).emit('chat:user-typing', {
          user: {
            id: this.socket.userId,
            name: this.socket.user.name
          },
          typingUsers: Array.from(this.typingUsers.get(meetingId)),
          stopped: true
        });

        // Clean up if no one is typing
        if (this.typingUsers.get(meetingId).size === 0) {
          this.typingUsers.delete(meetingId);
        }
      }
    });

    // Get chat history for a meeting
    this.socket.on('chat:get-history', async (data) => {
      try {
        const { meetingId, limit = 50 } = data;

        const messages = await ChatMessage.find({ meeting: meetingId })
          .populate('user', 'name email profilePicture')
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean();

        // Reverse to show oldest first
        messages.reverse();

        this.socket.emit('chat:history', {
          meetingId,
          messages
        });

      } catch (error) {
        console.error('Chat history error:', error);
        this.socket.emit('error', { message: 'Failed to load chat history' });
      }
    });

    // Delete message (host or message owner)
    this.socket.on('chat:delete-message', async (data) => {
      try {
        const { messageId, meetingId } = data;

        const message = await ChatMessage.findById(messageId);
        if (!message) {
          this.socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if user can delete (host or message owner)
        const isMessageOwner = message.user.toString() === this.socket.userId;
        const isMeetingHost = await this.isUserMeetingHost(this.socket.userId, meetingId);

        if (!isMessageOwner && !isMeetingHost) {
          this.socket.emit('error', { message: 'Not authorized to delete this message' });
          return;
        }

        await ChatMessage.findByIdAndDelete(messageId);

        const roomName = `meeting:${meetingId}`;
        this.io.to(roomName).emit('chat:message-deleted', {
          messageId,
          deletedBy: {
            id: this.socket.userId,
            name: this.socket.user.name
          },
          deletedAt: new Date()
        });

      } catch (error) {
        console.error('Delete message error:', error);
        this.socket.emit('error', { message: 'Failed to delete message' });
      }
    });
  }

  async isUserMeetingHost(userId, meetingId) {
    const Meeting = (await import('../models/Meeting.js')).default;
    const meeting = await Meeting.findById(meetingId);
    return meeting && meeting.host.toString() === userId;
  }
}

export default ChatHandlers;
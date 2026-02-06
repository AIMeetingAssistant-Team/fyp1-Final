import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import MeetingHandlers from './meetingHandlers.js';
import ChatHandlers from './chatHandlers.js';
import TaskHandlers from './taskHandlers.js';
import NotificationHandlers from './notificationHandlers.js';
import VideoHandlers from './videoHandlers.js';

// Store active users and their socket connections
const activeUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userData

class SocketServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        if (!user.isActive) {
          return next(new Error('Authentication error: Account deactivated'));
        }

        socket.userId = user._id.toString();
        socket.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture?.url
        };

        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User ${socket.user.name} connected: ${socket.id}`);

      // Add user to active users
      this.addActiveUser(socket.userId, socket.id, socket.user);

      // Send current active users to the newly connected user
      this.sendActiveUsers();

      // Initialize all handlers
      new MeetingHandlers(socket, this.io);
      new ChatHandlers(socket, this.io);
      new TaskHandlers(socket, this.io);
      new NotificationHandlers(socket, this.io);
      new VideoHandlers(socket, this.io); // ADD THIS LINE


      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.user.name}:`, error);
      });

      // Ping-pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });
    });
  }

  addActiveUser(userId, socketId, userData) {
    activeUsers.set(userId, socketId);
    userSockets.set(socketId, {
      userId,
      ...userData,
      connectedAt: new Date()
    });

    console.log(`👤 Active users: ${activeUsers.size}`);
  }

  removeActiveUser(socketId) {
    const userData = userSockets.get(socketId);
    if (userData) {
      activeUsers.delete(userData.userId);
    }
    userSockets.delete(socketId);
  }

  sendActiveUsers() {
    const users = Array.from(userSockets.values()).map(user => ({
      id: user.userId,
      name: user.name,
      profilePicture: user.profilePicture,
      connectedAt: user.connectedAt
    }));

    this.io.emit('users:online', {
      count: users.length,
      users
    });
  }

  handleDisconnect(socket) {
    console.log(`🔌 User ${socket.user.name} disconnected: ${socket.id}`);
    this.removeActiveUser(socket.id);
    this.sendActiveUsers();
  }

  // Getter for IO instance
  getIO() {
    return this.io;
  }
}

export default SocketServer;
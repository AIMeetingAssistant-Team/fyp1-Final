import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import connectDB from "./config/database.js";

// Route imports
import authRoutes from "./routes/authRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import inviteRoutes from "./routes/inviteRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import zegoRoutes from './routes/zegoRoutes.js';
import livekitRoutes from './routes/livekitRoutes.js';
import recordingRoutes from './routes/recordingRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
// Socket.IO imports
import SocketServer from "./socket/socketServer.js";
// Meeting Service Import
import MeetingStatusService from "./services/meetingStatusService.js";
import MeetingReminderService from "./services/meetingReminderService.js";
import { startTaskReminderScheduler } from './utils/taskReminderScheduler.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// --- Security + Core Middleware ---
app.use(helmet());
app.use(cors());
// INCREASE BODY SIZE LIMITS FOR LARGE FILE UPLOADS
app.use(express.json({ limit: "2gb" }));
app.use(express.urlencoded({ extended: true, limit: "2gb" }));

// --- Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests
});
app.use(limiter);

// --- Routes ---
app.get("/", (req, res) => {
  res.json({
    message: "AI-Powered Meeting & Task Assistant API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/zego", zegoRoutes);
app.use("/api/livekit", livekitRoutes);
app.use('/api/recordings', recordingRoutes);
app.use("/api/ai", aiRoutes);
app.use('/api/analytics', analyticsRoutes);

// --- 404 Handler ---
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "production" ? {} : err.message,
  });
});

const PORT = process.env.PORT || 5000;

// CREATE HTTP SERVER FOR SOCKET.IO
const server = createServer(app);
// INCREASE SERVER TIMEOUT FOR LARGE FILE UPLOADS
server.timeout = 600000; // 10 minutes timeout (600,000 ms)
// Initialize Socket.IO
const socketServer = new SocketServer(server);

// Make io accessible to routes
app.set('io', socketServer.getIO());

// Start Meeting Status Service
MeetingStatusService.start();
console.log('✅ Meeting Status Service Started');
// Start Meeting Reminder Service
MeetingReminderService.start();
console.log('✅ Meeting Reminder Service Started');
// Start Task Reminder Scheduler
startTaskReminderScheduler();
// ✅ SINGLE SERVER LISTEN CALL
server.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`🎥 Video conferencing: ${process.env.ZEGOCLOUD_APP_ID ? '✅ Configured' : '❌ Not configured'}`);
});

export default app;
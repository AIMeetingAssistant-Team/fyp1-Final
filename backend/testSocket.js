import { io } from "socket.io-client";

// ----------------------
// CONFIG
// ----------------------
const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MGY3YTJhNzI3OWQ5YTU0YTg1NWJhYSIsImlhdCI6MTc2MjYyODA5OCwiZXhwIjoxNzY1MjIwMDk4fQ.QTcVEJ4uZuiV2UH7i_8uAQRJ-rJMIDM93dQ0p9d8JlY"; // Replace with token from /api/auth/login
const MEETING_ID = "690f95997a2c36f87274bcf3"; // Replace with meeting ID from /api/meetings

// ----------------------
// CONNECT TO SOCKET.IO
// ----------------------
const socket = io("http://localhost:5000", {
  auth: {
    token: JWT_TOKEN
  }
});

// ----------------------
// CONNECTION EVENTS
// ----------------------
socket.on("connect", () => {
  console.log("✅ Connected as socket ID:", socket.id);

  // Join a meeting
  socket.emit("meeting:join", { meetingId: MEETING_ID });

  // Send a chat message
  socket.emit("chat:send-message", {
    meetingId: MEETING_ID,
    message: "Hello from Node.js test script!",
    type: "text"
  });

  // Typing indicators
  socket.emit("chat:typing-start", { meetingId: MEETING_ID });
  setTimeout(() => {
    socket.emit("chat:typing-stop", { meetingId: MEETING_ID });
  }, 3000);

  // Raise hand
  socket.emit("meeting:raise-hand", { meetingId: MEETING_ID });
  setTimeout(() => {
    socket.emit("meeting:lower-hand", { meetingId: MEETING_ID });
  }, 5000);

  // Update meeting status (host only)
  socket.emit("meeting:status-update", {
    meetingId: MEETING_ID,
    status: "in-progress"
  });

  // Ping test
  socket.emit("ping");
});

socket.on("disconnect", () => {
  console.log("🔌 Disconnected from server");
});

// ----------------------
// LISTEN FOR EVENTS
// ----------------------
socket.on("pong", (data) => {
  console.log("🟢 Pong received:", data);
});

socket.on("chat:new-message", (msg) => {
  console.log("💬 New chat message:", msg);
});

socket.on("meeting:joined", (data) => {
  console.log("🎯 Joined meeting:", data);
});

socket.on("meeting:participants", (data) => {
  console.log("👥 Participants:", data);
});

socket.on("meeting:status-updated", (data) => {
  console.log("🔄 Meeting status updated:", data);
});

socket.on("meeting:hand-raised", (data) => {
  console.log("✋ Hand raised:", data);
});

socket.on("meeting:hand-lowered", (data) => {
  console.log("✋ Hand lowered:", data);
});

socket.on("error", (err) => {
  console.error("❌ Socket error:", err);
});

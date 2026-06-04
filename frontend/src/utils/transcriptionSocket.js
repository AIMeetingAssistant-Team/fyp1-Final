import { io } from 'socket.io-client';

let sharedSocket = null;
let refCount = 0;
let releaseTimer = null;
let joinedMeetingId = null;

function getSocketUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const base = import.meta.env.VITE_BASE_URL?.trim() || 'http://localhost:5000/api';
  return base.replace(/\/api\/?$/, '') || 'http://localhost:5000';
}

function joinMeeting(socket, meetingId) {
  if (!meetingId || joinedMeetingId === meetingId) return;
  joinedMeetingId = meetingId;
  socket.emit('join-room', { meetingId });
}

/**
 * Shared Socket.IO client for live transcription.
 * Deferred release avoids Strict Mode / HMR closing the socket mid-handshake.
 */
export function acquireTranscriptionSocket(meetingId) {
  const token = localStorage.getItem('token');
  if (!token || !meetingId) return null;

  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }

  refCount += 1;

  if (!sharedSocket) {
    sharedSocket = io(getSocketUrl(), {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    sharedSocket.on('connect', () => {
      if (joinedMeetingId) {
        sharedSocket.emit('join-room', { meetingId: joinedMeetingId });
      }
    });
  } else if (sharedSocket.disconnected) {
    sharedSocket.auth = { token };
    sharedSocket.connect();
  }

  if (sharedSocket.connected) {
    joinMeeting(sharedSocket, meetingId);
  } else {
    const onConnect = () => {
      joinMeeting(sharedSocket, meetingId);
      sharedSocket.off('connect', onConnect);
    };
    sharedSocket.on('connect', onConnect);
  }

  return sharedSocket;
}

export function releaseTranscriptionSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0) return;

  if (releaseTimer) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    if (refCount > 0) return;
    if (sharedSocket) {
      sharedSocket.removeAllListeners();
      sharedSocket.disconnect();
      sharedSocket = null;
    }
    joinedMeetingId = null;
    releaseTimer = null;
  }, 150);
}

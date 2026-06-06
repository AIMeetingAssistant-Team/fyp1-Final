# Frontend — AI Meeting Assistant

React + Vite single-page application for the FYP meeting management platform.

## Overview

The UI covers authentication, meeting scheduling, three recording/meeting workflows (upload, realtime audio, LiveKit video), tasks, documents, calendar, and the meeting AI panel.

**Full project setup** (backend, AI service, MongoDB, LiveKit): see the [root README](../README.md).

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview production build
npm run lint
```

## Environment

Create `frontend/.env`:

```env
VITE_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Key directories

```
src/
├── pages/              # Route pages (Meetings, VideoMeeting, UploadRecordings, …)
├── components/
│   ├── meetings/       # LiveKit room, control bar, recorder bridge, chat
│   ├── realtimeRecorder/
│   └── layout/
├── context/            # AuthContext, AIContext
└── utils/              # api.js, uploadMeetingRecording.js, meetingUser.js
```

## Notable routes

| Path | Component |
|------|-----------|
| `/video-meeting/:meetingId` | `VideoMeeting` → `LiveKitMeetingRoom` (no app layout) |
| `/upload-recordings` | `UploadRecordings` |
| `/realtime-recorder/:meetingId` | `RealtimeRecorder` |
| `/meetings/:id/ai` | `MeetingAIPanel` |

## Dependencies (high level)

- **livekit-client** / **@livekit/components-react** — WebRTC video meetings
- **react-router-dom** — routing
- **socket.io-client** — realtime features (e.g. realtime recorder)
- **lucide-react**, **framer-motion**, **recharts** — UI

## Development notes

- Video meetings run outside the main `Layout` (full-screen room).
- LiveKit recording uses `MeetingRoomRecorderBridge` to composite stage video and mixed audio before upload.
- API calls use `utils/api.js` with JWT from `localStorage`.

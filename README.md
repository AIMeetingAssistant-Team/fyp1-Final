# AI-Powered Meeting & Task Assistant

Final Year Project (FYP) — a full-stack web application for scheduling and running meetings, capturing recordings, and automatically generating transcripts, summaries, Minutes of Meeting (MoM), and action tasks using AI.

## Features

### Core meeting modules

| Module | Description |
|--------|-------------|
| **Upload recording** | Upload meeting audio/video files; AI transcribes and generates summary, MoM, and tasks. |
| **Realtime recording** | Create a meeting, record live audio in the browser, save to the database, then run the same AI pipeline. |
| **Video meeting** | Instant or scheduled meetings via **LiveKit** (camera, mic, screen share, in-room chat). Host can **Record meeting** — captures the visible room layout and mixed participant audio, uploads to Cloudinary, and triggers AI processing automatically. |

### Additional capabilities

- User authentication (signup, sign-in, email verification, password reset)
- Meeting scheduling, calendar, join-by-code, participants & invites
- Task management linked to meetings (including AI-extracted action items)
- Document attachments per meeting
- Dashboard, workspace, and meeting AI insights panel (transcription status, MoM, PDF export)

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **Frontend** | React 19, Vite, React Router, LiveKit React SDK, Tailwind CSS, Socket.IO client |
| **Backend** | Node.js, Express, MongoDB (Mongoose), JWT auth, Socket.IO, Cloudinary, LiveKit Server SDK |
| **AI service** | Python, FastAPI, Whisper (transcription), summarization & task extraction |

## Project structure

```
fyp1-Final/
├── frontend/          # React SPA (Vite)
├── backend/           # REST API + Socket.IO
├── ai-service/        # FastAPI microservice (port 8000)
├── LIVEKIT_SETUP.md   # LiveKit & environment details
└── README.md
```

## Prerequisites

- **Node.js** 18+
- **MongoDB** (local or Atlas)
- **Python** 3.10+ (for AI service)
- **FFmpeg** on PATH (required by transcription)
- **Cloudinary** account (recordings & file storage)
- **LiveKit** — [LiveKit Cloud](https://cloud.livekit.io) or local Docker server (for video meetings)

## Quick start

### 1. Clone and install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# AI service (Windows)
cd ../ai-service
install.bat
```

On Linux/macOS for the AI service:

```bash
cd ai-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Environment variables

**`backend/.env`**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/meeting_assistant
JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
# English + Urdu (default). Use en or ur only for single-language meetings.
DEFAULT_TRANSCRIPTION_LANGUAGE=en-ur

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# LiveKit (video meetings)
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_HTTP_URL=http://localhost:7880
```

**`frontend/.env`**

```env
VITE_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Start services

Run in separate terminals:

1. **MongoDB**
2. **AI service** — `cd ai-service && run.bat` (or `uvicorn` as above)
3. **Backend** — `cd backend && npm run dev`
4. **Frontend** — `cd frontend && npm run dev`
5. **LiveKit** (for video meetings) — see [LIVEKIT_SETUP.md](./LIVEKIT_SETUP.md)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| AI service | http://localhost:8000 |
| LiveKit (local dev) | ws://localhost:7880 |

## AI pipeline

After a recording is saved (upload, realtime, or LiveKit meeting recording), the backend can automatically:

1. **Transcribe** audio/video via the AI service (Whisper)
2. **Summarize** and generate **Minutes of Meeting**
3. **Extract action tasks** (optional per request)

Controlled by `autoProcessAI` on the meeting document (default: enabled). Manual re-run is available from the meeting AI panel.

**Live captions** (optional, during realtime recording or LiveKit meetings): click the **Captions** control for Google Meet–style on-screen text via Socket.IO. This is separate from the post-recording pipeline above; saving/uploading a recording still runs full transcription → MoM → tasks as before.

**Transcription accuracy** depends on the Whisper model, language setting, microphone quality, and audio in the saved file. For **English + Urdu** meetings, keep `DEFAULT_TRANSCRIPTION_LANGUAGE=en-ur` in `backend/.env` (auto-detects both; do not use `en` alone). In `ai-service`, set `WHISPER_MODEL=medium` (default) or `large-v3` (best for Urdu, needs more RAM/GPU). **FFmpeg** must be installed for WebM meeting recordings.

```
Recording → Cloudinary → POST /api/ai/meetings/:id/transcribe/:index → AI service
```

**`ai-service/.env` (optional)**

```env
WHISPER_MODEL=medium
```

## API overview

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Authentication |
| `/api/meetings` | Meetings, scheduling, participants |
| `/api/recordings` | Upload/download recordings |
| `/api/ai` | Transcription, MoM, insights, PDF |
| `/api/livekit` | Video room tokens, start/end, recording state |
| `/api/tasks` | Task CRUD |
| `/api/documents` | Meeting documents |
| `/api/invites` | Invitations |

## Frontend routes (main)

| Route | Page |
|-------|------|
| `/workspace` | Main workspace |
| `/meetings` | Meeting list |
| `/meetings/:id` | Meeting details |
| `/meetings/:id/ai` | AI panel (transcript, MoM, tasks) |
| `/upload-recordings` | Upload recording module |
| `/realtime-recording` | Realtime recorder |
| `/video-meeting/:meetingId` | LiveKit video room (full screen) |
| `/schedule` | Schedule meeting |
| `/calendar` | Calendar view |
| `/tasks` | Tasks |

## Video meeting recording

The host uses **Record** in the control bar. The browser composites participant video tiles (grid/speaker layout) and mixes participant audio, then uploads a WebM file to `/api/recordings/:meetingId/upload`. Supported MIME types include `video/webm` and `video/mp4`.

Requires a Chromium-based browser (Chrome, Edge) for `MediaRecorder` and canvas capture.

## Documentation

- [LIVEKIT_SETUP.md](./LIVEKIT_SETUP.md) — LiveKit server, env vars, and API reference
- [frontend/README.md](./frontend/README.md) — Frontend-specific setup

## License

Academic / FYP project — use and modify according to your institution’s guidelines.

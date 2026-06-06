# LiveKit + Real-Time Transcription Setup

This project uses **LiveKit** for video meetings and **Socket.IO + Whisper** for live transcription.

## Architecture

```
Browser (LiveKit React SDK)  <--WebRTC-->  LiveKit Server
Browser (Socket.IO)          <--chunks-->  Node Backend  -->  AI Service (Whisper)
Post-upload flow unchanged: Recording -> Cloudinary -> /api/ai/transcribe
```

## 1. LiveKit Server

### Option A: LiveKit Cloud

1. Create a project at https://cloud.livekit.io
2. Copy API Key, API Secret, and WebSocket URL

### Option B: Local Docker

```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: devsecret" \
  livekit/livekit-server --dev
```

Default dev credentials: `devkey` / `devsecret`, URL `ws://localhost:7880`

Enable **Egress** for cloud recording (LiveKit Cloud includes egress; self-hosted needs a separate egress service).

### Cloud recording (S3)

LiveKit egress uploads MP4 files to **S3-compatible storage**. Add to `backend/.env`:

```env
LIVEKIT_EGRESS_S3_BUCKET=your-bucket-name
LIVEKIT_EGRESS_S3_ACCESS_KEY=your-access-key
LIVEKIT_EGRESS_S3_SECRET=your-secret-key
LIVEKIT_EGRESS_S3_REGION=us-east-1
# Optional: MinIO, Cloudflare R2, etc.
# LIVEKIT_EGRESS_S3_ENDPOINT=https://...
# LIVEKIT_EGRESS_S3_FORCE_PATH_STYLE=true
```

You can use standard `AWS_*` variables instead (`AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, etc.) if you prefer.

## 2. Backend Environment (`backend/.env`)

```env
# LiveKit
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_HTTP_URL=http://localhost:7880
# For LiveKit Cloud, use HTTPS (not HTTP):
# LIVEKIT_HTTP_URL=https://your-project.livekit.cloud

# Real-time transcription tuning
LIVE_WHISPER_CHUNK_MS=3000

# Existing
AI_SERVICE_URL=http://localhost:8000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secret
MONGODB_URI=mongodb://localhost:27017/your_db
```

## 3. Frontend Environment (`frontend/.env`)

```env
VITE_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

**Important:** Do not use spaces around `=` in Vite env files.

## 4. AI Service

```bat
cd ai-service
install.bat
run.bat
```

Endpoints:
- `POST /api/v1/transcription/transcribe-file` — full file (upload pipeline)
- `POST /api/v1/transcription/transcribe-chunk` — real-time chunks
- `GET /api/v1/transcription/languages` — supported languages

Requires **FFmpeg** installed and on PATH.

## 5. Start All Services

1. MongoDB
2. `cd ai-service && run.bat`
3. `cd backend && npm run dev`
4. `cd frontend && npm run dev`
5. LiveKit server (Docker or Cloud)

## 6. API Routes (LiveKit)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/livekit/meetings/:id/token` | Join token |
| POST | `/api/livekit/meetings/:id/start` | Host starts meeting |
| POST | `/api/livekit/meetings/:id/end` | Host ends meeting |
| POST | `/api/livekit/meetings/:id/recording/start` | Start egress recording |
| POST | `/api/livekit/meetings/:id/recording/stop` | Stop egress recording |
| GET | `/api/livekit/meetings/:id/recording/status` | Recording status |

Legacy ZEGO routes remain at `/api/zego/*` for backward compatibility but are no longer used by the frontend.

## 7. Socket.IO Transcription Events

| Event | Direction |
|-------|-----------|
| `transcription:start` | Client → Server |
| `transcription:audio-chunk` | Client → Server |
| `transcription:stop` | Client → Server |
| `transcription:partial` | Server → Clients |
| `transcription:started` / `stopped` / `completed` | Server → Clients |

## 8. Supported Languages (auto-detect or manual)

English, Urdu, Hindi, Arabic, French, Spanish, Chinese, German, and more via Whisper auto-detection.

## 9. Production Notes

- Use HTTPS/WSS in production (`LIVEKIT_URL=wss://...`)
- Store LiveKit secrets only on the backend
- Scale AI service separately; consider `faster-whisper` or GPU for lower latency
- After egress completes, optionally copy S3 files to Cloudinary for the existing transcription pipeline

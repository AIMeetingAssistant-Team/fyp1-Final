from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="AI Meeting Assistant",
    description="Transcription, Summarization & Task Extraction",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from app.routers import transcription, health, summarization, tasks

# Include routers
app.include_router(transcription.router, prefix="/api/v1/transcription", tags=["Transcription"])
app.include_router(summarization.router, prefix="/api/v1/summarization", tags=["Summarization"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Task Extraction"])
app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])

@app.get("/")
def home():
    return {
        "message": "AI Meeting Assistant API",
        "version": "1.0.0",
        "endpoints": {
            "transcription": "/api/v1/transcription",
            "summarization": "/api/v1/summarization",
            "task_extraction": "/api/v1/tasks",
            "health": "/api/v1/health"
        }
    }

if __name__ == "__main__":
    print("🚀 AI Service starting on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
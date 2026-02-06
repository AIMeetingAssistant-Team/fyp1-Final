# 🔍 Debug: Fix FFmpeg path (use dynamic path finding)
import subprocess
import sys

def find_ffmpeg():
    """Find FFmpeg in common locations"""
    import platform
    system = platform.system()
    
    if system == "Windows":
        # Try common Windows locations
        paths = [
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            r"C:\tools\ffmpeg\bin\ffmpeg.exe"
        ]
        for path in paths:
            import os
            if os.path.exists(path):
                os.environ["PATH"] = os.path.dirname(path) + os.pathsep + os.environ.get("PATH", "")
                os.environ["FFMPEG_BINARY"] = path
                return path
    elif system == "Linux":
        # Try using which
        try:
            result = subprocess.run(["which", "ffmpeg"], capture_output=True, text=True)
            if result.returncode == 0:
                ffmpeg_path = result.stdout.strip()
                os.environ["FFMPEG_BINARY"] = ffmpeg_path
                return ffmpeg_path
        except:
            pass
    
    # Fallback to system PATH
    import shutil
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        os.environ["FFMPEG_BINARY"] = ffmpeg_path
        return ffmpeg_path
    
    print("⚠️ WARNING: FFmpeg not found. Please install FFmpeg:")
    print("  Windows: Download from https://ffmpeg.org/download.html")
    print("  Linux: sudo apt install ffmpeg")
    print("  macOS: brew install ffmpeg")
    return None

print("🔍 Looking for FFmpeg...")
ffmpeg_path = find_ffmpeg()
print(f"✅ FFmpeg found at: {ffmpeg_path or 'Not found'}")

import whisper
import torch
import tempfile
import os
import logging
from typing import Dict, Any, Optional
import numpy as np

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        self.model = None
        self.model_name = "base"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
    def load_model(self):
        if self.model is None:
            try:
                logger.info(f"Loading Whisper model: {self.model_name}")
                self.model = whisper.load_model(self.model_name, device=self.device)
                logger.info("Whisper model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                raise
    
    def transcribe_audio_file(self, audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        try:
            self.load_model()
            
            result = self.model.transcribe(
                audio_path,
                language=language,
                fp16=False if self.device == "cpu" else True,
                verbose=True
            )
            
            transcription = {
                "success": True,
                "text": result["text"].strip(),
                "segments": [
                    {
                        "id": seg["id"],
                        "start": seg["start"],
                        "end": seg["end"],
                        "text": seg["text"].strip()
                    }
                    for seg in result.get("segments", [])
                ],
                "language": result.get("language", "en"),
                "duration": result.get("duration", 0)
            }
            
            logger.info(f"Transcription completed: {len(transcription['text'])} characters")
            return transcription
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "segments": []
            }
    
    def transcribe_audio_bytes(self, audio_bytes: bytes, file_format: str = "mp3") -> Dict[str, Any]:
        try:
            with tempfile.NamedTemporaryFile(suffix=f".{file_format}", delete=False) as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_path = tmp_file.name
            
            result = self.transcribe_audio_file(tmp_path)
            os.unlink(tmp_path)
            return result
            
        except Exception as e:
            logger.error(f"Bytes transcription error: {e}")
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "segments": []
            }

# Singleton instance
transcription_service = TranscriptionService()
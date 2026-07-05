from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import tempfile
import os
from typing import Optional
import logging

from app.services.transcription_service import transcription_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/transcribe-file")
async def transcribe_audio_file(
    file: UploadFile = File(...),
    language: Optional[str] = None
):
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Save uploaded file
        with tempfile.NamedTemporaryFile(suffix=os.path.splitext(file.filename)[1], delete=False) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            result = transcription_service.transcribe_audio_file(tmp_path, language)
            
            if not result.get("success"):
                raise HTTPException(status_code=500, detail=result.get("error", "Transcription failed"))
            
            return JSONResponse(content=result)
            
        finally:
            os.unlink(tmp_path)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/transcribe-chunk")
async def transcribe_audio_chunk(
    file: UploadFile = File(...),
    language: Optional[str] = None,
    previous_text: Optional[str] = Form(None),
    detect_language: Optional[str] = "true",
):
    """Shorter live-caption chunks (same Whisper path as transcribe-file)."""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")

        with tempfile.NamedTemporaryFile(
            suffix=os.path.splitext(file.filename)[1] or ".wav",
            delete=False,
        ) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        try:
            result = transcription_service.transcribe_live_chunk(tmp_path, language, previous_text)
            if not result.get("success"):
                raise HTTPException(status_code=500, detail=result.get("error", "Transcription failed"))

            result["is_partial"] = True
            return JSONResponse(content=result)
        finally:
            os.unlink(tmp_path)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chunk transcription endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Chunk transcription failed: {str(e)}")
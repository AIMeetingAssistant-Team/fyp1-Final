from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import logging
from typing import Optional
from pydantic import BaseModel

from app.services.summarization_service import summarization_service

router = APIRouter()
logger = logging.getLogger(__name__)

class GenerateSummaryRequest(BaseModel):
    text: str
    meeting_type: str = "general"

@router.post("/generate-summary")
async def generate_summary(request: GenerateSummaryRequest):
    try:
        if not request.text or len(request.text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Text is too short")
        
        logger.info(f"Generating summary for {request.meeting_type} meeting")
        
        result = summarization_service.generate_summary(request.text, request.meeting_type)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Summarization failed"))
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")
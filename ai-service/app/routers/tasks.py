from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel

from app.services.task_extraction_service import task_extraction_service

router = APIRouter()
logger = logging.getLogger(__name__)

class ExtractTasksRequest(BaseModel):
    text: str
    context: Optional[Dict[str, Any]] = None
    options: Optional[Dict[str, Any]] = None

@router.post("/extract-from-text")
async def extract_tasks_from_text(request: ExtractTasksRequest):
    try:
        if not request.text or len(request.text.strip()) < 20:
            raise HTTPException(status_code=400, detail="Text is too short")
        
        logger.info(f"Extracting tasks from text")
        
        result = task_extraction_service.extract_tasks_from_text(request.text, request.context or {})
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Task extraction failed"))
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Task extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Task extraction failed: {str(e)}")
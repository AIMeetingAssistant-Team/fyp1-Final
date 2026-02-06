from fastapi import APIRouter
from fastapi.responses import JSONResponse
from datetime import datetime

router = APIRouter()

@router.get("/")
async def health_check():
    return JSONResponse(content={
        "status": "healthy",
        "service": "AI Meeting Assistant",
        "timestamp": datetime.now().isoformat()
    })
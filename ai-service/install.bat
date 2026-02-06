@echo off
echo ====================================
echo AI Service Installation
echo ====================================
echo.

REM Create virtual environment
python -m venv venv
call venv\Scripts\activate

REM Install all packages
pip install --upgrade pip
pip install fastapi uvicorn python-multipart python-dotenv
pip install openai-whisper torch --index-url https://download.pytorch.org/whl/cpu
pip install transformers numpy nltk requests

echo.
echo ✅ Installation complete!
echo 🚀 Run with: run.bat
pause
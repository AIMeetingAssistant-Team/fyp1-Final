@echo off
echo ====================================
echo AI Meeting Assistant
echo ====================================
echo.

REM Activate virtual environment
call venv\Scripts\activate

REM Run the service
python -m app.main
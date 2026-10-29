@echo off
echo ========================================================
echo  Starting Aarogya Drishti FastAPI Backend (Port 8000)
echo ========================================================
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause

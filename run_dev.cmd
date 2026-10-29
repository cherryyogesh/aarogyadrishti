@echo off
echo ========================================================
echo  Launching Aarogya Drishti Full Stack (Backend + Frontend)
echo ========================================================
start "Aarogya Drishti - Backend" cmd /c "%~dp0run_backend.cmd"
timeout /t 3 /nobreak >nul
start "Aarogya Drishti - Frontend" cmd /c "%~dp0run_frontend.cmd"
echo Services starting:
echo  Backend:  http://127.0.0.1:8000 (API Docs: http://127.0.0.1:8000/api/v1/docs)
echo  Frontend: http://127.0.0.1:5173
timeout /t 5

@echo off
REM ==============================================================================
REM Aarogya Mytra AI — Self-Hosted Google Health MedGemma Launcher (Windows)
REM Zero-API-Key Local Model Serving via vLLM or Ollama
REM GitHub: https://github.com/Google-Health/medgemma.git
REM ==============================================================================

echo ==============================================================================
echo [Aarogya Mytra AI] Self-Hosted MedGemma Launcher
echo Grounded in Google-Health/medgemma repository submodule (external/medgemma)
echo ==============================================================================
echo.

echo Choose your local inference engine:
echo   [1] vLLM Server (High-Performance GPU inference, port 8080)
echo   [2] Ollama Server (Lightweight CPU/GPU GGUF inference, port 11434)
echo   [3] Test & Probe Local MedGemma Endpoint
echo.
set /p choice="Enter choice [1-3] (Default 1): "
if "%choice%"=="" set choice=1

if "%choice%"=="1" goto run_vllm
if "%choice%"=="2" goto run_ollama
if "%choice%"=="3" goto run_probe

:run_vllm
echo.
echo Starting vLLM with Google MedGemma 1.5 4B on http://localhost:8080/v1 ...
echo To connect to Aarogya Mytra AI:
echo   1. In Chatbot, click on the status pill or model setup button.
echo   2. Select 'Custom vLLM' tab.
echo   3. Set URL to http://localhost:8080/v1 and click 'Connect vLLM Endpoint'.
echo.
vllm serve google/medgemma-1.5-4b-it --port 8080 --trust-remote-code --dtype bfloat16
goto end

:run_ollama
echo.
echo Starting Ollama with MedGemma on http://localhost:11434 ...
echo To connect to Aarogya Mytra AI:
echo   1. In Chatbot, click on the status pill or model setup button.
echo   2. Select 'Custom vLLM' tab.
echo   3. Set URL to http://localhost:11434/v1 and click 'Connect vLLM Endpoint'.
echo.
ollama run medgemma
goto end

:run_probe
echo.
echo Probing http://localhost:8080/v1 ...
curl -s http://localhost:8080/v1/models
echo.
echo Probing http://localhost:11434/api/version ...
curl -s http://localhost:11434/api/version
echo.
pause
goto end

:end


#!/bin/bash
# ==============================================================================
# Aarogya Mytra AI — Self-Hosted Google Health MedGemma Launcher (Linux/Mac/WSL)
# Zero-API-Key Local Model Serving via vLLM or Ollama
# GitHub: https://github.com/Google-Health/medgemma.git
# ==============================================================================

echo "=============================================================================="
echo "[Aarogya Mytra AI] Self-Hosted MedGemma Launcher"
echo "Grounded in Google-Health/medgemma repository submodule (external/medgemma)"
echo "=============================================================================="
echo ""
echo "Choose your local inference engine:"
echo "  [1] vLLM Server (High-Performance GPU inference, port 8080)"
echo "  [2] Ollama Server (Lightweight CPU/GPU GGUF inference, port 11434)"
echo "  [3] Test & Probe Local MedGemma Endpoint"
echo ""
read -p "Enter choice [1-3] (Default 1): " choice
choice=${choice:-1}

if [ "$choice" = "1" ]; then
    echo "Starting vLLM with Google MedGemma 1.5 4B on http://localhost:8080/v1 ..."
    echo "Endpoint URL for Aarogya Mytra AI: http://localhost:8080/v1"
    vllm serve google/medgemma-1.5-4b-it --port 8080 --trust-remote-code --dtype bfloat16
elif [ "$choice" = "2" ]; then
    echo "Starting Ollama with MedGemma on http://localhost:11434 ..."
    echo "Endpoint URL for Aarogya Mytra AI: http://localhost:11434/v1"
    ollama run medgemma
elif [ "$choice" = "3" ]; then
    echo "Probing http://localhost:8080/v1 ..."
    curl -s http://localhost:8080/v1/models || echo "Port 8080 not listening."
    echo ""
    echo "Probing http://localhost:11434/api/version ..."
    curl -s http://localhost:11434/api/version || echo "Port 11434 not listening."
fi

#!/bin/bash
set -e

# Start ollama service in background
echo "Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Wait for ollama to be ready
echo "Waiting for Ollama to start..."
timeout=60
while [ $timeout -gt 0 ]; do
    if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -le 0 ]; then
    echo "Timeout waiting for Ollama to start, but continuing anyway..."
    echo "You can manually check with: curl http://localhost:11434/api/version"
else
    echo "Ollama health check passed!"
fi

echo "Ollama started successfully!"

# Check if TinyLlama model is already available
if ollama list | grep -q "tinyllama"; then
    echo "TinyLlama model already available (loaded from build cache)"
else
    echo "Pulling TinyLlama model..."
    ollama pull tinyllama
fi

echo ""
echo "=== TinyLlama API Server Ready! ==="
echo "API available at: http://localhost:11434"
echo "OpenAI-compatible API at: http://localhost:11434/v1/"
echo "Web UI available at: http://localhost:11434 (in browser)"
echo "Model: tinyllama"
echo ""

# Keep the service running
wait $OLLAMA_PID
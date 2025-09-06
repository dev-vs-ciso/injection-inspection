# Multi-stage build with pre-loaded TinyLlama model
FROM ollama/ollama:latest

# Install curl if not already present (needed for health checks)
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Pre-load the TinyLlama model during build
RUN ollama serve & \
    OLLAMA_PID=$! && \
    echo "Waiting for Ollama to start during build..." && \
    timeout=60 && \
    while [ $timeout -gt 0 ]; do \
        if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then \
            break; \
        fi; \
        sleep 2; \
        timeout=$((timeout-2)); \
    done && \
    echo "Ollama started, pulling TinyLlama model..." && \
    ollama pull tinyllama && \
    echo "Model pulled successfully!" && \
    kill $OLLAMA_PID && \
    wait $OLLAMA_PID 2>/dev/null || true

# Expose Ollama port
EXPOSE 11434

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:11434/api/version || exit 1

# Set the entrypoint
ENTRYPOINT ["/start.sh"]
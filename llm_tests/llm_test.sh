#!/bin/bash
# Interactive Ollama Testing Script
# Usage: ./test_ollama.sh

OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
MODEL="${MODEL:-tinyllama}"
STREAM_MODE="${STREAM_MODE:-true}"
TEMPERATURE="${TEMPERATURE:-0.7}"
MAX_TOKENS="${MAX_TOKENS:-512}"

echo "=== Ollama Interactive Tester ==="
echo "Host: $OLLAMA_HOST"
echo "Model: $MODEL"
echo "Commands: 'quit' to exit, 'help' for options"
echo "==========================================="

# Check if server is running
echo "Checking server status..."
if ! curl -s "$OLLAMA_HOST/api/version" > /dev/null; then
    echo "Error: Cannot connect to Ollama server at $OLLAMA_HOST"
    echo "Make sure your server is running"
    echo "For Docker: docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama"
    exit 1
fi

echo "Server is running!"
echo "Current settings: Stream=$STREAM_MODE, Temperature=$TEMPERATURE, Max Tokens=$MAX_TOKENS"
echo

# Function to make API call
make_api_call() {
    local prompt="$1"
    local json_payload
    
    # Build JSON payload
    json_payload=$(jq -n \
        --arg model "$MODEL" \
        --arg prompt "$prompt" \
        --argjson stream "$([ "$STREAM_MODE" = "true" ] && echo true || echo false)" \
        --argjson temperature "$TEMPERATURE" \
        --argjson num_predict "$MAX_TOKENS" \
        '{
            model: $model,
            prompt: $prompt,
            stream: $stream,
            options: {
                temperature: $temperature,
                num_predict: $num_predict
            }
        }')
    
    echo "Sending request..."
    echo "Response:"
    echo "----------------------------------------"
    
    if [ "$STREAM_MODE" = "true" ]; then
        # Streaming mode - process each line as it comes
        curl -s -X POST "$OLLAMA_HOST/api/generate" \
            -H "Content-Type: application/json" \
            -d "$json_payload" | while IFS= read -r line; do
            if [ -n "$line" ]; then
                echo "$line" | jq -r '.response // empty' 2>/dev/null | tr -d '\n'
            fi
        done
        echo
    else
        # Non-streaming mode - wait for complete response
        response=$(curl -s -X POST "$OLLAMA_HOST/api/generate" \
            -H "Content-Type: application/json" \
            -d "$json_payload")
        
        if echo "$response" | jq -e . >/dev/null 2>&1; then
            echo "$response" | jq -r '.response // "No response received"'
        else
            echo "Error: Invalid response from server"
            echo "$response"
        fi
    fi
    
    echo
    echo "----------------------------------------"
}

# Function to validate numeric input
is_valid_number() {
    [[ $1 =~ ^[0-9]+\.?[0-9]*$ ]] && (( $(echo "$1 >= 0" | bc -l) ))
}

# Main interaction loop
while true; do
    # Get user input
    echo -n "Enter your prompt (or 'quit' to exit): "
    read -r prompt
    
    # Handle special commands
    case "$prompt" in
        "quit"|"exit"|"q")
            echo "Goodbye!"
            exit 0
            ;;
        "help"|"h")
            echo
            echo "Available commands:"
            echo "  quit, exit, q       - Exit the script"
            echo "  help, h             - Show this help"
            echo "  models              - List available models"
            echo "  stream              - Toggle streaming mode (currently: $STREAM_MODE)"
            echo "  temp <value>        - Set temperature (0.1-2.0, currently: $TEMPERATURE)"
            echo "  tokens <number>     - Set max tokens (currently: $MAX_TOKENS)"
            echo "  status              - Show current settings"
            echo "  test                - Send a test prompt"
            echo
            echo "Environment variables:"
            echo "  OLLAMA_HOST - Server URL (default: http://localhost:11434)"
            echo "  MODEL       - Model name (default: tinyllama)"
            echo
            continue
            ;;
        "models")
            echo "Available models:"
            if command -v jq >/dev/null 2>&1; then
                curl -s "$OLLAMA_HOST/api/tags" | jq -r '.models[]?.name // "No models found"' 2>/dev/null
            else
                curl -s "$OLLAMA_HOST/api/tags"
            fi
            echo
            continue
            ;;
        "stream")
            if [ "$STREAM_MODE" = "true" ]; then
                STREAM_MODE="false"
                echo "Streaming disabled"
            else
                STREAM_MODE="true"
                echo "Streaming enabled"
            fi
            echo
            continue
            ;;
        temp*)
            TEMP_VALUE=$(echo "$prompt" | awk '{print $2}')
            if is_valid_number "$TEMP_VALUE" && (( $(echo "$TEMP_VALUE <= 2.0" | bc -l) )); then
                TEMPERATURE="$TEMP_VALUE"
                echo "Temperature set to: $TEMPERATURE"
            else
                echo "Error: Please provide a valid temperature between 0.1 and 2.0"
                echo "Usage: temp 0.8"
            fi
            echo
            continue
            ;;
        tokens*)
            TOKEN_VALUE=$(echo "$prompt" | awk '{print $2}')
            if [[ "$TOKEN_VALUE" =~ ^[0-9]+$ ]] && [ "$TOKEN_VALUE" -gt 0 ]; then
                MAX_TOKENS="$TOKEN_VALUE"
                echo "Max tokens set to: $MAX_TOKENS"
            else
                echo "Error: Please provide a valid positive number"
                echo "Usage: tokens 1024"
            fi
            echo
            continue
            ;;
        "status")
            echo "Current settings:"
            echo "  Host: $OLLAMA_HOST"
            echo "  Model: $MODEL"
            echo "  Streaming: $STREAM_MODE"
            echo "  Temperature: $TEMPERATURE"
            echo "  Max Tokens: $MAX_TOKENS"
            echo
            continue
            ;;
        "test")
            prompt="Hello, how are you today?"
            echo "Sending test prompt: $prompt"
            make_api_call "$prompt"
            continue
            ;;
        "")
            echo "Please enter a prompt or command."
            echo
            continue
            ;;
        *)
            # Regular prompt - send to API
            make_api_call "$prompt"
            ;;
    esac
done
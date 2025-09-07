#!/bin/bash

echo "🔍 Banking Security Training - Attack Monitoring Dashboard"
echo "=========================================================="

# Function to check stolen data
check_stolen_data() {
    echo "📊 Stolen Data Summary:"
    docker exec evilcorp-server sh -c "
        echo '  HTTP captures: \$(ls -1 /app/stolen_data/http_*.txt 2>/dev/null | wc -l)'
        echo '  Netcat captures: \$(ls -1 /app/stolen_data/netcat_*.txt 2>/dev/null | wc -l)'
        echo '  Total files: \$(ls -1 /app/stolen_data/*.txt 2>/dev/null | wc -l)'
        echo '  Latest file: \$(ls -t /app/stolen_data/*.txt 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo \"None\")'
    "
}

# Function to show recent activity
show_recent_activity() {
    echo "🕐 Recent Activity (last 5 minutes):"
    docker exec evilcorp-server find /app/stolen_data/ -name "*.txt" -mmin -5 -exec echo "  📄 {}" \; 2>/dev/null | head -5
}

# Function to show active connections
show_connections() {
    echo "🌐 Active Connections:"
    docker exec evilcorp-server netstat -an | grep -E "(5555|8888)" | sed 's/^/  /'
}

# Main monitoring loop
while true; do
    clear
    echo "🔍 Banking Security Training - Attack Monitoring Dashboard"
    echo "=========================================================="
    echo "📅 $(date)"
    echo ""
    
    check_stolen_data
    echo ""
    
    show_recent_activity
    echo ""
    
    show_connections
    echo ""
    
    echo "🔄 Refreshing in 10 seconds... (Ctrl+C to stop)"
    sleep 10
done
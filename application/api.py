from models import get_database_stats


def api_stats():
    """
    API endpoint for bank statistics
    Returns JSON data for potential AJAX requests
    """
    from flask import jsonify
    
    try:
        stats = get_database_stats()
    except Exception as e:
        print(f"Database not ready: {e}")
        stats = {
            "total_users": 0,
            "total_transactions": 0,
            "total_volume": 0,
            "monthly_volume": 0
        }
    # Convert Decimal to float for JSON serialization
    stats['total_volume'] = float(stats['total_volume'])
    stats['monthly_volume'] = float(stats['monthly_volume'])
    
    return jsonify(stats)
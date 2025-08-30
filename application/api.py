from models import get_database_stats


def api_stats():
    """
    API endpoint for bank statistics
    Returns JSON data for potential AJAX requests
    """
    from flask import jsonify
    
    stats = get_database_stats()
    # Convert Decimal to float for JSON serialization
    stats['total_volume'] = float(stats['total_volume'])
    stats['monthly_volume'] = float(stats['monthly_volume'])
    
    return jsonify(stats)
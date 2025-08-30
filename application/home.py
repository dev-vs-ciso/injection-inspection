from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, current_user
from datetime import datetime, timedelta
from sqlalchemy import or_, and_
from models import db, User, Transaction, get_database_stats
from decorators import login_required, anonymous_required, active_user_required


def index():
    """
    Home page with bank statistics and login form
    Shows basic stats pulled from database
    """
    # Get database statistics for display
    stats = get_database_stats()
    
    return render_template('index.html', stats=stats)


@active_user_required
def dashboard():
    """
    User dashboard showing account overview and recent transactions
    Displays user's account information and transaction history
    """
    # Get pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    # Get user's transactions with pagination
    transactions = Transaction.query.filter_by(user_id=current_user.id)\
                                  .order_by(Transaction.date.desc())\
                                  .paginate(
                                      page=page,
                                      per_page=per_page,
                                      error_out=False
                                  )
    
    # Calculate account summary
    total_credits = db.session.query(db.func.sum(Transaction.amount))\
                             .filter_by(user_id=current_user.id, transaction_type='credit')\
                             .scalar() or 0
    
    total_debits = db.session.query(db.func.sum(Transaction.amount))\
                            .filter_by(user_id=current_user.id, transaction_type='debit')\
                            .scalar() or 0
    
    # Get recent activity (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_activity_count = Transaction.query.filter_by(user_id=current_user.id)\
                                           .filter(Transaction.date >= thirty_days_ago)\
                                           .count()
    
    summary = {
        'total_credits': total_credits,
        'total_debits': total_debits,
        'recent_activity_count': recent_activity_count
    }
    
    return render_template('dashboard.html', 
                         transactions=transactions, 
                         summary=summary)


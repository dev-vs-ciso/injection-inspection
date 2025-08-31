"""
URL routes and view functions for the Banking Application
Handles all user interactions and page rendering
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, current_user
from datetime import datetime, timedelta
from models import db, User, Transaction
from decorators import login_required, anonymous_required, active_user_required


@anonymous_required
def login():
    """
    User login page and authentication handler
    GET: Show login form
    POST: Process login attempt
    """
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        remember_me = bool(request.form.get('remember_me'))
        
        # Basic validation
        if not email or not password:
            flash('Please provide both email and password.', 'error')
            return render_template('login.html')
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        # Validate credentials
        if user and user.check_password(password):
            if not user.is_active:
                flash('Your account has been deactivated. Please contact support.', 'error')
                return render_template('login.html')
            
            # Login successful
            login_user(user, remember=remember_me)
            
            # Redirect to intended page or dashboard
            next_url = session.pop('next_url', None)
            return redirect(next_url or url_for('dashboard'))
        else:
            flash('Invalid email or password.', 'error')
    
    return render_template('login.html')


@login_required
def logout():
    """
    User logout handler
    Clears session and redirects to home page
    """
    logout_user()
    return redirect(url_for('index'))


@active_user_required
def profile():
    """
    User profile page showing account information
    Displays user details and account settings
    """
    # Get user's transaction statistics
    transaction_count = Transaction.query.filter_by(user_id=current_user.id).count()
    
    first_transaction = Transaction.query.filter_by(user_id=current_user.id)\
                                        .order_by(Transaction.date.asc())\
                                        .first()
    
    last_transaction = Transaction.query.filter_by(user_id=current_user.id)\
                                       .order_by(Transaction.date.desc())\
                                       .first()
    
    profile_stats = {
        'transaction_count': transaction_count,
        'first_transaction_date': first_transaction.date if first_transaction else None,
        'last_transaction_date': last_transaction.date if last_transaction else None,
        'account_age': (datetime.utcnow() - current_user.created_at).days
    }
    
    return render_template('profile.html', profile_stats=profile_stats)
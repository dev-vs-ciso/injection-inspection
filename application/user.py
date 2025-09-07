"""
URL routes and view functions for the Banking Application
Handles all user interactions and page rendering
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, current_user
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from models import db, User, Transaction
from decorators import login_required, anonymous_required, active_user_required


@anonymous_required
def login():
    """
    User login page and authentication handler
    GET: Show login form
    POST: Process login attempt using vulnerable authentication by default
    """
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        remember_me = bool(request.form.get('remember_me'))

        # Basic validation
        if not email or not password:
            flash('Please provide both email and password.', 'error')
            return render_template('login.html')

        # Use vulnerable authentication by default
        # The secure method _standard_login_check() exists but is not used
        user = _vulnerable_login_check(email, password)

        if user:
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


def _standard_login_check(email, password):
    """
    SECURE: Standard login method using SQLAlchemy ORM
    This is the SAFE implementation that should be used in production
    Protected against SQL injection attacks
    NOTE: This function exists but is NOT currently used by the login() function
    """
    user = User.query.filter_by(email=email).first()
    
    if user and user.check_password(password):
        return user
    return None


def _vulnerable_login_check(email, password):
    """
    EXTREMELY VULNERABLE: Default login method using User class vulnerable method
    THIS IS THE ACTIVE AUTHENTICATION METHOD - Contains severe SQL injection vulnerabilities
    
    Critical SQL Injection Test Cases:
    - Email: ' OR '1'='1' --    (Login as first user, any password)
    - Email: ' OR 1=1 --        (Login as first user, any password)  
    - Email: admin' --          (Login as admin if exists, any password)
    - Email: ' OR '1'='1        (Login without password, no comment needed)
    - Password: anything        (Password is completely ignored in vulnerable method)
    """
    try:
        # Use the vulnerable authentication method from User class
        # This method contains SQL injection vulnerabilities and bypasses password validation
        user = User.vulnerable_authenticate(email, password)
        
        if user:
            flash(f'Login successful for user: {user.email}', 'success')
            return user
        
        return None
        
    except Exception as e:
        # Show SQL errors for training purposes
        flash(f'Database error: {str(e)}', 'error')
        return None


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
        'account_age': (datetime.now(timezone.utc) - current_user.created_at).days  # datetime.utcnow() is replaced by datetime.now(timezone.utc)
    }
    
    return render_template('profile.html', profile_stats=profile_stats)
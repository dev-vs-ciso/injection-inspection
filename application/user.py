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
    POST: Process login attempt with both safe and vulnerable authentication methods
    """
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        remember_me = bool(request.form.get('remember_me'))
        login_mode = request.form.get('login_mode', 'standard')

        # Basic validation
        if not email or not password:
            flash('Please provide both email and password.', 'error')
            return render_template('login.html')

        # Choose authentication method based on login mode
        if login_mode == 'advanced':
            # VULNERABLE: Advanced login using raw SQL (contains SQL injection vulnerability)
            user = _advanced_login_check(email, password)
        else:
            # SAFE: Standard login using ORM
            user = _standard_login_check(email, password)

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
    SAFE: Standard login method using SQLAlchemy ORM
    Protected against SQL injection attacks
    """
    user = User.query.filter_by(email=email).first()
    
    if user and user.check_password(password):
        return user
    return None


def _advanced_login_check(email, password):
    """
    EXTREMELY VULNERABLE: Advanced login method using raw SQL queries
    Contains multiple severe SQL injection vulnerabilities for training purposes
    
    Critical SQL Injection Test Cases:
    - Email: ' OR '1'='1' --    (Login as first user, any password)
    - Email: ' OR 1=1 --        (Login as first user, any password)  
    - Email: admin' --          (Login as admin if exists, any password)
    - Email: ' OR '1'='1        (Login without password, no comment needed)
    - Password: anything        (Password is completely ignored in vulnerable query)
    """
    try:
        # VULNERABILITY 1: Direct string interpolation in BOTH email AND password
        # VULNERABILITY 2: Password check is BYPASSED by including it in the SQL query
        # VULNERABILITY 3: No proper escaping or sanitization
        
        # This is EXTREMELY vulnerable - both email and password are directly interpolated
        # and the query structure allows complete authentication bypass
        extremely_vulnerable_query = f"""
            SELECT id, email, password_hash, first_name, last_name, 
                   account_number, balance, created_at, is_active 
            FROM users 
            WHERE (email = '{email}' AND password_hash = '{password}') 
            OR (email = '{email}')
            AND is_active = true
            LIMIT 1
        """
        
        # Execute the extremely vulnerable query
        result = db.session.execute(text(extremely_vulnerable_query)).fetchone()
        
        if result:
            # Create a User object from the raw result
            user = User()
            user.id = result[0]
            user.email = result[1] 
            user.password_hash = result[2]
            user.first_name = result[3]
            user.last_name = result[4]
            user.account_number = result[5]
            user.balance = result[6]
            user.created_at = result[7]
            user.is_active = result[8]
            
            # VULNERABILITY 4: Password validation is completely bypassed!
            # In the original secure version, we would call user.check_password(password)
            # But now we skip this entirely, making authentication completely broken
            flash(f'Advanced login successful for user: {user.email}', 'success')
            return user
        
        return None
        
    except Exception as e:
        # VULNERABILITY 5: Exposing detailed SQL errors helps attackers
        # This reveals database structure and query details
        flash(f'SQL Error (helpful for attackers): {str(e)}', 'error')
        
        # VULNERABILITY 6: Fallback that's also vulnerable
        # If the main query fails, try an even simpler vulnerable query
        try:
            fallback_query = f"SELECT * FROM users WHERE email LIKE '%{email}%' LIMIT 1"
            result = db.session.execute(text(fallback_query)).fetchone()
            if result:
                user = User()
                user.id = result[0]
                user.email = result[1]
                user.password_hash = result[2] 
                user.first_name = result[3]
                user.last_name = result[4]
                user.account_number = result[5]
                user.balance = result[6]
                user.created_at = result[7]
                user.is_active = result[8]
                flash(f'Fallback login successful (even worse!): {user.email}', 'warning')
                return user
        except:
            pass
            
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
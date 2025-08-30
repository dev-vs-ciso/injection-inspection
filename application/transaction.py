from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, current_user
from datetime import datetime, timedelta
from sqlalchemy import or_, and_
from models import db, User, Transaction, get_database_stats
from decorators import login_required, anonymous_required, active_user_required


@active_user_required
def transaction_detail(transaction_id):
    """
    Detailed view of a specific transaction
    Shows all transaction information and related data
    """
    # Get transaction and verify it belongs to current user
    transaction = Transaction.query.filter_by(
        id=transaction_id,
        user_id=current_user.id
    ).first()
    
    if not transaction:
        flash('Transaction not found or you do not have permission to view it.', 'error')
        return redirect(url_for('dashboard'))
    
    # Get related transactions (same company, recent)
    related_transactions = Transaction.query.filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.company == transaction.company,
            Transaction.id != transaction.id
        )
    ).order_by(Transaction.date.desc()).limit(5).all()
    
    return render_template('transaction.html', 
                            transaction=transaction, 
                            related_transactions=related_transactions)


@active_user_required
def search():
    """
    Transaction search functionality
    Search by company name or date period
    """
    transactions = []
    search_performed = False
    
    if request.method == 'POST':
        search_performed = True
        company = request.form.get('company', '').strip()
        date_from = request.form.get('date_from', '').strip()
        date_to = request.form.get('date_to', '').strip()
        
        # Build query
        query = Transaction.query.filter_by(user_id=current_user.id)
        
        # Add company filter if provided
        if company:
            query = query.filter(Transaction.company.ilike(f'%{company}%'))
        
        # Add date filters if provided
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(Transaction.date >= date_from_obj)
            except ValueError:
                flash('Invalid start date format.', 'error')
        
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
                # Add one day to include the end date
                date_to_obj = date_to_obj + timedelta(days=1)
                query = query.filter(Transaction.date < date_to_obj)
            except ValueError:
                flash('Invalid end date format.', 'error')
        
        # Get results
        transactions = query.order_by(Transaction.date.desc()).limit(100).all()
        
        if not transactions and search_performed:
            flash('No transactions found matching your search criteria.', 'info')
        elif transactions:
            flash(f'Found {len(transactions)} transaction(s).', 'success')
    
    return render_template('search.html', 
                         transactions=transactions, 
                         search_performed=search_performed)
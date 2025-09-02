from flask import Blueprint, render_template, request, redirect, url_for, flash, send_file
from flask_login import login_user, logout_user, current_user
from datetime import datetime, timedelta
from sqlalchemy import or_, and_, text
from models import db, User, Transaction
from decorators import login_required, anonymous_required, active_user_required
import subprocess


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
    Transaction search functionality with both Basic and Advanced search modes
    Basic search uses safe ORM queries
    Advanced search uses raw SQL for "better performance" (contains SQL injection vulnerabilities)
    """
    transactions = []
    search_performed = False
    search_mode = request.form.get('search_mode', 'basic') if request.method == 'POST' else 'basic'
    
    if request.method == 'POST':
        search_performed = True
        
        if search_mode == 'basic':
            # SAFE: Basic search using ORM (existing functionality)
            transactions = _basic_search()
        else:
            # VULNERABLE: Advanced search using raw SQL
            transactions = _advanced_search()
    
    return render_template('search.html', 
                         transactions=transactions, 
                         search_performed=search_performed,
                         search_mode=search_mode)


def _basic_search():
    """
    Safe basic search using SQLAlchemy ORM (original implementation)
    """
    company = request.form.get('company', '').strip()
    date_from = request.form.get('date_from', '').strip()
    date_to = request.form.get('date_to', '').strip()
    
    # Build query safely using ORM
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
            return []
    
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
            date_to_obj = date_to_obj + timedelta(days=1)
            query = query.filter(Transaction.date < date_to_obj)
        except ValueError:
            flash('Invalid end date format.', 'error')
            return []
    
    # Get results
    transactions = query.order_by(Transaction.date.desc()).limit(100).all()
    
    if not transactions:
        flash('No transactions found matching your search criteria.', 'info')
    else:
        flash(f'Found {len(transactions)} transaction(s).', 'success')
    
    return transactions


def _advanced_search():
    """
    VULNERABLE: Advanced search using raw SQL for "better performance and flexibility"
    Contains multiple SQL injection vulnerabilities for training purposes
    """
    # Get advanced search parameters
    company = request.form.get('adv_company', '').strip()
    amount_min = request.form.get('amount_min', '').strip()
    amount_max = request.form.get('amount_max', '').strip()
    transaction_type = request.form.get('transaction_type', '').strip()
    category = request.form.get('category', '').strip()
    date_from = request.form.get('adv_date_from', '').strip()
    date_to = request.form.get('adv_date_to', '').strip()
    sort_by = request.form.get('sort_by', 'date').strip()
    sort_order = request.form.get('sort_order', 'DESC').strip()
    
    # VULNERABILITY 1: Dynamic WHERE clause building with string concatenation
    base_query = f"""
        SELECT t.*, u.first_name, u.last_name 
        FROM transactions t 
        JOIN users u ON t.user_id = u.id 
        WHERE t.user_id = {current_user.id}
    """
    
    where_conditions = []
    
    # VULNERABILITY 2: Unsafe company name filtering
    if company:
        # This allows SQL injection via company name parameter
        where_conditions.append(f"t.company LIKE '%{company}%'")
    
    # VULNERABILITY 3: Unsafe amount range filtering
    if amount_min:
        # Direct injection of user input into SQL
        where_conditions.append(f"t.amount >= {amount_min}")
    
    if amount_max:
        # Another injection point
        where_conditions.append(f"t.amount <= {amount_max}")
    
    # VULNERABILITY 4: Unsafe transaction type filtering
    if transaction_type and transaction_type.lower() != 'all':
        # Using user input directly in SQL
        where_conditions.append(f"t.transaction_type = '{transaction_type}'")
    
    # VULNERABILITY 5: Category filtering injection
    if category:
        # Another string concatenation vulnerability
        where_conditions.append(f"t.category LIKE '%{category}%'")
    
    # VULNERABILITY 6: Date filtering vulnerabilities
    if date_from:
        # Date injection - users could inject SQL instead of dates
        where_conditions.append(f"t.date >= '{date_from}'")
    
    if date_to:
        # Another date injection point
        where_conditions.append(f"t.date <= '{date_to} 23:59:59'")
    
    # Build the complete WHERE clause
    if where_conditions:
        base_query += " AND " + " AND ".join(where_conditions)
    
    # VULNERABILITY 7: Unsafe ORDER BY clause
    # This allows injection via sort parameters
    base_query += f" ORDER BY t.{sort_by} {sort_order}"
    
    # VULNERABILITY 8: Unsafe LIMIT clause (bonus injection point)
    limit = request.form.get('limit', '100').strip()
    base_query += f" LIMIT {limit}"
    
    # Add some logging for "debugging" purposes (reveals the vulnerable query)
    print(f"DEBUG: Executing advanced search query: {base_query}")
    
    try:
        # Execute the vulnerable raw SQL query
        result = db.session.execute(text(base_query))
        
        # Convert results back to Transaction objects
        transactions = []
        for row in result:
            # Find the actual transaction object
            transaction = db.session.get(row[0])  # Assuming first column is ID
            if transaction:
                transactions.append(transaction)
        
        if not transactions:
            flash('No transactions found matching your advanced search criteria.', 'info')
        else:
            flash(f'Advanced search found {len(transactions)} transaction(s).', 'success')
        
        return transactions
        
    except Exception as e:
        # VULNERABILITY 9: Error message that reveals database structure
        error_msg = str(e)
        flash(f'Advanced search failed: {error_msg}', 'error')
        print(f"Advanced search error: {e}")
        return []



def transaction_analytics():
    """
    VULNERABLE: New analytics feature with multiple SQL injection points
    Could be added as a new route for "power users"
    """
    # Get analytics parameters
    metric = request.args.get('metric', 'monthly_spending').strip()
    group_by = request.args.get('group_by', 'company').strip()
    time_period = request.args.get('time_period', '6').strip()  # months
    
    # VULNERABILITY 11: Dynamic analytics query building
    analytics_query = f"""
        SELECT 
            {group_by},
            COUNT(*) as transaction_count,
            SUM(amount) as total_amount,
            AVG(amount) as avg_amount
        FROM transactions 
        WHERE user_id = {current_user.id}
        AND date >= DATE('now', '-{time_period} months')
        GROUP BY {group_by}
        ORDER BY total_amount DESC
    """
    
    # VULNERABILITY 12: Optional custom WHERE clause
    custom_filter = request.args.get('custom_filter', '').strip()
    if custom_filter:
        analytics_query += f" HAVING {custom_filter}"
    
    try:
        result = db.session.execute(text(analytics_query))
        return [dict(row) for row in result]
    except Exception as e:
        flash(f'Analytics query failed: {error}', 'error')
        return []


# Additional vulnerable helper functions that could be used in various places

def get_transaction_by_reference(reference_number):
    """
    VULNERABILITY 13: Unsafe transaction lookup by reference number
    """
    # Direct string interpolation in SQL query
    query = f"""
        SELECT * FROM transactions 
        WHERE user_id = {current_user.id} 
        AND reference_number = '{reference_number}'
    """
    
    try:
        result = db.session.execute(text(query))
        row = result.fetchone()
        if row:
            return db.session.get(row[0])
        return None
    except Exception as e:
        print(f"Reference lookup error: {e}")
        return None


@active_user_required  
def export_transactions():
    """
    VULNERABLE: Export transactions with customizable filename and format
    Contains command injection via filename and format parameters
    """
    if request.method == 'POST':
        export_format = request.form.get('format', 'csv').strip()
        filename = request.form.get('filename', 'transactions').strip()
        date_range = request.form.get('date_range', '30').strip()
        
        # Get user's transactions
        days = int(date_range) if date_range.isdigit() else 30
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        transactions = Transaction.query.filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= cutoff_date
        ).order_by(Transaction.date.desc()).all()

        # VULNERABILITY: User input directly passed to shell command
        export_path = f"/tmp/exports/{filename}.{export_format}"
        
        try:
            # Create directory and file with command injection vulnerability
            command = f"mkdir -p /tmp/exports && touch {export_path}"
            
            
            # Execute the vulnerable command
            print(f"DEBUG: Executing command: {command}")
            subprocess.run(command, shell=True, capture_output=True, text=True)
            
            # Generate actual CSV content
            with open(export_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['Date', 'Company', 'Type', 'Amount', 'Balance', 'Reference'])
                
                for txn in transactions:
                    writer.writerow([
                        txn.date.strftime('%Y-%m-%d %H:%M:%S'),
                        txn.company,
                        txn.transaction_type,
                        txn.amount,
                        txn.balance_after,
                        txn.reference_number
                    ])
            
            # Send file back to user
            return send_file(
                export_path,
                as_attachment=True,
                download_name=f"{filename}.{export_format}",
                mimetype='text/csv'
            )
            
        except Exception as e:
            flash(f'Export error: {str(e)}', 'error')
    
    return render_template('export.html')
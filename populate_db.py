#!/usr/bin/env python3
"""
Database Population Tool for Banking Security Training Application
Populates the database with sample users and transactions for testing purposes
"""
import sys
import random
import time
from datetime import datetime, timedelta
from decimal import Decimal
from faker import Faker
from app import create_app
from models import db, User, Transaction

# Initialize Faker for generating realistic sample data
fake = Faker()

# Global set to track used reference numbers during population
used_reference_numbers = set()

# Sample companies for transaction generation
SAMPLE_COMPANIES = [
    'Amazon.com', 'Walmart', 'Target', 'Starbucks', 'McDonald\'s', 'Shell Gas Station',
    'AT&T', 'Verizon', 'Comcast', 'Netflix', 'Spotify', 'Apple', 'Google Pay',
    'PayPal', 'Uber', 'Lyft', 'DoorDash', 'Grubhub', 'Best Buy', 'Home Depot',
    'Lowe\'s', 'CVS Pharmacy', 'Walgreens', 'Kroger', 'Safeway', 'Whole Foods',
    'Costco', 'Sam\'s Club', 'Macy\'s', 'Nordstrom', 'Gap', 'Nike', 'Adidas',
    'REI', 'Dick\'s Sporting Goods', 'PetSmart', 'Petco', 'GameStop', 'Barnes & Noble',
    'Subway', 'Chipotle', 'Panera Bread', 'Domino\'s Pizza', 'Pizza Hut', 'KFC',
    'Taco Bell', 'Burger King', 'Wendy\'s', 'Chick-fil-A', 'In-N-Out Burger',
    'Office Depot', 'Staples', 'FedEx', 'UPS Store', 'USPS', 'H&M', 'Forever 21',
    'Victoria\'s Secret', 'Bath & Body Works', 'Bed Bath & Beyond', 'Williams Sonoma'
]

TRANSACTION_CATEGORIES = [
    'Food & Dining', 'Gas & Fuel', 'Shopping', 'Entertainment', 'Bills & Utilities',
    'Healthcare', 'Travel', 'Groceries', 'Technology', 'Education', 'Fitness',
    'Clothing', 'Home & Garden', 'Automotive', 'Insurance', 'Banking'
]

def check_existing_data():
    """
    Check if database already contains user data
    Returns True if data exists, False if empty
    """
    user_count = User.query.count()
    transaction_count = Transaction.query.count()
    
    print(f"Current database status:")
    print(f"  Users: {user_count}")
    print(f"  Transactions: {transaction_count}")
    
    return user_count > 0 or transaction_count > 0


def generate_account_number():
    """Generate a realistic bank account number"""
    # Format: 12-digit account number
    return f"{random.randint(100000000000, 999999999999)}"


# Global set to track used reference numbers during population
used_reference_numbers = set()

def generate_reference_number():
    """Generate a unique transaction reference number"""
    global used_reference_numbers
    
    max_attempts = 100
    for attempt in range(max_attempts):
        # Add tiny delay to ensure timestamp uniqueness
        if attempt > 0:
            time.sleep(0.001)  # 1ms delay
            
        # Format: TXN + timestamp with microseconds + random digits
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")  # Include microseconds
        random_suffix = f"{random.randint(10000, 99999)}"  # 5-digit random number
        reference = f"TXN{timestamp}{random_suffix}"
        
        if reference not in used_reference_numbers:
            used_reference_numbers.add(reference)
            return reference
    
    # Fallback: use UUID if we can't generate unique reference after max attempts
    import uuid
    reference = f"TXN{uuid.uuid4().hex[:16].upper()}"
    used_reference_numbers.add(reference)
    return reference


def create_users(count=35):
    """
    Create sample user accounts with realistic data
    Returns list of created users
    """
    users = []
    used_emails = set()
    used_account_numbers = set()
    
    print(f"Creating {count} user accounts...")
    
    for i in range(count):
        # Generate unique email
        while True:
            email = fake.email()
            if email not in used_emails:
                used_emails.add(email)
                break
        
        # Generate unique account number
        while True:
            account_number = generate_account_number()
            if account_number not in used_account_numbers:
                used_account_numbers.add(account_number)
                break
        
        # Create user with secure password
        user = User(
            email=email,
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            account_number=account_number,
            balance=Decimal(str(round(random.uniform(500.00, 25000.00), 2))),
            created_at=fake.date_time_between(start_date='-2y', end_date='-6m'),
            is_active=True
        )
        
        # Set a random but reasonable password (for training purposes)
        passwords = ['password123', 'training456', 'demo789', 'secure123', 'test456']
        user.set_password(random.choice(passwords))
        
        users.append(user)
        
        if (i + 1) % 10 == 0:
            print(f"  Created {i + 1}/{count} users...")
    
    # Add users to database session
    db.session.add_all(users)
    db.session.commit()
    
    print(f"✓ Successfully created {len(users)} users")
    return users


def create_transactions_for_user(user, transaction_count=None):
    """
    Create transactions for a specific user over the last 6 months
    Returns list of created transactions
    """
    if transaction_count is None:
        transaction_count = random.randint(70, 100)
    
    transactions = []
    current_balance = user.balance
    
    # Generate transactions going backwards in time
    end_date = datetime.now()
    start_date = end_date - timedelta(days=180)  # 6 months back
    
    # Generate transaction dates
    transaction_dates = []
    for _ in range(transaction_count):
        random_date = fake.date_time_between(start_date=start_date, end_date=end_date)
        transaction_dates.append(random_date)
    
    # Sort dates in chronological order
    transaction_dates.sort()
    
    # Create transactions
    for i, transaction_date in enumerate(transaction_dates):
        # Determine transaction type (70% debit, 30% credit)
        is_credit = random.random() < 0.30
        transaction_type = 'credit' if is_credit else 'debit'
        
        # Generate amount based on transaction type
        if is_credit:
            # Credits: salary, refunds, transfers in
            if random.random() < 0.1:  # 10% chance of salary-like deposit
                amount = Decimal(str(round(random.uniform(2000.00, 8000.00), 2)))
            else:
                amount = Decimal(str(round(random.uniform(10.00, 500.00), 2)))
        else:
            # Debits: purchases, bills, withdrawals
            amount = Decimal(str(round(random.uniform(5.00, 1200.00), 2)))
        
        # Update balance
        if is_credit:
            current_balance += amount
        else:
            current_balance -= amount
            # Ensure balance doesn't go too negative
            if current_balance < Decimal('-1000.00'):
                current_balance += amount  # Revert the transaction
                continue
        
        # Round the balance to 2 decimal places
        current_balance = Decimal(str(round(float(current_balance), 2)))
        
        # Select company and category
        company = random.choice(SAMPLE_COMPANIES)
        category = random.choice(TRANSACTION_CATEGORIES)
        
        # Generate description
        descriptions = [
            f"Purchase at {company}",
            f"Payment to {company}",
            f"Online order from {company}",
            f"Service fee - {company}",
            f"Subscription - {company}",
            f"Refund from {company}" if is_credit else f"Bill payment - {company}"
        ]
        description = random.choice(descriptions)
        
        # Generate unique reference number
        reference_number = generate_reference_number()
        
        # Create transaction
        transaction = Transaction(
            user_id=user.id,
            transaction_type=transaction_type,
            amount=amount,
            company=company,
            description=description,
            date=transaction_date,
            reference_number=reference_number,
            balance_after=current_balance,
            category=category
        )
        
        transactions.append(transaction)
    
    return transactions


def populate_database():
    """
    Main function to populate the database with sample data
    """
    print("=" * 60)
    print("Banking Security Training - Database Population Tool")
    print("=" * 60)
    
    # Check if data already exists
    if check_existing_data():
        print("\n⚠️  Database already contains data!")
        response = input("Do you want to continue and add more data? (y/N): ").lower()
        if response != 'y':
            print("❌ Population cancelled.")
            return None
        print("\n📝 Adding additional data to existing database...")
    else:
        print("\n📝 Database is empty. Populating with sample data...")
    
    try:
        # Clear the global reference number tracker
        global used_reference_numbers
        used_reference_numbers.clear()
        
        # Create users
        print("\n1️⃣ Creating user accounts...")
        users = create_users()
        
        # Commit users first to get their IDs
        db.session.commit()
        print(f"✅ Users committed to database")
        
        # Create transactions for each user
        print("\n2️⃣ Creating transactions...")
        total_transactions = 0
        all_transactions = []
        
        for i, user in enumerate(users):
            transaction_count = random.randint(70, 100)
            transactions = create_transactions_for_user(user, transaction_count)
            
            # Add transactions to our list
            all_transactions.extend(transactions)
            total_transactions += len(transactions)
            
            if (i + 1) % 10 == 0:
                print(f"  Generated transactions for {i + 1}/{len(users)} users...")
        
        print(f"  Generated {total_transactions} total transactions")
        print("  Adding transactions to database...")
        
        # Add all transactions to the session in batches
        batch_size = 500
        for i in range(0, len(all_transactions), batch_size):
            batch = all_transactions[i:i + batch_size]
            db.session.add_all(batch)
            
            # Commit each batch
            db.session.commit()
            print(f"    Committed batch {i//batch_size + 1}/{(len(all_transactions) + batch_size - 1)//batch_size}")
        
        print(f"\n✅ Database population completed successfully!")
        print(f"📊 Summary:")
        print(f"   Users created: {len(users)}")
        print(f"   Transactions created: {total_transactions}")
        print(f"   Average transactions per user: {total_transactions // len(users)}")
        
        # Return a random user for login testing
        test_user = random.choice(users)
        return {
            'email': test_user.email,
            'password': 'password123',  # We know this is one of the possible passwords
            'name': test_user.get_full_name(),
            'account_number': test_user.account_number
        }
        
    except Exception as e:
        print(f"\n❌ Error during database population: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        db.session.rollback()
        return None


def display_login_info(user_info):
    """
    Display login information for testing
    """
    if not user_info:
        return
    
    print("\n" + "=" * 60)
    print("🔑 TEST LOGIN CREDENTIALS")
    print("=" * 60)
    print(f"Email:    {user_info['email']}")
    print(f"Password: {user_info['password']}")
    print(f"Name:     {user_info['name']}")
    print(f"Account:  {user_info['account_number']}")
    print("=" * 60)
    print("🚀 You can now start the application and login with these credentials!")
    print("   Run: python app.py")
    print("=" * 60)


def main():
    """
    Main entry point for the population script
    """
    # Create Flask app context
    app = create_app()
    
    with app.app_context():
        # Create database tables if they don't exist
        try:
            db.create_all()
            print("✅ Database tables verified/created")
        except Exception as e:
            print(f"❌ Error creating database tables: {e}")
            return
        
        # Populate database
        user_info = populate_database()
        
        # Display login credentials
        display_login_info(user_info)


if __name__ == '__main__':
    main()
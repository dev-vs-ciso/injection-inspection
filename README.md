# Banking Security Training Application

A Flask-based simulated banking application designed for security training purposes. This application provides a realistic banking interface with user accounts, transactions, and search functionality to help train users on banking security concepts.

## **IMPORTANT SECURITY NOTICE**

**THIS IS A TRAINING APPLICATION ONLY**
- Do NOT use in production environments
- Contains intentional security vulnerabilities for educational purposes
- All data is simulated and for training use only
- Always run in isolated/controlled environments

## Features

- **User Authentication**: Secure login system with password hashing
- **Account Dashboard**: View account balance and recent transactions
- **Transaction Management**: Detailed transaction views and search functionality
- **Database Support**: Configurable database backend (SQLite, PostgreSQL)
- **Responsive Design**: Bootstrap 5 UI that works on desktop and mobile
- **Sample Data**: Pre-populated with realistic users and transactions

## Project Structure

```
banking_app/
├── app.py                 # Main Flask application
├── models.py             # Database models (User, Transaction)
├── urls.py                # URL routes and view functions
├── decorators.py         # Custom decorators for security
├── config.py             # Configuration settings
├── populate_db.py        # Database population tool
├── requirements.txt      # Python dependencies
├── README.md            # This file
└── templates/           # HTML templates
    ├── base.html        # Base template with navigation
    ├── index.html       # Home page with bank stats
    ├── login.html       # User login page
    ├── dashboard.html   # User account dashboard
    ├── transaction.html # Transaction detail view
    ├── search.html      # Transaction search page
    └── profile.html     # User profile page
```

## Quick Start

### 1. Clone or Download the Application

Download all the files and place them in a directory called `banking_app`.

### 2. Install Python Dependencies

```bash
cd banking_app
pip install -r requirements.txt
```

**Minimum Requirements (SQLite only):**
```bash
pip install Flask Flask-SQLAlchemy Flask-Login Faker
```

### 3. Set Up the Database

The application uses SQLite by default (no additional setup required).

**For other databases, set environment variables:**

**PostgreSQL:**
```bash
export DATABASE_TYPE=postgresql
export DB_HOST=localhost
export DB_NAME=banking
export DB_USER=postgres
export DB_PASS=your_password
```

### 4. Populate the Database

Run the population tool to create sample users and transactions:

```bash
python populate_db.py
```

This will:
- Create 30-40 user accounts with random email addresses
- Generate 70-100 transactions per user over the past 6 months
- Display test login credentials for immediate use

**Sample Output:**
```
============================================================
🔑 TEST LOGIN CREDENTIALS
============================================================
Email:    john.smith@example.com
Password: password123
Name:     John Smith
Account:  123456789012
============================================================
```

### 5. Start the Application

```bash
python app.py
```

The application will start at: `http://127.0.0.1:5000`

## Usage

### Logging In

1. Navigate to the home page
2. Use the credentials provided by the population tool
3. Click "Sign In to Your Account"

### Features Available

- **Dashboard**: View account balance and recent transactions
- **Search**: Find transactions by company name or date range
- **Transaction Details**: Click on any transaction to view full details
- **Profile**: View account information and activity summary

### Sample Login Credentials

The population tool generates random users, with random password

## Configuration

### Database Configuration

Edit `config.py` or set environment variables:

```python
# Default SQLite (no setup required)
DATABASE_TYPE = 'sqlite'

# PostgreSQL
DATABASE_TYPE = 'postgresql'
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'banking'
DB_USER = 'postgres'
DB_PASS = 'password'
```

### Application Settings

```python
SECRET_KEY = 'your-secret-key-here'
BANK_NAME = "Kerata-Zemke"
PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)
```

## API Endpoints

### Main Routes

- `GET /` - Home page with bank statistics
- `GET/POST /login` - User login page
- `GET /logout` - User logout
- `GET /dashboard` - User account dashboard (requires login)
- `GET /transaction/<id>` - Transaction details (requires login)
- `GET/POST /search` - Transaction search (requires login)
- `GET /profile` - User profile (requires login)

### API Routes

- `GET /api/stats` - Bank statistics in JSON format

## Security Features

### Implemented Security Measures

- **Password Hashing**: Uses Werkzeug's secure password hashing
- **Session Management**: Flask-Login handles user sessions
- **CSRF Protection**: Forms use Flask's built-in CSRF protection
- **SQL Injection Prevention**: SQLAlchemy ORM prevents SQL injection
- **Authentication Required**: Decorators protect sensitive routes
- **Input Validation**: Form validation on both client and server side

### Training Vulnerabilities

This application may contain intentional security vulnerabilities for educational purposes. Use only in controlled training environments.

## Database Schema

### Users Table
- `id` (Primary Key)
- `email` (Unique)
- `password_hash` (Securely hashed)
- `first_name`, `last_name`
- `account_number` (Unique)
- `balance` (Decimal)
- `created_at` (Timestamp)
- `is_active` (Boolean)

### Transactions Table
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `transaction_type` ('credit' or 'debit')
- `amount` (Decimal)
- `company` (String)
- `description` (Text)
- `date` (Timestamp)
- `reference_number` (Unique)
- `balance_after` (Decimal)
- `category` (String)

## Development

### Running in Debug Mode

```bash
export FLASK_DEBUG=1
python app.py
```

### Resetting the Database

To start fresh:
```bash
rm banking.db  # (if using SQLite)
python populate_db.py
```

### Adding New Features

The application uses a modular structure:
- Add new routes in `py`
- Add new models in `models.py`
- Add new templates in `templates/`
- Add new decorators in `decorators.py`

## Troubleshooting

### Common Issues

**Database Connection Error:**
- Check database credentials in `config.py`
- Ensure database server is running
- Verify database exists and user has permissions

**Module Not Found Error:**
```bash
pip install -r requirements.txt
```

**Permission Denied (SQLite):**
- Ensure write permissions in application directory
- Check if `banking.db` file is locked by another process

**Population Tool Fails:**
- Delete existing `banking.db` and try again
- Check for any conflicting processes

### Getting Help

1. Check the console output for specific error messages
2. Verify all dependencies are installed correctly
3. Ensure proper file permissions
4. Check database connectivity

## License

This training application is provided for educational purposes only. Not licensed for production use.

## Contributing

This is a training application. Modifications should focus on educational value while maintaining security awareness principles.

---

**Remember: This is a TRAINING application with intentional security considerations. Never deploy to production environments.**
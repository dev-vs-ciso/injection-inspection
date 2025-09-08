# AI Coding Agent Instructions - Injection Inspection Banking App

## Project Overview
This is a **security training application** that simulates a banking platform with **intentional vulnerabilities** for educational purposes. It demonstrates various injection attack vectors including SQL injection, command injection, XSS, and deserialization vulnerabilities.

⚠️ **CRITICAL**: This is NOT production code. Vulnerabilities are intentional for training purposes.

## Architecture & Key Components

### Application Structure
- **Flask app factory pattern** in `app.py` with modular route organization
- **Multi-database support**: SQLite (dev), PostgreSQL, SQL Server via environment variables
- **Modular routes**: Separate modules in `application/` directory (user, transaction, feedback, api, errors, home)
- **Security decorators** in `decorators.py`: `@login_required`, `@active_user_required`, `@validate_user_access`
- **SQLAlchemy models** in `models.py`: User, Transaction, Feedback with proper relationships

### Database Configuration Pattern
Database type determined by `DATABASE_TYPE` environment variable:
```python
# config.py - Multi-database pattern
if DATABASE_TYPE == 'sqlite': # Local development
elif DATABASE_TYPE == 'postgresql': # Docker/production
elif DATABASE_TYPE == 'sqlserver': # Enterprise simulation
elif DATABASE_TYPE == 'azure-sql-edge': # Edge computing scenarios
```

### Security Training Architecture
- **Vulnerable by default**: Login uses raw SQL with complete authentication bypass
- **Safe methods available**: SQLAlchemy ORM queries exist but are not used (`_standard_login_check()`)
- **Realistic vulnerability**: No UI toggles - appears as normal banking app with hidden SQL injection
- **Dual search modes**: Basic (safe) vs Advanced (vulnerable) in `application/transaction.py`

## Key Workflows & Commands

### Development Setup
```bash
# Local SQLite development
python populate_db.py  # Creates sample data with 30-40 users, 70-100 transactions each
python app.py          # Starts on localhost:5000, auto-debug for local

# Docker multi-database
./setup.sh             # Interactive setup script
docker-compose -f docker-compose.postgres.yml up -d
docker exec banking-app python populate_db.py
```

### Database Population Pattern
`populate_db.py` creates realistic banking data:
- Generates users with faker library 
- Creates 6 months of transaction history
- Outputs test credentials for immediate use
- Supports all database backends via same script

### Docker Multi-Environment Pattern
- `docker-compose.postgres.yml` - PostgreSQL + pgAdmin
- `docker-compose.sqlserver.yml` - SQL Server + Adminer  
- Environment-specific `.env` files (`.env.postgres`, `.env.sqlserver`)
- Automatic database initialization scripts in `docker/`

## Project-Specific Patterns

### Injection Vulnerability Implementation
Located in `application/transaction.py` and `application/user.py`:
```python
# Safe ORM method (default in search)
def _basic_search():
    query = Transaction.query.filter_by(user_id=current_user.id)
    query = query.filter(Transaction.company.ilike(f'%{company}%'))

# Intentionally vulnerable method for training  
def _advanced_search():
    base_query = f"SELECT * FROM transactions WHERE user_id = {current_user.id}"
    where_conditions.append(f"t.company LIKE '%{company}%'")  # SQL injection point

# ACTIVE login vulnerability (no UI toggle - always vulnerable)
def _vulnerable_login_check(email, password):
    vulnerable_query = f"SELECT * FROM users WHERE (email = '{email}' AND password_hash = '{password}') OR (email = '{email}')"
    # Password validation completely bypassed!
```

### Security Decorator Patterns
```python
# decorators.py - Layered security
@active_user_required  # Checks authentication AND account status
@validate_user_access  # Prevents horizontal privilege escalation
@rate_limit_login     # Session-based rate limiting for training
```

### Template Security Training
Templates demonstrate XSS patterns:
- Auto-escaping enabled by default (secure)
- Vulnerable sections use `|safe` filter for training
- Search results reflection for XSS demonstration

## Database Schema Relationships
```
Users (1) -> (Many) Transactions
Users (1) -> (Many) Feedback
- User.get_recent_transactions() - Optimized queries
- Transaction.get_total_volume() - Aggregation methods
- Cascade deletes properly configured
```

## Integration Points

### Multi-Database Abstraction
SQLAlchemy handles differences between SQLite/PostgreSQL/SQL Server, but raw SQL injection examples are database-specific in advanced search.

### Docker Service Dependencies
```yaml
# Banking app depends on database readiness
depends_on:
  - postgres/sqlserver
# Admin interfaces (pgAdmin/Adminer) for database inspection
```

### Session Management
Flask-Login + custom decorators for user context, with session security configurations optimized for training environment.

## Development Conventions

### Error Handling Pattern
`application/errors.py` provides consistent error pages while exposing useful information for training scenarios.

### Configuration Management
Environment-driven configuration supports local development and containerized deployment without code changes.

### Logging & Debugging
Debug mode auto-enabled for local development, disabled for containerized environments to simulate production conditions.

## Testing & Validation

### Security Testing Workflow
1. Use `populate_db.py` credentials for authenticated testing
2. Test both basic (secure) and advanced (vulnerable) search modes
3. Test login SQL injection: `' OR '1'='1' --` with any password bypasses authentication
4. `knowledge/Command_injection.md` and `knowledge/Login_sql_injection.md` contain specific test cases
5. Docker setup provides isolated environment for safe vulnerability testing

### Data Reset Pattern
```bash
rm banking.db && python populate_db.py  # SQLite reset
docker-compose down -v && docker-compose up -d  # Docker reset
```

## File Priorities for Understanding
1. `app.py` - Application factory and route registration
2. `application/transaction.py` - Injection vulnerability examples
3. `models.py` - Database relationships and business logic
4. `decorators.py` - Security patterns
5. `populate_db.py` - Data generation and testing setup
6. `config.py` - Multi-environment configuration

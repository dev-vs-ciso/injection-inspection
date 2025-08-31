# Complete Docker Setup Guide
### Banking Security Training Application

This guide walks you through setting up the Banking Security Training Application with Docker, supporting both PostgreSQL and SQL Server databases.

## 📋 Prerequisites

### System Requirements
- **Docker Desktop** 4.0+ installed and running
- **8GB+ RAM** (12GB+ recommended for SQL Server)
- **10GB+ free disk space**
- **Available ports**: 5000, 5432/1433, 8080

### Verify Docker Installation
```bash
# Check Docker is running
docker --version
docker info

# Check Docker Compose
docker-compose --version
# OR
docker compose version
```

## 🔧 Initial Setup

### 1. Prepare the Application
```bash
# Navigate to your application directory
cd banking_app

# Make setup scripts executable (Linux/macOS only)
chmod +x setup.sh

# Create required directories
mkdir -p docker logs
```

### 2. Choose Database Configuration

Copy the appropriate environment file:

**Check if you have logged in to Docker**
Log in to Docker with a personal account
On the computer run:
`docker login`
Follow the instructions

**For PostgreSQL:**
```bash
cp .env.postgres .env
```

**For SQL Server:**
```bash
cp .env.sqlserver .env
```

## 🐘 PostgreSQL Setup

### Quick Start
```bash
# Interactive setup
./setup.sh
# Choose option 1 (PostgreSQL)

# OR direct command
./setup.sh postgres
```

### Manual Setup
```bash
# 1. Copy PostgreSQL environment
cp .env.postgres .env

# 2. Start PostgreSQL stack
docker-compose -f docker-compose.postgres.yml up -d

# 3. Wait for services (10-15 seconds)
sleep 15

# 4. Check service health
docker-compose -f docker-compose.postgres.yml ps

# 5. Populate database with sample data
docker exec banking-app python populate_db.py

# 6. Access the application
echo "Banking App: http://localhost:5000"
echo "pgAdmin: http://localhost:8080"
```

### Console Output Example
```
============================================================
🐘 STARTING POSTGRESQL STACK
============================================================
✅ Using PostgreSQL environment configuration
🚀 Starting PostgreSQL and Banking Application...
Creating network "banking_banking-network" with the default driver
Creating volume "banking_postgres_data" with local driver
Creating volume "banking_pgadmin_data" with local driver
Creating banking-postgres ... done
Creating banking-pgadmin  ... done
Creating banking-app      ... done

⏳ Waiting for services to start...

      Name                     Command                  State                    Ports
------------------------------------------------------------------------------------------------
banking-app        python app.py                    Up (healthy)   0.0.0.0:5000->5000/tcp
banking-pgadmin    /entrypoint.sh                   Up             0.0.0.0:8080->80/tcp
banking-postgres   docker-entrypoint.sh postgres    Up (healthy)   0.0.0.0:5432->5432/tcp

📊 Populating database with sample data...
Creating 35 user accounts...
  Created 10/35 users...
  Created 20/35 users...
  Created 30/35 users...
✓ Successfully created 35 users
Generating transactions for users...
  Generated transactions for 10/35 users...
  Generated transactions for 20/35 users...
  Generated transactions for 30/35 users...
✅ Database population completed successfully!

============================================================
🔑 TEST LOGIN CREDENTIALS
============================================================
Email:    sarah.johnson@example.com
Password: password123
Name:     Sarah Johnson
Account:  847291635402
============================================================
```

## 🏢 SQL Server Setup

### Quick Start
```bash
# Interactive setup
./setup.sh
# Choose option 2 (SQL Server)

# OR direct command
./setup.sh sqlserver
```

### Manual Setup
```bash
# 1. Copy SQL Server environment
cp .env.sqlserver .env

# 2. Start SQL Server stack
docker-compose -f docker-compose.sqlserver.yml up -d

# 3. Wait for SQL Server to initialize (30-60 seconds)
echo "Waiting for SQL Server to start..."
sleep 30

# 4. Check if SQL Server is ready
docker exec banking-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "SecurePassword123!" -Q "SELECT 1"

# 5. Check service health
docker-compose -f docker-compose.sqlserver.yml ps

# 6. Populate database with sample data
docker exec banking-app python populate_db.py

# 7. Access the application
echo "Banking App: http://localhost:5000"
echo "Adminer: http://localhost:8080"
```

### Console Output Example
```
============================================================
🏢 STARTING SQL SERVER STACK
============================================================
✅ Using SQL Server environment configuration
🚀 Starting SQL Server and Banking Application...
Creating network "banking_banking-network" with the default driver
Creating volume "banking_sqlserver_data" with local driver
Creating volume "banking_sqlserver_log" with local driver
Creating volume "banking_sqlserver_secrets" with local driver
Creating banking-sqlserver ... done
Creating banking-adminer   ... done
Creating banking-app       ... done

⏳ Waiting for SQL Server to start (this may take 30-60 seconds)...

🔍 Checking SQL Server health...
⏳ Waiting for SQL Server... (1/10)
⏳ Waiting for SQL Server... (2/10)
✅ SQL Server is ready

      Name                Command                    State                    Ports
----------------------------------------------------------------------------------------------------
banking-adminer    entrypoint.sh docker-php-e...   Up             0.0.0.0:8080->8080/tcp
banking-app        python app.py                    Up (healthy)   0.0.0.0:5000->5000/tcp
banking-sqlserver  /opt/mssql/bin/sqlservr        Up (healthy)   0.0.0.0:1433->1433/tcp

📊 Populating database with sample data...
Creating 35 user accounts...
✓ Successfully created 35 users
Database population completed successfully!

============================================================
🔑 TEST LOGIN CREDENTIALS
============================================================
Email:    michael.chen@example.com
Password: training456
Name:     Michael Chen
Account:  592847163920
============================================================
```

## 🔍 Monitoring and Management

### Check Service Status
```bash
# View all banking-related containers
docker ps --filter "name=banking"

# Check specific service health
docker exec banking-postgres pg_isready -U bankuser -d banking
docker exec banking-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "SecurePassword123!" -Q "SELECT 1"

# View service logs
docker logs banking-app
docker logs banking-postgres
docker logs banking-sqlserver
```

### Database Management

**PostgreSQL via pgAdmin:**
1. Go to http://localhost:8080
2. Login: `admin@example.com` / `admin123`
3. Add server: Host: `postgres`, Port: `5432`, Database: `banking`, User: `bankuser`, Password: `securepassword123`

**SQL Server via Adminer:**
1. Go to http://localhost:8080
2. System: `MS SQL Server`
3. Server: `sqlserver`
4. Username: `sa`
5. Password: `SecurePassword123!`
6. Database: `banking`

## 🛑 Stopping and Cleanup

### Stop Services
```bash
# Interactive
./setup.sh
# Choose option 5 (Stop all services)

# Manual - PostgreSQL
docker-compose -f docker-compose.postgres.yml down

# Manual - SQL Server
docker-compose -f docker-compose.sqlserver.yml down
```

### Complete Cleanup (Removes All Data)
```bash
# Interactive
./setup.sh
# Choose option 6 (Cleanup)

# Manual cleanup
docker-compose -f docker-compose.postgres.yml down -v
docker-compose -f docker-compose.sqlserver.yml down -v
docker container prune -f
docker volume prune -f
```

## 🔄 Switching Between Databases

To switch from one database to another:

```bash
# 1. Stop current services
docker-compose -f docker-compose.postgres.yml down
# OR
docker-compose -f docker-compose.sqlserver.yml down

# 2. Switch environment configuration
cp .env.sqlserver .env  # Switch to SQL Server
# OR  
cp .env.postgres .env   # Switch to PostgreSQL

# 3. Start new database stack
docker-compose -f docker-compose.sqlserver.yml up -d
# OR
docker-compose -f docker-compose.postgres.yml up -d

# 4. Populate new database
docker exec banking-app python populate_db.py
```

## 🐛 Troubleshooting Common Issues

### Issue: Port Already in Use
```bash
# Find what's using the port
netstat -tulpn | grep :5000
# OR on macOS
lsof -i :5000

# Kill the process or change the port in docker-compose
```

### Issue: SQL Server Won't Start
```bash
# Check SQL Server logs
docker logs banking-sqlserver

# Common causes:
# - Insufficient memory (needs 2GB+)
# - Password doesn't meet complexity requirements
# - EULA not accepted

# Fix password in .env.sqlserver:
SA_PASSWORD=YourComplexPassword123!
```

### Issue: Application Can't Connect to Database
```bash
# Check network connectivity
docker exec banking-app ping postgres
docker exec banking-app ping sqlserver

# Check environment variables
docker exec banking-app env | grep DB_

# Restart application
docker restart banking-app
```

### Issue: Database Tables Not Created
```bash
# Check application logs
docker logs banking-app

# Manually create tables
docker exec -it banking-app python -c "
from app import create_app
from models import db
app = create_app()
with app.app_context():
    db.create_all()
    print('Tables created successfully')
"
```

## 📊 Performance Monitoring

### Resource Usage
```bash
# Monitor container resource usage
docker stats

# Check specific container
docker stats banking-app banking-postgres
```

### Database Performance
```bash
# PostgreSQL stats
docker exec banking-postgres psql -U bankuser -d banking -c "
    SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
    FROM pg_stat_user_tables;
"

# SQL Server stats  
docker exec banking-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "SecurePassword123!" -Q "
    SELECT 
        name,
        (SELECT COUNT(*) FROM sys.tables WHERE schema_id = schema_id) as table_count
    FROM sys.schemas 
    WHERE name = 'dbo';
"
```

---

## 🎯 Success Checklist

After running setup, verify everything works:

- [ ] All containers are running: `docker ps --filter "name=banking"`
- [ ] Application responds: `curl http://localhost:5000`
- [ ] Database is accessible via admin interface
- [ ] Can login with test credentials from populate_db.py output
- [ ] Can view transactions and search functionality
- [ ] No error messages in logs: `docker logs banking-app`

**🎉 If all items are checked, your Banking Security Training Application is ready for use!**
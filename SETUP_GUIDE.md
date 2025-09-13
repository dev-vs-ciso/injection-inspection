# Complete Docker Setup Guide
### Banking Security Training Application

This guide walks you through setting up the Banking Security Training Application with Docker, supporting PostgreSQL database.

## 📋 Prerequisites

### System Requirements
- **Docker Desktop** 4.0+ installed and running
- **8GB+ RAM** 
- **10GB+ free disk space**
- **Available ports**: 5000, 5432, 8080

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

## 🔍 Monitoring and Management

### Check Service Status
```bash
# View all banking-related containers
docker ps --filter "name=banking"

# Check specific service health
docker exec banking-postgres pg_isready -U bankuser -d banking

# View service logs
docker logs banking-app
docker logs banking-postgres
```

### Database Management

**PostgreSQL via pgAdmin:**
1. Go to http://localhost:8080
2. Login: `admin@example.com` / `admin123`
3. Add server: Host: `postgres`, Port: `5432`, Database: `banking`, User: `bankuser`, Password: `securepassword123`

## 🛑 Stopping and Cleanup

### Stop Services
```bash
# Interactive
./setup.sh
# Choose option 5 (Stop all services)

# Manual - PostgreSQL
docker-compose -f docker-compose.postgres.yml down
```

### Complete Cleanup (Removes All Data)
```bash
# Interactive
./setup.sh
# Choose option 6 (Cleanup)

# Manual cleanup
docker-compose -f docker-compose.postgres.yml down -v
docker container prune -f
docker volume prune -f
```

##  Troubleshooting Common Issues

### Issue: Port Already in Use
```bash
# Find what's using the port
netstat -tulpn | grep :5000
# OR on macOS
lsof -i :5000

# Kill the process or change the port in docker-compose
```

### Issue: Application Can't Connect to Database
```bash
# Check network connectivity
docker exec banking-app ping postgres

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
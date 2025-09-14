# Docker Setup for Banking Securit# Populate with sample data
docker exec banking-app python python/populate_db.py
```

## 📊 Database Comparisonon

This guide helps you run the Banking Security Training Application using Docker with PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- **Docker Desktop** installed and running
- **8GB+ RAM**
- **Ports available**: 5000 (app), 5432 (database), 8080 (admin interface)

### Option 1: Interactive Setup (Recommended)

**Linux/macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

### Option 2: Direct Commands

**PostgreSQL:**
```bash
# Copy environment configuration
cp .env.postgres .env

# Start services
docker-compose -f docker-compose.postgres.yml up -d

# Populate with sample data
docker exec banking-app python python/populate_db.py
```

## 📊 Database Configuration
|---------|------------|------------|
| **Startup Time** | ~10-15 seconds | ~30-60 seconds |
| **Memory Usage** | ~200-400 MB | ~500-800 MB |
## 🔧 Configuration Files

### Environment Files

**`.env.postgres`** - PostgreSQL configuration
```bash
DATABASE_TYPE=postgresql
DB_HOST=postgres
DB_NAME=banking
DB_USER=bankuser
DB_PASS=securepassword123
SECRET_KEY=your-super-secret-key
DEBUG=True
```

### Docker Compose Files

- **`docker-compose.postgres.yml`** - PostgreSQL stack with pgAdmin

## 🌐 Access Points

Once running, access these URLs:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Banking App** | http://localhost:5000 | See populate_db.py output |
| **pgAdmin** (PostgreSQL) | http://localhost:8080 | admin@example.com / admin123 |

## 🔑 Sample Login Credentials

The `populate_db.py` script creates random users with random passwords:

**Example output from populate_db.py:**
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

## 🐳 Docker Commands Reference

### Starting Services
```bash
# PostgreSQL stack
docker-compose -f docker-compose.postgres.yml up -d

# SQL Server stack  
docker-compose -f docker-compose.sqlserver.yml up -d
```

### Stopping Services
```bash
# Stop PostgreSQL stack
docker-compose -f docker-compose.postgres.yml down
```

### Viewing Logs
```bash
# All services
docker-compose -f docker-compose.postgres.yml logs -f

# Specific service
docker logs banking-app
docker logs banking-postgres
docker logs banking-sqlserver
```

### Database Management
```bash
# Connect to PostgreSQL
docker exec -it banking-postgres psql -U bankuser -d banking

# Connect to SQL Server
docker exec -it banking-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "SecurePassword123!"
```

## 🛠️ Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check Docker status
docker info

# Check port conflicts
netstat -tulpn | grep :5000
netstat -tulpn | grep :5432  # PostgreSQL
netstat -tulpn | grep :1433  # SQL Server
```

**Database connection errors:**
```bash
# Check database health
docker exec banking-postgres pg_isready -U bankuser -d banking
docker exec banking-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "SecurePassword123!" -Q "SELECT 1"

# Restart services
docker-compose -f docker-compose.postgres.yml restart
```

**Application errors:**
```bash
# View application logs
docker logs banking-app

# Enter container for debugging
docker exec -it banking-app bash

# Check environment variables
docker exec banking-app env | grep DB_
```

### Reset Everything
```bash
# Stop and remove all containers and volumes
docker-compose -f docker-compose.postgres.yml down -v
docker-compose -f docker-compose.sqlserver.yml down -v

# Clean up orphaned resources
docker container prune -f
docker volume prune -f
docker network prune -f
```

## 🔒 Security Notes

### For Training Environment:
- Uses development-friendly settings (DEBUG=True, HTTP cookies)
- Default passwords are simple for easy testing
- All services run in isolated Docker network

### For Production (Don't Use This App):
- This is a **TRAINING APPLICATION ONLY**
- Contains intentional vulnerabilities for educational purposes
- Never deploy this application to production
- Change all default passwords and secrets

## 📁 File Structure

After setup, your directory structure should look like:
```
banking_app/
├── docker-compose.postgres.yml
├── docker-compose.sqlserver.yml
├── Dockerfile
├── setup.sh (Linux/macOS)
├── setup.bat (Windows)
├── .env.postgres
├── .env.sqlserver
├── .env (active configuration)
├── docker/
│   ├── postgres-init.sql
│   └── sqlserver-init.sql
├── logs/ (created automatically)
└── [existing app files...]
```

## 🎯 Next Steps

1. **Choose your database** and run the setup script
2. **Access the application** at http://localhost:5000
3. **Use the test credentials** from populate_db.py output
4. **Explore the admin interface** at http://localhost:8080
5. **Check logs** if you encounter any issues

## 💡 Tips

- **PostgreSQL** is recommended for most training scenarios (faster, lighter)
- **SQL Server** is better for enterprise environment simulation
- Use `docker-compose logs -f` to monitor startup progress
- The app automatically creates tables on first run
- Sample data includes 30-40 users with 70-100 transactions each

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs**: `docker logs banking-app`
2. **Verify Docker**: `docker info` 
3. **Check ports**: Make sure 5000, 5432/1433, and 8080 are available
4. **Reset everything**: Use the cleanup option in setup script
5. **Review this documentation**: Most issues are covered in troubleshooting

---

**⚠️ Remember: This is a TRAINING application with intentional security considerations. Never deploy to production!**
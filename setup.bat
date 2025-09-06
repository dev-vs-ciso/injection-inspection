@echo off
:: Banking Security Training Application - Windows Docker Setup Script
:: This script helps you run the application with either PostgreSQL or SQL Server

setlocal enabledelayedexpansion

:: Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo ✅ Docker is running

:: Check for docker-compose
docker-compose version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo ❌ docker-compose or 'docker compose' is not available
        pause
        exit /b 1
    ) else (
        set DOCKER_COMPOSE=docker compose
    )
) else (
    set DOCKER_COMPOSE=docker-compose
)
echo ✅ Using: !DOCKER_COMPOSE!

:: Create necessary directories
if not exist docker mkdir docker
if not exist logs mkdir logs

:menu
echo.
echo ============================================================
echo 🏦 BANKING SECURITY TRAINING - DOCKER SETUP
echo ============================================================
echo Choose your database option:
echo.
echo 1) 🐘 Start with PostgreSQL
echo 2) 🏢 Start with SQL Server  
echo 3) 📊 Show status
echo 4) 📝 Show logs
echo 5) 🛑 Stop all services
echo 6) 🧹 Cleanup (remove all data)
echo 7) ❓ Help
echo 8) 🚪 Exit
echo.

set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto start_postgres
if "%choice%"=="3" goto show_status
if "%choice%"=="4" goto show_logs
if "%choice%"=="5" goto stop_services
if "%choice%"=="6" goto cleanup
if "%choice%"=="7" goto show_help
if "%choice%"=="8" goto exit_script
echo ❌ Invalid option. Please choose 1-8.
goto menu

:start_postgres
echo.
echo ============================================================
echo 🐘 STARTING POSTGRESQL STACK
echo ============================================================

:: Copy PostgreSQL environment file
if exist .env.postgres (
    copy .env.postgres .env >nul
    echo ✅ Using PostgreSQL environment configuration
) else (
    echo ⚠️ .env.postgres not found, using default values
)

echo 🚀 Starting PostgreSQL and Banking Application...
!DOCKER_COMPOSE! -f docker-compose.postgres.yml up -d

echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak >nul

:: Show service status
!DOCKER_COMPOSE! -f docker-compose.postgres.yml ps

echo 📊 Initialize database and populate with sample data
timeout /t 5 /nobreak >nul
docker exec banking-app flask db upgrade

echo 📊 Populating database with sample data...
timeout /t 5 /nobreak >nul
docker exec banking-app python populate_db.py

echo.
echo ============================================================
echo 🎉 POSTGRESQL SETUP COMPLETE
echo ============================================================
echo Banking Application: http://localhost:5000
echo pgAdmin (Database Management): http://localhost:8080
echo pgAdmin Login: admin@example.com / admin123
echo pgAdmin Setup: host: postgres; user: bankuser; password: securepassword123

echo.
goto show_test_credentials

:show_status
echo.
echo ============================================================
echo 📊 DOCKER SERVICES STATUS
echo ============================================================

:: Check which configuration is active
if exist .env (
    findstr "postgresql" .env >nul 2>&1
    if not errorlevel 1 (
        echo Active Configuration: PostgreSQL
        !DOCKER_COMPOSE! -f docker-compose.postgres.yml ps
    )
) else (
    echo No active configuration found
)

echo.
echo All Banking App Containers:
docker ps --filter "name=banking" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
pause
goto menu

:show_logs
echo.
set /p service="Which service logs? (banking-app, banking-postgres, or Enter for all): "
if "%service%"=="" (
    echo Showing logs for all services...
    if exist .env (
        findstr "postgresql" .env >nul 2>&1
        if not errorlevel 1 (
            !DOCKER_COMPOSE! -f docker-compose.postgres.yml logs
        )
    )
) else (
    echo Showing logs for %service%...
    docker logs %service%
)
pause
goto menu

:stop_services
echo.
echo ============================================================
echo 🛑 STOPPING ALL SERVICES
echo ============================================================

if exist docker-compose.postgres.yml (
    echo Stopping PostgreSQL stack...
    !DOCKER_COMPOSE! -f docker-compose.postgres.yml down
)

echo ✅ All services stopped
pause
goto menu

:cleanup
echo.
echo ============================================================
echo 🧹 CLEANING UP
echo ============================================================
echo ⚠️ This will remove all containers and data volumes!
set /p confirm="Are you sure? (y/N): "

if /i "%confirm%"=="y" (
    if exist docker-compose.postgres.yml (
        !DOCKER_COMPOSE! -f docker-compose.postgres.yml down -v
    )
    
    docker container prune -f
    docker volume prune -f
    
    echo ✅ Cleanup complete
) else (
    echo Cleanup cancelled
)
pause
goto menu

:show_help
echo.
echo ============================================================
echo ❓ HELP ^& TROUBLESHOOTING
echo ============================================================
echo 🐘 PostgreSQL Option:
echo    - Uses PostgreSQL 15 Alpine image
echo    - Includes pgAdmin web interface on port 8080
echo    - Lighter weight, faster startup
echo    - Good for development and testing
echo.
echo 🏢 SQL Server Option:
echo    - Uses Microsoft SQL Server 2022 Express
echo    - Includes Adminer web interface on port 8080
echo    - Requires more resources, slower startup
echo    - Good for enterprise environment simulation
echo.
echo 📁 Important Files:
echo    - .env.postgres: PostgreSQL configuration
echo    - docker/: Database initialization scripts
echo.
echo 🔧 Troubleshooting:
echo    - Check Docker is running: docker info
echo    - View logs: Choose option 4 from menu
echo    - Reset everything: Choose option 6 from menu
echo    - Ports in use: 5000 (app), 5432/1433 (db), 8080 (admin)
echo.
echo 🌐 Access Points:
echo    - Banking App: http://localhost:5000
echo    - Database Admin: http://localhost:8080
echo.
pause
goto menu

:exit_script
echo 👋 Goodbye!
exit /b 0
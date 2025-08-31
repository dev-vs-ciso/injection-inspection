-- SQL Server initialization script for Banking Security Training Application
-- This script sets up the database with proper configuration

-- Create the banking database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'banking')
BEGIN
    CREATE DATABASE banking
    COLLATE SQL_Latin1_General_CP1_CI_AS;
    PRINT 'Banking database created successfully.';
END
ELSE
BEGIN
    PRINT 'Banking database already exists.';
END
GO

-- Use the banking database
USE banking;
GO

-- Create a login for the application (optional - using sa is fine for training)
-- Note: In production, you'd create a dedicated user with limited permissions
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'bankappuser')
BEGIN
    CREATE LOGIN bankappuser WITH PASSWORD = 'BankApp123!';
    PRINT 'bankappuser login created successfully.';
END
GO

-- Create database user
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'bankappuser')
BEGIN
    CREATE USER bankappuser FOR LOGIN bankappuser;
    PRINT 'bankappuser database user created successfully.';
END
GO

-- Grant permissions to the user
ALTER ROLE db_owner ADD MEMBER bankappuser;
GO

-- Enable snapshot isolation (recommended for banking applications)
ALTER DATABASE banking SET ALLOW_SNAPSHOT_ISOLATION ON;
ALTER DATABASE banking SET READ_COMMITTED_SNAPSHOT ON;
GO

-- Create a stored procedure to display database info
CREATE OR ALTER PROCEDURE ShowDatabaseInfo
AS
BEGIN
    SELECT 
        'Database Name' AS Property, 
        DB_NAME() AS Value
    UNION ALL
    SELECT 
        'SQL Server Version', 
        @@VERSION
    UNION ALL
    SELECT 
        'Current User', 
        SYSTEM_USER
    UNION ALL
    SELECT 
        'Database Collation', 
        DATABASEPROPERTYEX(DB_NAME(), 'Collation')
    UNION ALL
    SELECT 
        'Snapshot Isolation', 
        CASE WHEN DATABASEPROPERTYEX(DB_NAME(), 'IsSnapshotOn') = 1 
             THEN 'Enabled' 
             ELSE 'Disabled' 
        END;
END
GO

-- Display initialization success message
PRINT '========================================';
PRINT 'Banking Security Training Database Setup Complete!';
PRINT 'Database: banking';
PRINT 'Ready for Flask application connection.';
PRINT '========================================';
GO
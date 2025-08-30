"""
Configuration settings for the Banking Application
Supports SQLite3 (default), PostgreSQL, and SQL Server databases
"""
import os
from datetime import timedelta

class Config:
    """Base configuration class with default settings"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(32).hex()    
    
    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)
    
    # Database configuration
    DATABASE_TYPE = os.environ.get('DATABASE_TYPE', 'sqlite').lower()
    
    # Default to SQLite3
    if DATABASE_TYPE == 'sqlite':
        # Use absolute path to put database in the same directory as the app
        basedir = os.path.abspath(os.path.dirname(__file__))
        db_path = os.path.join(basedir, 'banking.db')
        SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f'sqlite:///{db_path}'
    
    # PostgreSQL configuration
    elif DATABASE_TYPE == 'postgresql':
        DB_HOST = os.environ.get('DB_HOST', 'localhost')
        DB_PORT = os.environ.get('DB_PORT', '5432')
        DB_NAME = os.environ.get('DB_NAME', 'banking')
        DB_USER = os.environ.get('DB_USER', 'postgres')
        DB_PASS = os.environ.get('DB_PASS', 'password')
        SQLALCHEMY_DATABASE_URI = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    
    # SQL Server configuration
    elif DATABASE_TYPE == 'sqlserver':
        DB_HOST = os.environ.get('DB_HOST', 'localhost')
        DB_NAME = os.environ.get('DB_NAME', 'banking')
        DB_USER = os.environ.get('DB_USER', 'sa')
        DB_PASS = os.environ.get('DB_PASS', 'password')
        SQLALCHEMY_DATABASE_URI = f'mssql+pyodbc://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}?driver=ODBC+Driver+17+for+SQL+Server'
    
    # SQLAlchemy settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Set to True for SQL debugging
    
    # Application settings
    BANK_NAME = "SecureBank Training"
    TRANSACTIONS_PER_PAGE = 20
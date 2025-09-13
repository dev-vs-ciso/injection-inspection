"""
Configuration settings for the Banking Application
Supports SQLite3 (default), PostgreSQL, and SQL Server databases
"""
import os
from datetime import timedelta

class Config:
    """Base configuration class with default settings"""
    
    # Flask settings
    # SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(32).hex()
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-for-development-only'

    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)
    
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '5432')
    DB_NAME = os.environ.get('DB_NAME', 'banking')
    DB_USER = os.environ.get('DB_USER', 'postgres')
    DB_PASS = os.environ.get('DB_PASS', 'password')
    SQLALCHEMY_DATABASE_URI = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    
    # SQLAlchemy settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Set to True for SQL debugging
    
    # Edge computing optimizations
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_timeout': 20,
        'pool_recycle': 300,  # 5 minutes - good for edge scenarios
        'pool_pre_ping': True,  # Verify connections before use
    }

    # Application settings
    BANK_NAME = "Kerata-Zemke"
    TRANSACTIONS_PER_PAGE = 20

    # Edge-specific settings
    EDGE_MODE = os.environ.get('EDGE_MODE', 'False').lower() == 'true'
    EDGE_CACHE_TIMEOUT = int(os.environ.get('EDGE_CACHE_TIMEOUT', '300'))  # 5 minutes default
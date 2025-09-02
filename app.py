"""
Main Flask application for Banking Security Training
Initializes the Flask app with all necessary components
"""
from flask import Flask
from flask_login import LoginManager
from flask_migrate import Migrate
from config import Config
from models import db, init_database, User
import os
from dotenv import load_dotenv

from application.errors import register_error_handlers
from application.home import index, dashboard
from application.user import login, logout, profile
from application.api import api_stats
from application.transaction import transaction_detail, search, export_transactions, download_export_file
# Load environment variables
load_dotenv()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Cookies session security configurations
    app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access to session cookie
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Strict SameSite policy - has to be lax so Gsuite redirects work on Firefox and 
    if os.getenv("LOCAL_TEST") == 'True':
        app.config['SESSION_COOKIE_SECURE'] = False  # Local cookie is not over secure protocol, needed for Safari.
    else:
        app.config['SESSION_COOKIE_SECURE'] = True  # Local cookie is not over secure protocol, needed for Safari.


    db.init_app(app)

    # Initialize database
    # db = SQLAlchemy(app)

    # Initialize Flask-Migrate
    migrate = Migrate(app, db)

    # Initialize extensions
    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        """Load user by ID for Flask-Login"""
        return User.query.get(int(user_id))

    # Template filters
    @app.template_filter('currency')
    def currency_format(value):
        """Format decimal values as currency"""
        if value is None:
            return "$0.00"
        return f"${value:,.2f}"

    @app.template_filter('datetime')
    def datetime_format(value, format='%Y-%m-%d %H:%M'):
        """Format datetime values"""
        if value is None:
            return ""
        return value.strftime(format)

    # Context processors for global template variables
    @app.context_processor
    def inject_config():
        """Make config available in all templates"""
        return dict(
            BANK_NAME=app.config['BANK_NAME']
        )

    # First register the error handlers for nice error messages
    register_error_handlers(app)

    # Create home routes
    app.add_url_rule('/', 'index', index)
    app.add_url_rule('/dashboard', 'dashboard', dashboard)


    # Create user routes
    app.add_url_rule('/login', 'login', login, methods=['GET', 'POST'])
    app.add_url_rule('/logout', 'logout', logout)
    app.add_url_rule('/profile', 'profile', profile)


    # Create transaction routes
    app.add_url_rule('/transaction/<int:transaction_id>', 'transaction_detail', transaction_detail)
    app.add_url_rule('/search', 'search', search, methods=['GET', 'POST'])
    app.add_url_rule('/export', 'export_transactions', export_transactions, methods=['GET', 'POST'])
    app.add_url_rule('/export/download', 'download_export_file', download_export_file, methods=['GET'])

    # Create api routes
    app.add_url_rule('/api/stats', 'api_stats', api_stats)
    
    return app


# Now start the main application
if __name__ == '__main__':
    app = create_app()
    # Convert the DEBUG environment variable to a boolean
    # Flask's app.run(debug=...) expects a boolean value, but environment variables 
    # are typically strings. This code converts the DEBUG variable to a boolean.
    # It checks if the DEBUG variable is set to "true", "1", or "t" (case-insensitive).
    # If no DEBUG variable is set, it defaults to "False".
    if os.getenv("DB_HOST"):
        debuglevel = False
    else:
        debuglevel = True
    app.run(host='0.0.0.0', port=5000, debug=debuglevel)
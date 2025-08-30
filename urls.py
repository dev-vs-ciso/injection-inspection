"""
URL routes and view functions for the Banking Application
Handles all user interactions and page rendering
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, current_user
from datetime import datetime, timedelta
from sqlalchemy import or_, and_
from models import db, User, Transaction, get_database_stats
from decorators import login_required, anonymous_required, active_user_required

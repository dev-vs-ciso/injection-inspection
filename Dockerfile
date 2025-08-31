# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# # Install system dependencies for database drivers
# RUN apt-get update && apt-get install -y \
#     gcc \
#     g++ \
#     unixodbc-dev \
#     curl \
#     gnupg \
#     && rm -rf /var/lib/apt/lists/*

# # Install Microsoft ODBC Driver for SQL Server
# RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
#     && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
#     && apt-get update \
#     && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
#     && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 bankapp && chown -R bankapp:bankapp /app
USER bankapp

# Set environment variables
ENV FLASK_APP=app.py
ENV PYTHONPATH=/app

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/ || exit 1

# Default command
CMD ["python", "app.py"]
# Banking Security Training Application - .NET Version

This is a comprehensive .NET Core MVC application equivalent to the Python Flask version, designed for security training and vulnerability assessment. It contains intentional security vulnerabilities for educational purposes.

## ⚠️ **SECURITY WARNING**
**THIS APPLICATION CONTAINS INTENTIONAL SECURITY VULNERABILITIES**
- Do NOT use in production environments
- Only for training and educational purposes
- Contains SQL injection, XSS, and command injection vulnerabilities

## 🏗️ Architecture

- **Framework**: ASP.NET Core 8.0 MVC
- **Database**: PostgreSQL with Entity Framework Core
- **Authentication**: Cookie-based authentication 
- **UI**: Bootstrap 5 with Razor views
- **Vulnerabilities**: SQL injection, XSS, command injection, template injection

## 📁 Project Structure

```
dotnet/
├── Controllers/           # MVC Controllers (equivalent to Python routes)
│   ├── HomeController.cs     # Dashboard and main pages
│   ├── UserController.cs     # Authentication and user management
│   ├── TransactionController.cs # Transaction management with SQL injection
│   ├── FeedbackController.cs    # Customer feedback with XSS vulnerabilities
│   ├── AIController.cs          # AI features with prompt injection
│   └── APIController.cs         # REST API with command injection
├── Models/               # Data models (equivalent to Python models.py)
│   ├── User.cs             # User entity
│   ├── Transaction.cs      # Transaction entity
│   └── Feedback.cs         # Feedback entity
├── Views/                # Razor views (equivalent to Python templates)
│   ├── Shared/            # Layout templates
│   ├── Home/              # Dashboard views
│   ├── User/              # Authentication views
│   ├── Transaction/       # Transaction management views
│   ├── Feedback/          # Feedback views
│   └── AI/                # AI feature views
├── Data/                 # Entity Framework DbContext
├── Services/             # Business logic services
├── Filters/              # Authentication filters (equivalent to Python decorators)
├── Program.cs            # Application startup
└── PopulateDatabase.cs   # Database seeding tool
```

## 🚀 Quick Start

### Prerequisites
- .NET 8.0 SDK
- PostgreSQL database (configured externally)
- Docker (optional, for containerized setup)

### Environment Setup

1. **Clone and navigate to the .NET application:**
   ```bash
   cd dotnet/
   ```

2. **Install dependencies:**
   ```bash
   dotnet restore
   ```

3. **Configure database connection:**
   
   **Option A: Using .env file (recommended for development)**
   ```bash
   # Edit the .env file in the project root
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=banking
   DB_USER=postgres
   DB_PASS=your_password
   ```

   **Option B: Using appsettings.json**
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=your_host;Port=5432;Database=banking;Username=your_user;Password=your_password"
     }
   }
   ```

   **Option C: Using environment variables**
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=banking  
   export DB_USER=postgres
   export DB_PASS=your_password
   ```

   **Configuration Precedence (highest to lowest):**
   1. Command line arguments
   2. Environment variables  
   3. appsettings.{Environment}.json
   4. appsettings.json
   5. .env file

4. **Start the application:**
   ```bash
   dotnet run
   ```

5. **Access the application:**
   - Open browser to `http://localhost:4000`
   - Database setup and population handled externally

## 🔐 Test Accounts

Database setup and test account creation handled externally.
Refer to external setup documentation for available test accounts.

## 🎯 Security Training Features

### 1. SQL Injection Vulnerabilities
**Location**: `UserController.cs`, `TransactionController.cs`

- **Login bypass**: Try email `' OR '1'='1' --`
- **Advanced search**: Multiple injection points in search filters
- **User authentication**: Vulnerable MD5 password hashing

### 2. Cross-Site Scripting (XSS)
**Location**: `FeedbackController.cs` and feedback views

- **Stored XSS**: Submit feedback with HTML/JavaScript
- **Reflected XSS**: Various input fields without sanitization
- **Sample payload**: `<script>alert('XSS')</script>`

### 3. Command Injection
**Location**: `APIController.cs`, `TransactionController.cs`

- **File operations**: Export functionality with unsafe filename handling
- **API endpoints**: Partner transaction processing
- **Sample payload**: `; whoami ; #`

### 4. Template Injection
**Location**: `TransactionController.cs`

- **DotLiquid templates**: User notes processed as templates
- **Sample payload**: `{{ 'whoami' | shell }}`

### 5. Insecure Direct Object References (IDOR)
**Location**: `FeedbackController.cs`

- Access other users' feedback: `/Feedback/ByUser/2`
- Modify user IDs in URLs to access unauthorized data

## 🛠️ Development and Testing

### Running Tests
```bash
# Unit tests (if implemented)
dotnet test

# Manual security testing
# Use tools like OWASP ZAP, Burp Suite, or manual exploitation
```

### Database Management
```bash
# Database setup handled externally
# Refer to external documentation for:
# - Database schema creation
# - Test data population
# - User account setup

# Entity Framework migrations (if schema changes)
dotnet ef migrations add "MigrationName"
dotnet ef database update
```

### Code Analysis
```bash
# Security analysis
dotnet-sonarscanner begin /k:"banking-security-dotnet"
dotnet build
dotnet-sonarscanner end
```

## 🔄 Equivalence to Python Version

| Python Component | .NET Equivalent | Notes |
|------------------|-----------------|-------|
| Flask app | ASP.NET Core MVC | Same routing structure |
| Jinja2 templates | Razor views | Identical UI layout |
| SQLAlchemy ORM | Entity Framework Core | Similar model definitions |
| Flask decorators | Action filters | Same authentication logic |
| Python routes | Controller actions | Identical functionality |
| Werkzeug | Kestrel | Web server differences |

## 📚 Educational Objectives

1. **Understand .NET security patterns**
2. **Compare vulnerability types across languages**
3. **Learn Entity Framework security best practices**
4. **Practice secure coding in C#**
5. **Explore ASP.NET Core security features**

## 🐳 Docker Support

```dockerfile
# Build the application
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet build -c Release -o /app/build

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/build .
EXPOSE 80
ENTRYPOINT ["dotnet", "BankingApp.dll"]
```

## 🤝 Contributing

1. Maintain equivalence with Python version
2. Keep intentional vulnerabilities for training
3. Document new security patterns
4. Follow .NET coding standards
5. Update both README files when making changes

## 📄 License

This project is for educational purposes only. See LICENSE file for details.

## ⚠️ Final Security Reminder

**This application is deliberately vulnerable and should never be deployed to production environments. It is designed exclusively for security training and educational purposes.**

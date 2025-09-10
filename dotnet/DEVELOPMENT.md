# .NET Banking Application - Development Guide

## Development Environment Setup

### Prerequisites
- .NET 8.0 SDK
- PostgreSQL 14+ 
- Visual Studio 2022 or VS Code
- Git

### IDE Configuration

#### Visual Studio 2022
1. Install "ASP.NET and web development" workload
2. Install "Data storage and processing" workload  
3. Install PostgreSQL tools extension
4. Configure debugging for multiple startup projects

#### VS Code
Required extensions:
- C# Dev Kit
- .NET Extension Pack
- PostgreSQL Explorer
- Thunder Client (for API testing)

### Local Development Setup

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd injection-inspection/dotnet
   ```

2. **Environment Configuration:**
   
   **Option A: Using .env file (recommended for development)**
   The application automatically loads a `.env` file if present:
   ```bash
   # .env file in project root
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=banking_dev
   DB_USER=postgres
   DB_PASS=dev_password
   ASPNETCORE_ENVIRONMENT=Development
   LOCAL_TEST=True
   ```

   **Option B: Create appsettings.Development.json:**
   ```json
   {
     "Logging": {
       "LogLevel": {
         "Default": "Debug",
         "Microsoft.AspNetCore": "Warning",
         "Microsoft.EntityFrameworkCore": "Information"
       }
     },
     "ConnectionStrings": {
       "DefaultConnection": "Host=localhost;Port=5432;Database=banking_dev;Username=postgres;Password=dev_password"
     },
     "AllowedHosts": "*"
   }
   ```

3. **Database Setup:**
   ```bash
   # PostgreSQL setup handled externally
   # Ensure database and tables are created before running the application
   # Refer to external setup documentation
   ```

4. **Run application:**
   ```bash
   dotnet run --environment Development
   ```

## Project Architecture

### MVC Pattern Implementation

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP Request
                   ▼
┌─────────────────────────────────────────────────────┐
│                Controller                           │
│  • Route handling                                   │
│  • Input validation                                 │
│  • Authentication                                   │
│  • Business logic coordination                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                   Model                             │
│  • Data entities (User, Transaction, Feedback)     │
│  • Business rules                                   │
│  • Entity Framework DbContext                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                   View                              │
│  • Razor templates                                  │
│  • Client-side JavaScript                          │
│  • Bootstrap UI components                         │
└─────────────────────────────────────────────────────┘
```

### Security Layer Integration

```
Request → Authentication Filter → Authorization Filter → Controller Action → Response
    ↓           ↓                      ↓                    ↓              ↓
Session    LoginRequired         ActiveUser         SQL Injection    XSS Output
Handling   Verification          Verification       Vulnerability    Vulnerability
```

## Vulnerability Implementation Details

### 1. SQL Injection Patterns

**Safe Pattern (don't implement):**
```csharp
// DON'T DO THIS - This is secure
var user = await _context.Users
    .Where(u => u.Email == email && u.Password == hashedPassword)
    .FirstOrDefaultAsync();
```

**Vulnerable Pattern (intentionally implemented):**
```csharp
// VULNERABLE - For training purposes
var query = $"SELECT * FROM Users WHERE Email = '{email}' AND Password = '{password}'";
var users = _context.Users.FromSqlRaw(query).ToList();
```

**PostgreSQL-specific considerations:**
- Use double quotes for identifiers: `"Users"`
- String escaping: `'` becomes `''`
- Comment syntax: `--` for single line

### 2. XSS Vulnerability Patterns

**Stored XSS in Feedback:**
```csharp
// VULNERABLE - Direct storage without sanitization
feedback.Message = Request.Form["message"]; // Contains <script> tags
await _context.SaveChangesAsync();
```

**Reflected XSS in Search:**
```csharp
// VULNERABLE - Direct output without encoding
ViewBag.SearchTerm = Request.Query["search"]; // Outputs raw HTML
```

**Template Injection:**
```csharp
// VULNERABLE - User input processed as template
var template = Template.Parse(userInput);
var result = template.Render(Hash.FromAnonymousObject(data));
```

### 3. Authentication Bypass Techniques

**MD5 Hash Vulnerability:**
```csharp
// VULNERABLE - Weak hashing algorithm
public void SetPassword(string password)
{
    using (var md5 = MD5.Create())
    {
        var hash = md5.ComputeHash(Encoding.UTF8.GetBytes(password));
        Password = Convert.ToHexString(hash).ToLower();
    }
}
```

## Database Entity Relationships

```
┌─────────────────┐    1:N     ┌─────────────────┐
│      User       │────────────│   Transaction   │
│  • Id           │            │  • Id           │
│  • Email        │            │  • UserId (FK)  │
│  • Password     │            │  • Amount       │
│  • IsActive     │            │  • Date         │
└─────────────────┘            └─────────────────┘
         │                              
         │ 1:N                          
         ▼                              
┌─────────────────┐                     
│    Feedback     │                     
│  • Id           │                     
│  • UserId (FK)  │                     
│  • Message      │                     
│  • CreatedAt    │                     
└─────────────────┘                     
```

## Testing Strategy

### Unit Testing
```bash
# Create test project
dotnet new mstest -n BankingApp.Tests
dotnet add BankingApp.Tests reference BankingApp

# Test vulnerable methods
[TestMethod]
public void SqlInjection_Should_Allow_Bypass()
{
    // Test that injection payload bypasses authentication
}
```

### Security Testing
```bash
# Manual testing with curl
curl -X POST http://localhost:5000/User/Login \
  -d "email='OR'1'='1'--&password=anything"

# Automated testing with OWASP ZAP
zap-cli quick-scan http://localhost:5000
```

### Performance Testing
```bash
# Load testing with NBomber
dotnet add package NBomber
# Create scenarios for concurrent users
```

## Deployment Considerations

### Development
```bash
dotnet run --environment Development
```

### Staging  
```bash
dotnet publish -c Release -o ./publish
dotnet ./publish/BankingApp.dll --environment Staging
```

### Production (Educational Only)
```bash
# DON'T DEPLOY TO REAL PRODUCTION
# This is for controlled training environments only
```

## Common Development Issues

### Entity Framework Issues
```bash
# Connection string problems
# Solution: Check PostgreSQL service status
systemctl status postgresql

# Migration issues  
# Solution: Reset database
dotnet ef database drop --force
dotnet ef database update
```

### Authentication Issues
```bash
# Cookie authentication not working
# Solution: Check cookie configuration in Program.cs
services.ConfigureApplicationCookie(options => {
    options.LoginPath = "/User/Login";
    options.LogoutPath = "/User/Logout";
});
```

### PostgreSQL Specific Issues
```bash
# Connection timeouts
# Solution: Increase connection timeout in connection string
"CommandTimeout=30;ConnectionIdleLifetime=300"
```

## Code Quality Standards

### Security (Deliberately Vulnerable)
- ✅ Implement known vulnerabilities for training
- ✅ Document each vulnerability type
- ✅ Provide secure alternative examples in comments
- ❌ Don't accidentally fix vulnerabilities

### Code Style
```csharp
// Use proper naming conventions
public class UserController : Controller  // PascalCase
{
    private readonly BankingDbContext _context; // camelCase with underscore
    
    // Async methods should end with Async
    public async Task<IActionResult> LoginAsync()
    {
        // Implementation
    }
}
```

### Documentation
- XML comments for public APIs
- Inline comments explaining vulnerabilities
- README updates for new features
- Security training notes

## Debugging Tips

### SQL Injection Debugging
```csharp
// Add logging to see executed queries
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information)
              .EnableSensitiveDataLogging(); // Shows parameter values
}
```

### Authentication Debugging
```csharp
// Log authentication events
services.AddAuthentication()
    .AddCookie(options => {
        options.Events.OnRedirectToLogin = context => {
            _logger.LogInformation($"Redirecting to login: {context.Request.Path}");
            return Task.CompletedTask;
        };
    });
```

### XSS Debugging
```html
<!-- View debugging - check raw output -->
@{
    ViewData["Title"] = "Debug";
}
<pre>
Raw input: @ViewBag.RawInput
HTML encoded: @Html.Encode(ViewBag.RawInput) 
</pre>
```

This development guide ensures consistent implementation of the vulnerable banking application while maintaining professional development practices for educational purposes.

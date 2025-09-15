using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using InjectionInspection.Data;
using DotNetEnv;

// Load .env file
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Override configuration with .env values
builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
{
    ["ConnectionStrings:DefaultConnection"] = $"Host={Environment.GetEnvironmentVariable("DB_HOST")};Database={Environment.GetEnvironmentVariable("DB_NAME")};Username={Environment.GetEnvironmentVariable("DB_USER")};Password={Environment.GetEnvironmentVariable("DB_PASS")}",
    ["BankSettings:BankName"] = Environment.GetEnvironmentVariable("BANK_NAME") ?? "SecureBank Training",
    ["BankSettings:EnableVulnerabilities"] = "true",
    ["BankSettings:TransactionsPerPage"] = Environment.GetEnvironmentVariable("TRANSACTIONS_PER_PAGE") ?? "20",
    ["BankSettings:Debug"] = Environment.GetEnvironmentVariable("DEBUG") ?? "true"
});

// Add services to the container
builder.Services.AddControllersWithViews()
    .AddRazorRuntimeCompilation(); // Enable runtime compilation for development

// Configure Entity Framework with PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? 
    $"Host={Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost"};Database={Environment.GetEnvironmentVariable("DB_NAME") ?? "banking"};Username={Environment.GetEnvironmentVariable("DB_USER") ?? "bankuser"};Password={Environment.GetEnvironmentVariable("DB_PASS") ?? "bankpass"}";

// Configure Npgsql to handle DateTime as UTC
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

builder.Services.AddDbContext<BankingDbContext>(options =>
{
    options.UseNpgsql(connectionString);
    
    // Enable sensitive data logging for development (security training)
    var debugMode = Environment.GetEnvironmentVariable("DEBUG")?.ToLower() == "true";
    if (builder.Environment.IsDevelopment() || debugMode)
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// Configure Authentication
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login";
        options.LogoutPath = "/Account/Logout";
        options.AccessDeniedPath = "/Account/AccessDenied";
        options.ExpireTimeSpan = TimeSpan.FromHours(24);
        options.SlidingExpiration = true;
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.None; // Allow HTTP for training
        options.Cookie.SameSite = SameSiteMode.Lax;
    });

// Configure Session
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// Configure HTTP client for AI services
builder.Services.AddHttpClient();

var app = builder.Build();

// Configure the HTTP request pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // Removed HSTS for security training environment
}

// Removed HTTPS redirection for training environment
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();
app.UseSession();

// Configure routes
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// Additional routes for banking functionality
app.MapControllerRoute(
    name: "transaction",
    pattern: "transaction/{action=Index}/{id?}",
    defaults: new { controller = "Transaction" });

app.MapControllerRoute(
    name: "feedback",
    pattern: "feedback/{action=Index}/{id?}",
    defaults: new { controller = "Feedback" });

app.MapControllerRoute(
    name: "api",
    pattern: "api/{action=Index}",
    defaults: new { controller = "Api" });

app.MapControllerRoute(
    name: "ai",
    pattern: "ai/{action=Index}",
    defaults: new { controller = "AI" });

// Ensure database is created and seeded
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BankingDbContext>();
    try
    {
        await context.Database.EnsureCreatedAsync();
        Console.WriteLine("Database initialized successfully");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database initialization error: {ex.Message}");
    }
}

// Configure to run on port 4000 (HTTP primary for training)
app.Urls.Add("http://localhost:4000");
app.Urls.Add("https://localhost:4001"); // Secondary HTTPS option

app.Run();
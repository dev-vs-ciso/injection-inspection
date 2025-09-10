using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using BankingApp.Data;
using DotNetEnv;

// Load .env file if it exists
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllersWithViews();

// Configure Entity Framework with PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? GetPostgreSQLConnectionString();

builder.Services.AddDbContext<BankingDbContext>(options =>
    options.UseNpgsql(connectionString));

// Configure Authentication
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/User/Login";
        options.LogoutPath = "/User/Logout";
        options.AccessDeniedPath = "/User/Login";
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
        options.SlidingExpiration = true;
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        
        // Set secure cookies based on environment
        var isLocalTest = Environment.GetEnvironmentVariable("LOCAL_TEST") == "True";
        options.Cookie.SecurePolicy = isLocalTest ? CookieSecurePolicy.None : CookieSecurePolicy.Always;
    });

// Configure Session
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// Configure HttpClient for AI services
builder.Services.AddHttpClient();

// Add support for TempData
builder.Services.AddSingleton<Microsoft.AspNetCore.Mvc.ViewFeatures.ITempDataProvider,
    Microsoft.AspNetCore.Mvc.ViewFeatures.CookieTempDataProvider>();

var app = builder.Build();

// Configure port 4000
if (!app.Environment.IsDevelopment())
{
    app.Urls.Add("http://*:4000");
    app.Urls.Add("https://*:4001");
}
else
{
    // Development uses port 4000 as well for consistency
    app.Urls.Add("http://localhost:4000");
}

// Configure the HTTP request pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();
app.UseSession();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// Specific routes to match Python Flask application
app.MapControllerRoute(
    name: "dashboard",
    pattern: "dashboard",
    defaults: new { controller = "Home", action = "Dashboard" });

app.MapControllerRoute(
    name: "transaction_detail",
    pattern: "transaction/{id}",
    defaults: new { controller = "Transaction", action = "Detail" });

app.MapControllerRoute(
    name: "feedback_detail",
    pattern: "feedback/{id}",
    defaults: new { controller = "Feedback", action = "Detail" });

app.MapControllerRoute(
    name: "feedback_by_user",
    pattern: "feedback/user/{userId}",
    defaults: new { controller = "Feedback", action = "ByUser" });

app.MapControllerRoute(
    name: "ai_research",
    pattern: "ai/research",
    defaults: new { controller = "AI", action = "Research" });

app.MapControllerRoute(
    name: "ai_loan_advisor",
    pattern: "ai/loan-advisor",
    defaults: new { controller = "AI", action = "LoanAdvisor" });

app.Run();

/// <summary>
/// Generate PostgreSQL connection string from environment variables
/// Equivalent to Config class in Python config.py
/// </summary>
static string GetPostgreSQLConnectionString()
{
    var dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
    var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
    var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "banking";
    var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
    var dbPass = Environment.GetEnvironmentVariable("DB_PASS") ?? "password";
    
    return $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPass}";
}

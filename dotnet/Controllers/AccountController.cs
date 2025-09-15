using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using InjectionInspection.Data;
using InjectionInspection.Models;

namespace InjectionInspection.Controllers
{
    /// <summary>
    /// Account controller with intentionally vulnerable authentication for security training
    /// Replicates the Python Flask authentication vulnerabilities exactly
    /// </summary>
    public class AccountController : Controller
    {
        private readonly BankingDbContext _context;
        private readonly ILogger<AccountController> _logger;
        private readonly IConfiguration _configuration;

        public AccountController(BankingDbContext context, ILogger<AccountController> logger, IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpGet]
        public IActionResult Login()
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                return RedirectToAction("Dashboard", "Home");
            }
            
            ViewBag.BankName = _configuration["BankSettings:BankName"] ?? "SecureBank Training";
            return View();
        }

        /// <summary>
        /// VULNERABLE: Login with SQL injection vulnerability
        /// Replicates the Python Flask vulnerable login exactly
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Login(string email, string password, bool rememberMe = false)
        {
            try
            {
                if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                {
                    ViewBag.Error = "Please enter both email and password.";
                    return View();
                }

                // VULNERABLE: Direct SQL injection - matches Python implementation
                var vulnerableQuery = $"SELECT * FROM users WHERE (email = '{email}' AND password_hash = '{password}') OR (email = '{email}')";
                
                _logger.LogWarning("Executing vulnerable SQL: {Query}", vulnerableQuery);
                
                var results = await _context.ExecuteVulnerableQueryDynamic(vulnerableQuery);
                
                if (results.Any())
                {
                    var userData = results.First();
                    var userId = Convert.ToInt32(userData["id"]);
                    
                    // Load the full user object
                    var user = await _context.Users.FindAsync(userId);
                    
                    if (user != null && user.CanLogin())
                    {
                        // Create authentication claims
                        var claims = new List<Claim>
                        {
                            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                            new Claim(ClaimTypes.Name, user.GetFullName()),
                            new Claim(ClaimTypes.Email, user.Email),
                            new Claim("AccountNumber", user.AccountNumber)
                        };

                        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                        var authProperties = new AuthenticationProperties
                        {
                            IsPersistent = rememberMe,
                            ExpiresUtc = DateTimeOffset.UtcNow.AddDays(rememberMe ? 30 : 1)
                        };

                        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, 
                            new ClaimsPrincipal(claimsIdentity), authProperties);

                        // Update user login tracking
                        user.ResetLoginAttempts();
                        await _context.SaveChangesAsync();

                        _logger.LogInformation("User {Email} logged in successfully", user.Email);
                        
                        return RedirectToAction("Dashboard", "Home");
                    }
                    else
                    {
                        ViewBag.Error = "Account is locked due to too many failed login attempts.";
                    }
                }
                else
                {
                    // Check if user exists to increment login attempts (safe query)
                    var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                    if (existingUser != null)
                    {
                        existingUser.RecordLoginAttempt();
                        await _context.SaveChangesAsync();
                    }
                    
                    ViewBag.Error = "Invalid email or password.";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login error for email: {Email}", email);
                ViewBag.Error = "An error occurred during login. Please try again.";
            }

            return View();
        }

        /// <summary>
        /// SECURE: Proper authentication method (commented for training)
        /// Shows how login should be implemented securely
        /// </summary>
        // [HttpPost]
        // public async Task<IActionResult> SecureLogin(string email, string password, bool rememberMe = false)
        // {
        //     var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        //     
        //     if (user != null && user.CanLogin() && BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        //     {
        //         // Create authentication and redirect
        //         // ... secure implementation
        //     }
        //     
        //     ViewBag.Error = "Invalid credentials";
        //     return View();
        // }

        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            _logger.LogInformation("User logged out");
            TempData["Message"] = "You have been successfully logged out.";
            return RedirectToAction("Index", "Home");
        }

        [HttpPost]
        public async Task<IActionResult> LogoutPost()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            _logger.LogInformation("User logged out");
            TempData["Message"] = "You have been successfully logged out.";
            return RedirectToAction("Index", "Home");
        }

        [HttpGet]
        public IActionResult AccessDenied()
        {
            return View();
        }
    }
}
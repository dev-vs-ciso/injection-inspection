using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BankingApp.Data;
using BankingApp.Models;
using BankingApp.Filters;
using Newtonsoft.Json;

namespace BankingApp.Controllers
{
    /// <summary>
    /// User controller handling authentication and user profile functionality
    /// Equivalent to user.py routes in Python application
    /// Contains VULNERABLE authentication methods for training purposes
    /// </summary>
    public class UserController : Controller
    {
        private readonly BankingDbContext _context;

        public UserController(BankingDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// User login page and authentication handler
        /// GET: Show login form
        /// POST: Process login attempt using vulnerable authentication by default
        /// Equivalent to login() function in Python user.py
        /// </summary>
        [HttpGet]
        [AnonymousRequired]
        public IActionResult Login()
        {
            return View();
        }

        [HttpPost]
        [AnonymousRequired]
        [RateLimitLogin(5, 15)]
        public async Task<IActionResult> Login(string email, string password, bool rememberMe = false)
        {
            // Basic validation
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                TempData["Message"] = "Please provide both email and password.";
                TempData["MessageType"] = "error";
                return View();
            }

            try
            {
                // Use vulnerable login method by default (for training purposes)
                var user = await _VulnerableLoginCheck(email, password);

                if (user != null)
                {
                    // Create authentication claims
                    var claims = new List<Claim>
                    {
                        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                        new Claim(ClaimTypes.Email, user.Email),
                        new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
                        new Claim(ClaimTypes.Role, user.Role)
                    };

                    var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                    var claimsPrincipal = new ClaimsPrincipal(claimsIdentity);

                    var authProperties = new AuthenticationProperties
                    {
                        IsPersistent = rememberMe,
                        ExpiresUtc = DateTimeOffset.UtcNow.AddHours(rememberMe ? 24 : 2)
                    };

                    await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, claimsPrincipal, authProperties);

                    // Log successful login attempt
                    Console.WriteLine($"Successful login for user: {user.Email}");

                    return RedirectToAction("Index", "Home");
                }
                else
                {
                    TempData["Message"] = "Invalid email or password.";
                    TempData["MessageType"] = "error";
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Login error: {ex.Message}");
                TempData["Message"] = "An error occurred during login. Please try again.";
                TempData["MessageType"] = "error";
            }

            return View();
        }

        /// <summary>
        /// INTENTIONALLY VULNERABLE login method for training purposes
        /// Uses raw SQL injection vulnerability - equivalent to Python version
        /// This method deliberately bypasses proper authentication for educational purposes
        /// </summary>
        private async Task<User?> _VulnerableLoginCheck(string email, string password)
        {
            try
            {
                // Debug logging for troubleshooting
                Console.WriteLine($"DEBUG: Starting login attempt for email: {email}");
                Console.WriteLine($"DEBUG: Password received: {password}");

                // Hash the password using MD5 (vulnerable - for training purposes)
                var passwordHash = ComputeMD5Hash(password);
                Console.WriteLine($"DEBUG: Password hash (MD5): {passwordHash}");

                // VULNERABLE SQL query - allows SQL injection
                var vulnerableQuery = $"SELECT \"Id\", \"Email\", \"PasswordHash\", \"FirstName\", \"LastName\", \"AccountNumber\", \"Balance\", \"CreatedAt\", \"IsActive\", \"Role\" FROM \"Users\" WHERE (\"Email\" = '{email}' AND \"PasswordHash\" = '{passwordHash}') OR (\"Email\" = '{email}')";
                Console.WriteLine($"DEBUG: Executing SQL query: {vulnerableQuery}");

                using var connection = _context.Database.GetDbConnection();
                if (connection.State != System.Data.ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }
                Console.WriteLine($"DEBUG: Database connection opened successfully");

                using var command = connection.CreateCommand();
                command.CommandText = vulnerableQuery;

                using var reader = await command.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    Console.WriteLine($"DEBUG: User found in database");
                    
                    var user = new User
                    {
                        Id = reader.GetInt32(0), // Id
                        Email = reader.GetString(1), // Email
                        PasswordHash = reader.GetString(2), // PasswordHash
                        FirstName = reader.GetString(3), // FirstName
                        LastName = reader.GetString(4), // LastName
                        AccountNumber = reader.GetString(5), // AccountNumber
                        Balance = reader.GetDecimal(6), // Balance
                        CreatedAt = reader.GetDateTime(7), // CreatedAt
                        IsActive = reader.GetBoolean(8), // IsActive
                        Role = reader.GetString(9) // Role
                    };

                    Console.WriteLine($"DEBUG: Login successful for {user.Email}");
                    return user;
                }
                else
                {
                    Console.WriteLine($"DEBUG: No user found with provided credentials");
                    return null;
                }
            }
            catch (Exception e)
            {
                Console.WriteLine($"DEBUG: Database error: {e.Message}");
                Console.WriteLine($"DEBUG: Stack trace: {e.StackTrace}");
                return null;
            }
        }

        /// <summary>
        /// Safe login method using Entity Framework ORM
        /// This is the secure alternative but not used by default (for training purposes)
        /// </summary>
        private async Task<User?> _StandardLoginCheck(string email, string password)
        {
            var passwordHash = ComputeMD5Hash(password);
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email && u.PasswordHash == passwordHash && u.IsActive);
            return user;
        }

        /// <summary>
        /// Compute MD5 hash - VULNERABLE method for training purposes
        /// </summary>
        private string ComputeMD5Hash(string input)
        {
            using var md5 = MD5.Create();
            var inputBytes = Encoding.UTF8.GetBytes(input);
            var hashBytes = md5.ComputeHash(inputBytes);
            return Convert.ToHexString(hashBytes).ToLower();
        }

        /// <summary>
        /// User logout functionality
        /// Equivalent to logout() function in Python user.py
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Index", "Home");
        }

        /// <summary>
        /// User profile page displaying account information
        /// Equivalent to profile() function in Python user.py
        /// </summary>
        [HttpGet]
        [LoginRequired]
        public IActionResult Profile()
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUser = _context.Users.Find(currentUserId);

            if (currentUser == null)
            {
                return RedirectToAction("Login");
            }

            // Get user statistics
            var transactionCount = _context.Transactions
                .Where(t => t.UserId == currentUser.Id)
                .Count();

            var firstTransaction = _context.Transactions
                .Where(t => t.UserId == currentUser.Id)
                .OrderBy(t => t.Date)
                .FirstOrDefault();

            var lastTransaction = _context.Transactions
                .Where(t => t.UserId == currentUser.Id)
                .OrderByDescending(t => t.Date)
                .FirstOrDefault();

            var viewModel = new
            {
                User = currentUser,
                TransactionCount = transactionCount,
                FirstTransaction = firstTransaction,
                LastTransaction = lastTransaction,
                AccountAge = (DateTime.UtcNow - currentUser.CreatedAt).Days,
                FormattedAccountNumber = currentUser.AccountNumber.Insert(4, "-").Insert(9, "-"),
                BalanceFormatted = currentUser.Balance.ToString("C")
            };

            return View(viewModel);
        }

        /// <summary>
        /// User preferences page with template injection vulnerability
        /// Equivalent to preferences() function in Python user.py
        /// Contains VULNERABLE template processing for training purposes
        /// </summary>
        [HttpGet]
        [LoginRequired]
        public IActionResult Preferences()
        {
            var customConfig = HttpContext.Session.GetString("CustomConfig");
            var standardPrefs = HttpContext.Session.GetString("StandardPreferences");

            var viewModel = new
            {
                CustomConfig = customConfig,
                StandardPreferences = standardPrefs,
                AvailableThemes = new[] { "light", "dark", "auto" },
                AvailableDashboardLayouts = new[] { "grid", "list", "cards" },
                AvailableWidgets = new[] { 
                    "recent_transactions", 
                    "account_summary", 
                    "quick_transfer", 
                    "alerts", 
                    "spending_chart" 
                }
            };

            return View(viewModel);
        }

        /// <summary>
        /// Process preferences form submission with template injection vulnerability
        /// Contains VULNERABLE template processing via DotLiquid for training purposes
        /// </summary>
        [HttpPost]
        [LoginRequired]
        public IActionResult Preferences(string dashboardLayout, string theme, string[] widgets, string customConfig)
        {
            // Process standard preferences
            var standardPreferences = new
            {
                DashboardLayout = dashboardLayout ?? "grid",
                Theme = theme ?? "light", 
                Widgets = widgets ?? new string[0]
            };

            HttpContext.Session.SetString("StandardPreferences", JsonConvert.SerializeObject(standardPreferences));

            // Process custom configuration (VULNERABLE to template injection)
            if (!string.IsNullOrEmpty(customConfig))
            {
                try
                {
                    // VULNERABLE: Process user input through template engine without sanitization
                    // This allows template injection attacks for training purposes
                    var template = DotLiquid.Template.Parse(customConfig);
                    var configData = new Dictionary<string, object>();
                    
                    // Add some sample data that could be exploited
                    configData.Add("user_name", User.FindFirst(ClaimTypes.Name)?.Value ?? "");
                    configData.Add("user_email", User.FindFirst(ClaimTypes.Email)?.Value ?? "");
                    configData.Add("current_time", DateTime.Now);
                    configData.Add("server_info", Environment.MachineName);

                    var renderedConfig = template.Render(DotLiquid.Hash.FromDictionary(configData));

                    HttpContext.Session.SetString("CustomConfig", JsonConvert.SerializeObject(configData));

                    TempData["Message"] = $"Custom configuration applied: {configData.Count} settings processed";
                    TempData["MessageType"] = "success";
                }
                catch (Exception ex)
                {
                    TempData["Message"] = $"Template processing error: {ex.Message}";
                    TempData["MessageType"] = "error";
                }
            }

            TempData["Message"] = "Preferences updated successfully!";
            TempData["MessageType"] = "success";

            return RedirectToAction("Preferences");
        }
    }
}

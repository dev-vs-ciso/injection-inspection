using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using InjectionInspection.Data;
using InjectionInspection.Models;
using InjectionInspection.Models.ViewModels;
using System.Security.Claims;

namespace InjectionInspection.Controllers
{
    /// <summary>
    /// Home controller for main dashboard and index page
    /// Replicates the Python Flask home functionality
    /// </summary>
    public class HomeController : Controller
    {
        private readonly BankingDbContext _context;
        private readonly IConfiguration _configuration;

        public HomeController(BankingDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<IActionResult> Index()
        {
            try
            {
                // Calculate bank statistics for the landing page
                var totalUsers = await _context.Users.CountAsync();
                var totalTransactions = await _context.Transactions.CountAsync();
                var totalVolume = await _context.Transactions.SumAsync(t => Math.Abs(t.Amount));
                
                // Calculate current month's volume (from first day of current month)
                var currentMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var monthlyVolume = await _context.Transactions
                    .Where(t => t.Date >= currentMonth)
                    .SumAsync(t => Math.Abs(t.Amount));

                // Calculate average rating from feedback (using Score as rating)
                double averageRating = 0.0;
                try
                {
                    var feedbackCount = await _context.Feedback.CountAsync();
                    if (feedbackCount > 0)
                    {
                        averageRating = await _context.Feedback.AverageAsync(f => (double)f.Score);
                    }
                }
                catch
                {
                    averageRating = 0.0;
                }

                var viewModel = new HomePageViewModel
                {
                    TotalUsers = totalUsers,
                    TotalTransactions = totalTransactions,
                    TotalVolume = totalVolume,
                    MonthlyVolume = monthlyVolume,
                    AverageScore = averageRating,
                    BankName = _configuration["BankSettings:BankName"] ?? "SecureBank Training"
                };
                
                return View(viewModel);
            }
            catch (Exception ex)
            {
                // Log the exception for debugging
                Console.WriteLine($"Error in HomeController.Index: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                
                // Fallback stats if database is not available
                var fallbackViewModel = new HomePageViewModel
                {
                    TotalUsers = 0,
                    TotalTransactions = 0,
                    TotalVolume = 0.0m,
                    MonthlyVolume = 0.0m,
                    AverageScore = 0.0,
                    BankName = _configuration["BankSettings:BankName"] ?? "SecureBank Training"
                };
                
                return View(fallbackViewModel);
            }
        }

        [Authorize]
        public async Task<IActionResult> Dashboard()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var user = await _context.Users
                    .Include(u => u.Transactions)
                    .Include(u => u.FeedbackEntries)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return RedirectToAction("Login", "Account");
                }

                // Calculate dashboard statistics
                var recentTransactions = user.GetRecentTransactions(10);
                var totalCredits = Transaction.GetTotalCredits(user.Transactions);
                var totalDebits = Transaction.GetTotalDebits(user.Transactions);
                var recentActivity = Transaction.GetRecentActivity(user.Transactions, 30);

                var dashboardViewModel = new DashboardViewModel
                {
                    User = user,
                    RecentTransactions = recentTransactions,
                    TotalCredits = totalCredits,
                    TotalDebits = totalDebits,
                    RecentActivityCount = recentActivity.Count,
                    TotalVolume = user.GetTotalVolume(),
                    TransactionCount = user.GetTransactionCount(),
                    BankName = _configuration["BankSettings:BankName"] ?? "SecureBank Training"
                };

                return View(dashboardViewModel);
            }
            catch (Exception)
            {
                // Create a fallback empty dashboard
                var fallbackDashboard = new DashboardViewModel
                {
                    User = new User 
                    { 
                        FirstName = "Unknown", 
                        LastName = "User",
                        Email = "unknown@example.com",
                        AccountNumber = "UNKNOWN",
                        Balance = 0,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = false
                    },
                    BankName = _configuration["BankSettings:BankName"] ?? "SecureBank Training"
                };
                
                ViewBag.Error = "Error loading dashboard data.";
                return View(fallbackDashboard);
            }
        }

        [Authorize]
        public async Task<IActionResult> Profile()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var user = await _context.Users.FindAsync(userId);

                if (user == null)
                {
                    return RedirectToAction("Login", "Account");
                }

                return View(user);
            }
            catch (Exception)
            {
                ViewBag.Error = "Error loading profile.";
                return View();
            }
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View();
        }
    }
}
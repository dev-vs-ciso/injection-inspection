using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;
using BankingApp.Data;
using BankingApp.Models;
using BankingApp.Filters;

namespace BankingApp.Controllers
{
    /// <summary>
    /// Home controller handling main navigation and dashboard functionality
    /// Equivalent to home.py routes in Python application
    /// </summary>
    public class HomeController : Controller
    {
        private readonly BankingDbContext _context;

        public HomeController(BankingDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Main index/landing page
        /// Equivalent to index() function in Python home.py
        /// </summary>
        public IActionResult Index()
        {
            // If user is already logged in, redirect to dashboard
            if (User.Identity?.IsAuthenticated ?? false)
            {
                return RedirectToAction("Dashboard");
            }

            return View();
        }

        /// <summary>
        /// User dashboard showing account overview and recent transactions
        /// Equivalent to dashboard() function in Python home.py
        /// </summary>
        [ActiveUserRequired]
        public IActionResult Dashboard()
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUser = _context.Users.Find(currentUserId);

            if (currentUser == null)
            {
                return RedirectToAction("Login", "User");
            }

            // Get recent transactions
            var recentTransactions = _context.Transactions
                .Where(t => t.UserId == currentUserId)
                .OrderByDescending(t => t.Date)
                .Take(5)
                .ToList();

            // Get account statistics
            var transactionCount = _context.Transactions
                .Where(t => t.UserId == currentUserId)
                .Count();

            var totalCredits = _context.Transactions
                .Where(t => t.UserId == currentUserId && t.TransactionType == "credit")
                .Sum(t => t.Amount);

            var totalDebits = _context.Transactions
                .Where(t => t.UserId == currentUserId && t.TransactionType == "debit")
                .Sum(t => t.Amount);

            // Get recent feedback for display
            var recentFeedback = _context.Feedback
                .OrderByDescending(f => f.CreatedAt)
                .Take(3)
                .ToList();

            var dashboardData = new DashboardViewModel
            {
                CurrentUser = currentUser,
                RecentTransactions = recentTransactions,
                TransactionCount = transactionCount,
                TotalCredits = totalCredits,
                TotalDebits = totalDebits,
                RecentFeedback = recentFeedback
            };

            return View(dashboardData);
        }

        /// <summary>
        /// Error handling page
        /// </summary>
        public IActionResult Error()
        {
            return View();
        }
    }

    /// <summary>
    /// View model for Dashboard page
    /// </summary>
    public class DashboardViewModel
    {
        public User CurrentUser { get; set; } = null!;
        public List<Transaction> RecentTransactions { get; set; } = new();
        public int TransactionCount { get; set; }
        public decimal TotalCredits { get; set; }
        public decimal TotalDebits { get; set; }
        public List<Feedback> RecentFeedback { get; set; } = new();
    }
}

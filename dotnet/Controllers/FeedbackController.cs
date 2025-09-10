using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BankingApp.Data;
using BankingApp.Models;
using BankingApp.Filters;

namespace BankingApp.Controllers
{
    /// <summary>
    /// Feedback controller handling customer feedback functionality
    /// Equivalent to feedback.py routes in Python application
    /// Contains VULNERABLE XSS vulnerabilities for training purposes
    /// </summary>
    public class FeedbackController : Controller
    {
        private readonly BankingDbContext _context;

        public FeedbackController(BankingDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Public feedback list page - shows all feedback entries
        /// Anyone can view this page (no authentication required)
        /// Equivalent to feedback_list() function in Python
        /// </summary>
        public async Task<IActionResult> List()
        {
            // Get all feedback entries
            var feedbackEntries = await _context.Feedback
                .Include(f => f.User)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

            // Get score distribution for statistics
            var scoreDistribution = new Dictionary<int, int>();
            for (int score = 1; score <= 5; score++)
            {
                var count = await _context.Feedback.CountAsync(f => f.Score == score);
                scoreDistribution[score] = count;
            }

            var averageScore = feedbackEntries.Any() ? Math.Round(feedbackEntries.Average(f => (double)f.Score), 1) : 0.0;
            var totalFeedback = feedbackEntries.Count;

            var viewModel = new FeedbackListViewModel
            {
                FeedbackEntries = feedbackEntries,
                ScoreDistribution = scoreDistribution,
                AverageScore = averageScore,
                TotalFeedback = totalFeedback
            };

            return View(viewModel);
        }

        /// <summary>
        /// Public feedback detail page - shows individual feedback entry
        /// Anyone can view this page (no authentication required)
        /// VULNERABLE: Displays user content without escaping (XSS vulnerability)
        /// Equivalent to feedback_detail() function in Python
        /// </summary>
        public async Task<IActionResult> Detail(int id)
        {
            var feedback = await _context.Feedback
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (feedback == null)
            {
                TempData["Message"] = "Feedback not found.";
                TempData["MessageType"] = "error";
                return RedirectToAction("List");
            }

            // Get other feedback from the same user (if not anonymous)
            var otherFeedback = new List<Feedback>();
            if (!feedback.IsAnonymous && feedback.User != null)
            {
                otherFeedback = await _context.Feedback
                    .Where(f => f.UserId == feedback.UserId && f.Id != feedback.Id)
                    .OrderByDescending(f => f.CreatedAt)
                    .Take(5)
                    .ToListAsync();
            }

            var viewModel = new FeedbackDetailViewModel
            {
                Feedback = feedback,
                OtherFeedback = otherFeedback
            };

            return View(viewModel);
        }

        /// <summary>
        /// Feedback submission form for authenticated users
        /// GET: Show feedback form
        /// POST: Process feedback submission
        /// VULNERABLE: Stores user input without sanitization (XSS vulnerability)
        /// Equivalent to submit_feedback() function in Python
        /// </summary>
        [HttpGet]
        [ActiveUserRequired]
        public IActionResult Submit()
        {
            return View();
        }

        [HttpPost]
        [ActiveUserRequired]
        public async Task<IActionResult> Submit(int score, string message, bool isAnonymous = false)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            // Basic validation
            if (score < 1 || score > 5)
            {
                TempData["Message"] = "Rating must be between 1 and 5 stars.";
                TempData["MessageType"] = "error";
                return View();
            }

            if (string.IsNullOrEmpty(message?.Trim()))
            {
                TempData["Message"] = "Please provide both a rating and feedback message.";
                TempData["MessageType"] = "error";
                return View();
            }

            message = message.Trim();

            // Check message length
            if (message.Length > 500)
            {
                TempData["Message"] = "Feedback message must be 500 characters or less.";
                TempData["MessageType"] = "error";
                return View();
            }

            // VULNERABILITY: Store user input directly without sanitization
            // This allows XSS attacks through the message field
            var feedback = new Feedback
            {
                UserId = currentUserId,
                Score = score,
                Message = message, // VULNERABLE: No HTML escaping or sanitization
                IsAnonymous = isAnonymous,
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                _context.Feedback.Add(feedback);
                await _context.SaveChangesAsync();

                TempData["Message"] = "Thank you for your feedback! Your input helps us improve our services.";
                TempData["MessageType"] = "success";
                return RedirectToAction("List");
            }
            catch (Exception e)
            {
                TempData["Message"] = "An error occurred while submitting your feedback. Please try again.";
                TempData["MessageType"] = "error";
                Console.WriteLine($"Feedback submission error: {e}");
            }

            return View();
        }

        /// <summary>
        /// Show all feedback by a specific user
        /// VULNERABLE: Displays all user feedback without proper authorization
        /// This is an IDOR (Insecure Direct Object Reference) vulnerability
        /// Equivalent to feedback_by_user() function in Python
        /// </summary>
        public async Task<IActionResult> ByUser(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                TempData["Message"] = "User not found.";
                TempData["MessageType"] = "error";
                return RedirectToAction("List");
            }

            // Get all feedback from this user (including non-anonymous)
            // VULNERABILITY: No authorization check - any user can view any other user's feedback
            var feedbackEntries = await _context.Feedback
                .Where(f => f.UserId == userId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

            var viewModel = new FeedbackByUserViewModel
            {
                User = user,
                FeedbackEntries = feedbackEntries
            };

            return View(viewModel);
        }
    }

    // View Models
    public class FeedbackListViewModel
    {
        public List<Feedback> FeedbackEntries { get; set; } = new();
        public Dictionary<int, int> ScoreDistribution { get; set; } = new();
        public double AverageScore { get; set; }
        public int TotalFeedback { get; set; }
    }

    public class FeedbackDetailViewModel
    {
        public Feedback Feedback { get; set; } = null!;
        public List<Feedback> OtherFeedback { get; set; } = new();
    }

    public class FeedbackByUserViewModel
    {
        public User User { get; set; } = null!;
        public List<Feedback> FeedbackEntries { get; set; } = new();
    }
}

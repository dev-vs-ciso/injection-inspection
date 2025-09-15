using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InjectionInspection.Models
{
    /// <summary>
    /// Feedback entity matching the Python SQLAlchemy Feedback model exactly
    /// Simple feedback with score and message for security training
    /// </summary>
    public class Feedback
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [ForeignKey("User")]
        public int UserId { get; set; }

        [Required]
        [Range(1, 5)]
        public int Score { get; set; } // 1-5 star rating

        [Required]
        public string Message { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsAnonymous { get; set; } = false;

        // Navigation property
        public virtual User User { get; set; } = null!;

        // Helper methods matching Python implementation
        public string GetStarDisplay()
        {
            return new string('★', Score) + new string('☆', 5 - Score);
        }

        public string GetFormattedDate()
        {
            return CreatedAt.ToString("MMM dd, yyyy");
        }

        public string GetFormattedDateTime()
        {
            return CreatedAt.ToString("MMMM dd, yyyy 'at' h:mm tt");
        }

        /// <summary>
        /// VULNERABLE: Get formatted message with XSS vulnerability
        /// This method is used in templates and allows script injection
        /// </summary>
        public string GetFormattedMessage()
        {
            // VULNERABILITY: Returns raw HTML without encoding
            // Allows XSS attacks through script tags, event handlers, etc.
            return Message;
        }

        /// <summary>
        /// SECURE: Get HTML-encoded message (commented for training)
        /// </summary>
        // public string GetSafeFormattedMessage()
        // {
        //     return System.Web.HttpUtility.HtmlEncode(Message);
        // }

        public static List<Feedback> GetRecentFeedback(IEnumerable<Feedback> feedback, int limit = 3)
        {
            return feedback
                .OrderByDescending(f => f.CreatedAt)
                .Take(limit)
                .ToList();
        }

        public static Dictionary<int, int> GetScoreDistribution(IEnumerable<Feedback> feedback)
        {
            var distribution = new Dictionary<int, int>();
            for (int score = 1; score <= 5; score++)
            {
                distribution[score] = feedback.Count(f => f.Score == score);
            }
            return distribution;
        }

        public static double GetAverageScore(IEnumerable<Feedback> feedback)
        {
            return feedback.Any() ? feedback.Average(f => f.Score) : 0.0;
        }
    }
}
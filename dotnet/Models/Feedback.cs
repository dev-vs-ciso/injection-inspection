using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingApp.Models
{
    /// <summary>
    /// Feedback model for storing customer feedback
    /// Each feedback entry belongs to a user (but can be viewed by anyone)
    /// </summary>
    [Table("feedback")]
    public class Feedback
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [Range(1, 5)]
        public int Score { get; set; } // 1-5 star rating

        [Required]
        public string Message { get; set; } = string.Empty; // Up to 500 characters

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsAnonymous { get; set; } = false; // Option to hide name

        // Navigation property
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        /// <summary>
        /// Get star display for the score
        /// </summary>
        public string GetStarDisplay()
        {
            return new string('★', Score) + new string('☆', 5 - Score);
        }

        /// <summary>
        /// Get display name (anonymous or real name)
        /// </summary>
        public string GetDisplayName()
        {
            if (IsAnonymous)
                return "Anonymous Customer";
            return User?.GetFullName() ?? "Unknown User";
        }
    }
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InjectionInspection.Models
{
    /// <summary>
    /// User entity with intentionally vulnerable methods for security training
    /// Replicates the Python SQLAlchemy User model exactly
    /// </summary>
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string AccountNumber { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal Balance { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public bool IsActive { get; set; } = true;

        // Navigation properties
        public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
        public virtual ICollection<Feedback> FeedbackEntries { get; set; } = new List<Feedback>();

        // Helper methods matching Python implementation
        public string GetFullName()
        {
            return $"{FirstName} {LastName}";
        }

        public string GetDisplayName()
        {
            return $"{FirstName} {LastName[0]}.";
        }

        public List<Transaction> GetRecentTransactions(int limit = 10)
        {
            return Transactions
                .OrderByDescending(t => t.Date)
                .Take(limit)
                .ToList();
        }

        public decimal GetTotalVolume()
        {
            return Transactions.Sum(t => t.Amount);
        }

        public int GetTransactionCount()
        {
            return Transactions.Count;
        }

        /// <summary>
        /// VULNERABLE: Password validation with potential timing attacks
        /// Matches the Python implementation's vulnerability
        /// </summary>
        public bool ValidatePassword(string password)
        {
            // VULNERABILITY: Direct string comparison allows timing attacks
            // Also stores plain text temporarily in memory
            return PasswordHash == password;
        }

        /// <summary>
        /// SECURE: Proper password validation (commented for training)
        /// </summary>
        // public bool ValidatePasswordSecure(string password)
        // {
        //     return BCrypt.Net.BCrypt.Verify(password, PasswordHash);
        // }

        public bool CanLogin()
        {
            return IsActive;
        }

        public void RecordLoginAttempt()
        {
            // Simplified - no login attempt tracking in this model
            // In a real application, this would be tracked in the database
        }

        public void ResetLoginAttempts()
        {
            // Simplified - no login attempt tracking in this model
            // In a real application, this would reset attempt counters
        }
    }
}
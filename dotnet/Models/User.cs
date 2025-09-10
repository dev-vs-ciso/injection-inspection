using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BankingApp.Models
{
    /// <summary>
    /// User model for storing customer account information
    /// Equivalent to Python User model with UserMixin functionality
    /// </summary>
    [Table("users")]
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(120)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "customer";

        [Required]
        [MaxLength(20)]
        public string AccountNumber { get; set; } = string.Empty;

        [Column(TypeName = "decimal(12,2)")]
        public decimal Balance { get; set; } = 1000.00m;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsActive { get; set; } = true;

        // Navigation properties
        public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
        public virtual ICollection<Feedback> Feedback { get; set; } = new List<Feedback>();

        /// <summary>
        /// Get user's full name
        /// </summary>
        public string GetFullName()
        {
            return $"{FirstName} {LastName}";
        }

        /// <summary>
        /// Get user's recent transactions
        /// </summary>
        public List<Transaction> GetRecentTransactions(int limit = 5)
        {
            return Transactions
                .OrderByDescending(t => t.Date)
                .Take(limit)
                .ToList();
        }

        /// <summary>
        /// Set password using MD5 hash (VULNERABLE for training purposes)
        /// In production, use BCrypt or similar secure hashing
        /// </summary>
        public void SetPassword(string password)
        {
            // VULNERABLE VERSION (for training purposes):
            using var md5 = System.Security.Cryptography.MD5.Create();
            var inputBytes = System.Text.Encoding.ASCII.GetBytes(password);
            var hashBytes = md5.ComputeHash(inputBytes);
            PasswordHash = Convert.ToHexString(hashBytes).ToLower();
        }

        /// <summary>
        /// Check password using MD5 hash (VULNERABLE for training purposes)
        /// </summary>
        public bool CheckPassword(string password)
        {
            using var md5 = System.Security.Cryptography.MD5.Create();
            var inputBytes = System.Text.Encoding.ASCII.GetBytes(password);
            var hashBytes = md5.ComputeHash(inputBytes);
            var inputHash = Convert.ToHexString(hashBytes).ToLower();
            return PasswordHash == inputHash;
        }
    }
}

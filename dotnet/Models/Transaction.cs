using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InjectionInspection.Models
{
    /// <summary>
    /// Transaction entity with vulnerable search methods for security training
    /// Replicates the Python SQLAlchemy Transaction model exactly
    /// </summary>
    public class Transaction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [ForeignKey("User")]
        public int UserId { get; set; }

        [Required]
        [StringLength(20)]
        public string TransactionType { get; set; } = string.Empty; // 'credit' or 'debit'

        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal Amount { get; set; }

        [Required]
        [StringLength(100)]
        public string Company { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [StringLength(50)]
        public string ReferenceNumber { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal BalanceAfter { get; set; }

        [StringLength(30)]
        public string? Category { get; set; }

        // User note with template injection vulnerability
        public string? Note { get; set; }

        // Navigation property
        public virtual User User { get; set; } = null!;

        // Helper methods matching Python implementation
        public bool IsCredit()
        {
            return TransactionType.Equals("credit", StringComparison.OrdinalIgnoreCase);
        }

        public bool IsDebit()
        {
            return TransactionType.Equals("debit", StringComparison.OrdinalIgnoreCase);
        }

        public string GetFormattedAmount()
        {
            var prefix = IsCredit() ? "+" : "-";
            return $"{prefix}${Amount:F2}";
        }

        public string GetFormattedDate()
        {
            return Date.ToString("MMM dd, yyyy");
        }

        public string GetFormattedDateTime()
        {
            return Date.ToString("MMMM dd, yyyy 'at' h:mm tt");
        }

        public static decimal GetTotalVolume(IEnumerable<Transaction> transactions)
        {
            return transactions.Sum(t => t.Amount);
        }

        public static decimal GetTotalCredits(IEnumerable<Transaction> transactions)
        {
            return transactions
                .Where(t => t.IsCredit())
                .Sum(t => t.Amount);
        }

        public static decimal GetTotalDebits(IEnumerable<Transaction> transactions)
        {
            return transactions
                .Where(t => t.IsDebit())
                .Sum(t => t.Amount);
        }

        public static List<Transaction> GetRecentActivity(IEnumerable<Transaction> transactions, int days = 30)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-days);
            return transactions
                .Where(t => t.Date >= cutoffDate)
                .OrderByDescending(t => t.Date)
                .ToList();
        }

        /// <summary>
        /// VULNERABLE: Generate reference number with predictable pattern
        /// Allows enumeration of transaction IDs
        /// </summary>
        public static string GenerateReferenceNumber(int transactionId)
        {
            // VULNERABILITY: Predictable reference numbers
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd");
            return $"TXN{timestamp}{transactionId:D6}";
        }

        /// <summary>
        /// SECURE: Generate cryptographically secure reference number (commented for training)
        /// </summary>
        // public static string GenerateSecureReferenceNumber()
        // {
        //     using var rng = RandomNumberGenerator.Create();
        //     byte[] bytes = new byte[16];
        //     rng.GetBytes(bytes);
        //     return Convert.ToHexString(bytes);
        // }
    }
}
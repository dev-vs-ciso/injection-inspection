using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingApp.Models
{
    /// <summary>
    /// Transaction model for storing banking transaction records
    /// Each transaction belongs to a user
    /// </summary>
    [Table("transactions")]
    public class Transaction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(20)]
        public string TransactionType { get; set; } = string.Empty; // 'debit' or 'credit'

        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(100)]
        public string Company { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [MaxLength(50)]
        public string ReferenceNumber { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal BalanceAfter { get; set; }

        [MaxLength(30)]
        public string? Category { get; set; }

        public string? Note { get; set; } // User note, Optional

        // Navigation property
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        /// <summary>
        /// Format amount for display with currency symbol
        /// </summary>
        public string FormatAmount()
        {
            return $"${Amount:N2}";
        }

        /// <summary>
        /// Check if transaction is a debit
        /// </summary>
        public bool IsDebit()
        {
            return TransactionType == "debit";
        }

        /// <summary>
        /// Check if transaction is a credit
        /// </summary>
        public bool IsCredit()
        {
            return TransactionType == "credit";
        }
    }
}

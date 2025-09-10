using Microsoft.EntityFrameworkCore;
using BankingApp.Models;

namespace BankingApp.Data
{
    /// <summary>
    /// Database context for the Banking Application
    /// Equivalent to SQLAlchemy db instance in Python app
    /// </summary>
    public class BankingDbContext : DbContext
    {
        public BankingDbContext(DbContextOptions<BankingDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<Feedback> Feedback { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => u.Email).IsUnique();
                entity.HasIndex(u => u.AccountNumber).IsUnique();
                entity.Property(u => u.Balance).HasDefaultValue(1000.00m);
                entity.Property(u => u.Role).HasDefaultValue("customer");
                entity.Property(u => u.IsActive).HasDefaultValue(true);
                entity.Property(u => u.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Configure Transaction entity
            modelBuilder.Entity<Transaction>(entity =>
            {
                entity.HasIndex(t => t.UserId);
                entity.HasIndex(t => t.Date);
                entity.HasIndex(t => t.ReferenceNumber).IsUnique();
                
                entity.HasOne(t => t.User)
                      .WithMany(u => u.Transactions)
                      .HasForeignKey(t => t.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure Feedback entity
            modelBuilder.Entity<Feedback>(entity =>
            {
                entity.HasIndex(f => f.UserId);
                entity.HasIndex(f => f.CreatedAt);
                entity.Property(f => f.IsAnonymous).HasDefaultValue(false);
                entity.Property(f => f.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(f => f.User)
                      .WithMany(u => u.Feedback)
                      .HasForeignKey(f => f.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }

        /// <summary>
        /// Get basic database statistics for display
        /// Equivalent to get_database_stats() function in Python
        /// </summary>
        public DatabaseStats GetDatabaseStats()
        {
            var totalUsers = Users.Count();
            var totalTransactions = Transactions.Count();
            var totalVolume = Transactions.Sum(t => t.Amount);
            
            var currentMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var monthlyVolume = Transactions
                .Where(t => t.Date >= currentMonth)
                .Sum(t => t.Amount);
            
            var totalFeedback = Feedback.Count();
            var averageScore = Feedback.Any() ? Feedback.Average(f => (double)f.Score) : 0.0;

            return new DatabaseStats
            {
                TotalUsers = totalUsers,
                TotalTransactions = totalTransactions,
                TotalVolume = totalVolume,
                MonthlyVolume = monthlyVolume,
                TotalFeedback = totalFeedback,
                AverageScore = Math.Round(averageScore, 1)
            };
        }
    }

    /// <summary>
    /// Database statistics model
    /// </summary>
    public class DatabaseStats
    {
        public int TotalUsers { get; set; }
        public int TotalTransactions { get; set; }
        public decimal TotalVolume { get; set; }
        public decimal MonthlyVolume { get; set; }
        public int TotalFeedback { get; set; }
        public double AverageScore { get; set; }
    }
}

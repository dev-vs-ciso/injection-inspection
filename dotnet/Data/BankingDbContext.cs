using Microsoft.EntityFrameworkCore;
using InjectionInspection.Models;

namespace InjectionInspection.Data
{
    /// <summary>
    /// Database context for the Banking Security Training Application
    /// Configures Entity Framework Core with PostgreSQL
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
                entity.ToTable("users");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.FirstName).HasColumnName("first_name").HasMaxLength(50).IsRequired();
                entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(120).IsRequired();
                entity.Property(e => e.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
                entity.Property(e => e.AccountNumber).HasColumnName("account_number").HasMaxLength(20).IsRequired();
                entity.Property(e => e.Balance).HasColumnName("balance").HasColumnType("decimal(12,2)").IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
                entity.Property(e => e.IsActive).HasColumnName("is_active").IsRequired();

                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.AccountNumber).IsUnique();
            });

            // Configure Transaction entity
            modelBuilder.Entity<Transaction>(entity =>
            {
                entity.ToTable("transactions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.TransactionType).HasColumnName("transaction_type").HasMaxLength(20).IsRequired();
                entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(12,2)").IsRequired();
                entity.Property(e => e.Company).HasColumnName("company").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.Date).HasColumnName("date").IsRequired();
                entity.Property(e => e.ReferenceNumber).HasColumnName("reference_number").HasMaxLength(50).IsRequired();
                entity.Property(e => e.BalanceAfter).HasColumnName("balance_after").HasColumnType("decimal(12,2)").IsRequired();
                entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(30);
                entity.Property(e => e.Note).HasColumnName("note");

                entity.HasIndex(e => e.ReferenceNumber).IsUnique();
                entity.HasIndex(e => e.Date);
                entity.HasIndex(e => e.UserId);

                // Configure relationship
                entity.HasOne(e => e.User)
                      .WithMany(e => e.Transactions)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure Feedback entity - matches Python SQLAlchemy model exactly
            modelBuilder.Entity<Feedback>(entity =>
            {
                entity.ToTable("feedback");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.Score).HasColumnName("score").IsRequired();
                entity.Property(e => e.Message).HasColumnName("message").IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
                entity.Property(e => e.IsAnonymous).HasColumnName("is_anonymous").IsRequired();

                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => e.UserId);

                // Configure relationship
                entity.HasOne(e => e.User)
                      .WithMany(e => e.FeedbackEntries)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }

        /// <summary>
        /// VULNERABLE: Execute raw SQL with potential injection
        /// Used for training purposes to demonstrate SQL injection
        /// </summary>
        public async Task<List<T>> ExecuteVulnerableQuery<T>(string sql) where T : class
        {
            try
            {
                // VULNERABILITY: Direct SQL execution without parameterization
                return await Set<T>().FromSqlRaw(sql).ToListAsync();
            }
            catch
            {
                return new List<T>();
            }
        }

        /// <summary>
        /// VULNERABLE: Execute raw SQL and return dynamic results
        /// Used for stored procedure calls with injection vulnerabilities
        /// </summary>
        public async Task<List<Dictionary<string, object>>> ExecuteVulnerableQueryDynamic(string sql)
        {
            var results = new List<Dictionary<string, object>>();
            
            try
            {
                using var command = Database.GetDbConnection().CreateCommand();
                command.CommandText = sql;
                
                if (Database.GetDbConnection().State != System.Data.ConnectionState.Open)
                {
                    await Database.OpenConnectionAsync();
                }

                using var reader = await command.ExecuteReaderAsync();
                
                while (await reader.ReadAsync())
                {
                    var row = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        row[reader.GetName(i)] = reader.GetValue(i);
                    }
                    results.Add(row);
                }
            }
            catch (Exception ex)
            {
                // Log error for training visibility
                Console.WriteLine($"SQL Error: {ex.Message}");
            }

            return results;
        }
    }
}
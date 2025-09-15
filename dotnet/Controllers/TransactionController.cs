using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using InjectionInspection.Data;
using InjectionInspection.Models;
using System.Security.Claims;
using System.Text;
using System.IO;
using RazorLight;
using System.Web;

namespace InjectionInspection.Controllers
{
    /// <summary>
    /// Transaction controller with intentionally vulnerable search functionality
    /// Replicates the Python Flask transaction vulnerabilities exactly
    /// </summary>
    [Authorize]
    public class TransactionController : Controller
    {
        private readonly BankingDbContext _context;
        private readonly ILogger<TransactionController> _logger;

        public TransactionController(BankingDbContext context, ILogger<TransactionController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Transaction search with vulnerable SQL injection
        /// GET/POST /Transaction/Search - Display search form and results
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Search(string? company, decimal? amountMin, decimal? amountMax, 
            DateTime? dateFrom, DateTime? dateTo, string? transactionType, string? category, 
            string? sortBy, string? sortOrder, bool advanced = false)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var transactions = new List<object>();
            var searchPerformed = !string.IsNullOrEmpty(company) || amountMin.HasValue || amountMax.HasValue || 
                                dateFrom.HasValue || dateTo.HasValue || !string.IsNullOrEmpty(transactionType) || 
                                !string.IsNullOrEmpty(category);

            if (searchPerformed)
            {
                if (advanced)
                {
                    // VULNERABLE: Advanced search using raw SQL with injection points
                    transactions = await VulnerableAdvancedSearch(userId, company, amountMin, amountMax, 
                        dateFrom, dateTo, transactionType, category, sortBy, sortOrder);
                }
                else
                {
                    // SAFE: Basic search using Entity Framework
                    transactions = await SafeBasicSearch(userId, company, amountMin, amountMax, dateFrom, dateTo);
                }
            }

            ViewBag.SearchPerformed = searchPerformed;
            ViewBag.Company = company;
            ViewBag.AmountMin = amountMin;
            ViewBag.AmountMax = amountMax;
            ViewBag.DateFrom = dateFrom;
            ViewBag.DateTo = dateTo;
            ViewBag.TransactionType = transactionType;
            ViewBag.Category = category;
            ViewBag.SortBy = sortBy;
            ViewBag.SortOrder = sortOrder;
            ViewBag.Advanced = advanced;

            return View(transactions);
        }

        /// <summary>
        /// VULNERABLE: Advanced search using raw SQL with injection points
        /// Replicates the Python Flask vulnerable search exactly
        /// </summary>
        private async Task<List<object>> VulnerableAdvancedSearch(int userId, string? company, decimal? amountMin, decimal? amountMax,
            DateTime? dateFrom, DateTime? dateTo, string? transactionType, string? category, string? sortBy, string? sortOrder)
        {
            var sql = new StringBuilder($"SELECT t.*, u.first_name, u.last_name FROM transactions t LEFT JOIN users u ON t.user_id = u.id WHERE t.user_id = {userId}");
            var conditions = new List<string>();

            if (!string.IsNullOrEmpty(company))
            {
                // VULNERABLE: Direct string interpolation - SQL injection point
                conditions.Add($"t.company LIKE '%{company}%'");
            }

            if (!string.IsNullOrEmpty(transactionType))
            {
                // VULNERABLE: Direct string interpolation - SQL injection point
                conditions.Add($"t.transaction_type = '{transactionType}'");
            }

            if (!string.IsNullOrEmpty(category))
            {
                // VULNERABLE: Direct string interpolation - SQL injection point
                conditions.Add($"t.category LIKE '%{category}%'");
            }

            if (amountMin.HasValue)
            {
                // VULNERABLE: No parameter binding
                conditions.Add($"t.amount >= {amountMin}");
            }

            if (amountMax.HasValue)
            {
                // VULNERABLE: No parameter binding
                conditions.Add($"t.amount <= {amountMax}");
            }

            if (dateFrom.HasValue)
            {
                // VULNERABLE: Date injection possible
                conditions.Add($"t.date >= '{dateFrom:yyyy-MM-dd}'");
            }

            if (dateTo.HasValue)
            {
                // VULNERABLE: Date injection possible
                conditions.Add($"t.date <= '{dateTo:yyyy-MM-dd}'");
            }

            if (conditions.Count > 0)
            {
                sql.Append(" AND " + string.Join(" AND ", conditions));
            }

            // Add ORDER BY clause with potential injection points
            var orderByClause = "t.date DESC"; // Default sorting
            if (!string.IsNullOrEmpty(sortBy))
            {
                // VULNERABLE: Direct column name injection possible
                var direction = sortOrder == "asc" ? "ASC" : "DESC";
                orderByClause = $"t.{sortBy} {direction}";
            }

            sql.Append($" ORDER BY {orderByClause} LIMIT 50");

            var query = sql.ToString();
            _logger.LogWarning("Executing vulnerable SQL: {Query}", query);

            var results = await _context.ExecuteVulnerableQueryDynamic(query);

            // Convert to anonymous objects for view
            return results.Select(row => new
            {
                Id = Convert.ToInt32(row["id"]),
                UserId = Convert.ToInt32(row["user_id"]),
                TransactionType = row["transaction_type"].ToString(),
                Amount = Convert.ToDecimal(row["amount"]),
                Company = row["company"].ToString(),
                Description = row["description"]?.ToString(),
                Date = Convert.ToDateTime(row["date"]),
                ReferenceNumber = row["reference_number"].ToString(),
                BalanceAfter = Convert.ToDecimal(row["balance_after"]),
                Category = row["category"]?.ToString(),
                Note = row["note"]?.ToString(),
                User = row["first_name"] != null ? new
                {
                    FirstName = row["first_name"].ToString(),
                    LastName = row["last_name"].ToString()
                } : null
            }).Cast<object>().ToList();
        }

        /// <summary>
        /// SAFE: Basic search using Entity Framework with proper parameterization
        /// </summary>
        private async Task<List<object>> SafeBasicSearch(int userId, string? company, decimal? amountMin, decimal? amountMax,
            DateTime? dateFrom, DateTime? dateTo)
        {
            var query = _context.Transactions
                .Include(t => t.User)
                .Where(t => t.UserId == userId)
                .AsQueryable();

            if (!string.IsNullOrEmpty(company))
            {
                query = query.Where(t => t.Company.Contains(company));
            }

            if (amountMin.HasValue)
            {
                query = query.Where(t => t.Amount >= amountMin.Value);
            }

            if (amountMax.HasValue)
            {
                query = query.Where(t => t.Amount <= amountMax.Value);
            }

            if (dateFrom.HasValue)
            {
                query = query.Where(t => t.Date >= dateFrom.Value);
            }

            if (dateTo.HasValue)
            {
                query = query.Where(t => t.Date <= dateTo.Value);
            }

            var transactions = await query
                .OrderByDescending(t => t.Date)
                .Take(50)
                .ToListAsync();

            // Convert to anonymous objects for consistent view handling
            return transactions.Select(t => new
            {
                Id = t.Id,
                UserId = t.UserId,
                TransactionType = t.TransactionType,
                Amount = t.Amount,
                Company = t.Company,
                Description = t.Description,
                Date = t.Date,
                ReferenceNumber = t.ReferenceNumber,
                BalanceAfter = t.BalanceAfter,
                Category = t.Category,
                Note = t.Note,
                User = new
                {
                    FirstName = t.User.FirstName,
                    LastName = t.User.LastName
                }
            }).Cast<object>().ToList();
        }

        /// <summary>
        /// Transaction detail view with note editing capability
        /// Vulnerable to template injection when editing notes
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Detail(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            
            var transaction = await _context.Transactions
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (transaction == null)
            {
                return NotFound("Transaction not found or you do not have permission to view it.");
            }

            // VULNERABLE: Template injection in note rendering
            string? renderedNote = null;
            if (!string.IsNullOrEmpty(transaction.Note))
            {
                try
                {
                    // VULNERABILITY: Direct Razor compilation from user input - EXTREMELY DANGEROUS
                    // Developer thought: "Let users use Razor syntax in notes for rich formatting"
                    // Reality: Full Remote Code Execution via @{} code blocks - NO FILE REQUIRED!
                    renderedNote = await RenderRazorTemplate(transaction.Note, transaction);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Template rendering error (potential injection attempt): {Error}", ex.Message);
                    renderedNote = $"<div class='alert alert-warning'><strong>Template Error:</strong> {ex.Message}</div><hr/><strong>Raw Note:</strong><br/>{transaction.Note}";
                }
            }

            // Get related transactions for sidebar
            var relatedTransactions = await _context.Transactions
                .Where(t => t.UserId == userId && t.Company == transaction.Company && t.Id != transaction.Id)
                .OrderByDescending(t => t.Date)
                .Take(5)
                .ToListAsync();

            ViewBag.RenderedNote = renderedNote;
            ViewBag.RelatedTransactions = relatedTransactions;

            return View(transaction);
        }

        /// <summary>
        /// Update transaction note with template injection vulnerability
        /// POST /Transaction/Detail/{id} - Handle note updates
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Detail(int id, string? transactionNote)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            
            var transaction = await _context.Transactions
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (transaction == null)
            {
                return NotFound("Transaction not found or you do not have permission to view it.");
            }

            // Update the note
            transaction.Note = string.IsNullOrEmpty(transactionNote) ? null : transactionNote;
            await _context.SaveChangesAsync();

            // VULNERABLE: Template injection in note rendering
            string? renderedNote = null;
            if (!string.IsNullOrEmpty(transaction.Note))
            {
                try
                {
                    // VULNERABILITY: Direct Razor compilation from user input - EXTREMELY DANGEROUS  
                    // Developer thought: "Let users use Razor syntax in notes for rich formatting"
                    // Reality: Full Remote Code Execution via @{} code blocks - NO FILE REQUIRED!
                    renderedNote = await RenderRazorTemplate(transaction.Note, transaction);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Template rendering error (potential injection attempt): {Error}", ex.Message);
                    renderedNote = $"<div class='alert alert-warning'><strong>Template Error:</strong> {ex.Message}</div><hr/><strong>Raw Note:</strong><br/>{transaction.Note}";
                }
            }

            // Get related transactions for sidebar
            var relatedTransactions = await _context.Transactions
                .Where(t => t.UserId == userId && t.Company == transaction.Company && t.Id != transaction.Id)
                .OrderByDescending(t => t.Date)
                .Take(5)
                .ToListAsync();

            ViewBag.RenderedNote = renderedNote;
            ViewBag.RelatedTransactions = relatedTransactions;

            return View(transaction);
        }

        /// <summary>
        /// Transaction archive with vulnerable stored procedure call
        /// GET/POST /Transaction/Archive - Archive search functionality
        /// </summary>
        [HttpGet]
        public IActionResult Archive()
        {
            var availableYears = new[] { "2020", "2021" };
            var availableMonths = new[]
            {
                new { Value = "01", Name = "January" },
                new { Value = "02", Name = "February" },
                new { Value = "03", Name = "March" },
                new { Value = "04", Name = "April" },
                new { Value = "05", Name = "May" },
                new { Value = "06", Name = "June" },
                new { Value = "07", Name = "July" },
                new { Value = "08", Name = "August" },
                new { Value = "09", Name = "September" },
                new { Value = "10", Name = "October" },
                new { Value = "11", Name = "November" },
                new { Value = "12", Name = "December" }
            };

            ViewBag.AvailableYears = availableYears;
            ViewBag.AvailableMonths = availableMonths;
            ViewBag.ArchivePerformed = false;
            ViewBag.Transactions = new List<object>();
            ViewBag.Summary = new
            {
                TotalCredits = 0m,
                TotalDebits = 0m,
                RecentActivityCount = 0,
                AverageScore = 0
            };

            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Archive(string? archiveYear, string? archiveMonth)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var availableYears = new[] { "2020", "2021" };
            var availableMonths = new[]
            {
                new { Value = "01", Name = "January" },
                new { Value = "02", Name = "February" },
                new { Value = "03", Name = "March" },
                new { Value = "04", Name = "April" },
                new { Value = "05", Name = "May" },
                new { Value = "06", Name = "June" },
                new { Value = "07", Name = "July" },
                new { Value = "08", Name = "August" },
                new { Value = "09", Name = "September" },
                new { Value = "10", Name = "October" },
                new { Value = "11", Name = "November" },
                new { Value = "12", Name = "December" }
            };

            var transactions = new List<object>();
            string message = "";
            string messageType = "";

            if (string.IsNullOrEmpty(archiveYear) || string.IsNullOrEmpty(archiveMonth))
            {
                message = "Please select both year and month.";
                messageType = "error";
            }
            else
            {
                try
                {
                    transactions = await CallArchivedTransactionsProcedure(userId, archiveYear, archiveMonth);

                    if (transactions.Count > 0)
                    {
                        message = $"Found {transactions.Count} archived transactions for {archiveMonth}/{archiveYear}.";
                        messageType = "success";
                    }
                    else
                    {
                        message = $"No archived transactions found for {archiveMonth}/{archiveYear}.";
                        messageType = "info";
                    }
                }
                catch (Exception ex)
                {
                    message = $"Error retrieving archived transactions: {ex.Message}";
                    messageType = "error";
                }
            }

            // Calculate summary statistics
            var totalCredits = transactions.Where(t => GetTransactionType(t) == "credit")
                .Sum(t => GetAmount(t));
            var totalDebits = transactions.Where(t => GetTransactionType(t) == "debit")
                .Sum(t => GetAmount(t));

            ViewBag.AvailableYears = availableYears;
            ViewBag.AvailableMonths = availableMonths;
            ViewBag.ArchivePerformed = true;
            ViewBag.SelectedYear = archiveYear;
            ViewBag.SelectedMonth = archiveMonth;
            ViewBag.Transactions = transactions;
            ViewBag.Message = message;
            ViewBag.MessageType = messageType;
            ViewBag.Summary = new
            {
                TotalCredits = totalCredits,
                TotalDebits = totalDebits,
                RecentActivityCount = transactions.Count,
                AverageScore = 0
            };

            return View();
        }

        /// <summary>
        /// VULNERABLE: Template injection for financial reports with custom templates
        /// GET/POST /Transaction/GenerateReport - Allows arbitrary code execution via RazorLight
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GenerateReport()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var user = await _context.Users.FindAsync(userId);
            
            // Provide a sample template for the user
            ViewBag.SampleTemplate = @"<h2>Financial Report for @Model.User.Email</h2>
<p>Generated: @DateTime.Now</p>
<p>Total Transactions: @Model.Transactions.Count</p>
<p>Total Amount: @Model.TotalAmount.ToString(""C"")</p>

<h3>Recent Transactions:</h3>
<ul>
@foreach(var txn in Model.Transactions.Take(5))
{
    <li>@txn.Company: @txn.Amount.ToString(""C"") on @txn.Date.ToShortDateString()</li>
}
</ul>";
            
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> GenerateReport(string reportTemplate, string format = "html")
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var transactions = await _context.Transactions
                    .Where(t => t.UserId == userId)
                    .OrderByDescending(t => t.Date)
                    .Take(10)
                    .ToListAsync();

                // Get user data for template context
                var user = await _context.Users.FindAsync(userId);
                var totalAmount = transactions.Sum(t => t.Amount);
                var transactionCount = transactions.Count;

                // Create template context with user data
                var model = new
                {
                    User = user,
                    Transactions = transactions,
                    TotalAmount = totalAmount,
                    TransactionCount = transactionCount,
                    GeneratedDate = DateTime.Now
                };

                // VULNERABILITY: Direct template compilation and execution using RazorLight
                // This allows arbitrary code execution through template injection
                var engine = new RazorLightEngineBuilder()
                    .UseEmbeddedResourcesProject(typeof(Program))
                    .UseMemoryCachingProvider()
                    .Build();

                string result;
                try
                {
                    // DANGEROUS: User-controlled template gets compiled and executed
                    // Examples of malicious templates that will execute:
                    // @{System.IO.File.WriteAllText("C:\\temp\\pwned.txt", "Hacked!");}
                    // @{System.Environment.GetEnvironmentVariables()}
                    // @{System.Diagnostics.Process.Start("calc.exe");}
                    result = await engine.CompileRenderStringAsync("template", reportTemplate, model);
                }
                catch (Exception ex)
                {
                    // Even error messages can leak information
                    result = $"<div class='alert alert-danger'><strong>Template compilation error:</strong><br/>{ex.Message}</div>";
                    result += $"<hr/><strong>Template that caused error:</strong><br/><pre>{System.Web.HttpUtility.HtmlEncode(reportTemplate)}</pre>";
                }

                if (format.ToLower() == "pdf")
                {
                    // For demo purposes, just return HTML wrapped as text
                    Response.Headers.Add("Content-Disposition", "attachment; filename=report.txt");
                    return Content(result, "text/plain");
                }

                return Content(result, "text/html");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error generating report: {ex.Message}");
            }
        }

        /// <summary>
        /// VULNERABLE: Call get_archived_transactions stored procedure with SQL injection vulnerability
        /// Matches the Python implementation's vulnerable stored procedure call
        /// </summary>
        private async Task<List<object>> CallArchivedTransactionsProcedure(int userId, string year, string month)
        {
            try
            {
                // VULNERABLE: Direct parameter substitution in stored procedure call
                var procedureCall = $"SELECT * FROM get_archived_transactions('{year}', '{month}') WHERE user_id = {userId}";

                _logger.LogWarning("Executing vulnerable stored procedure call: {Query}", procedureCall);

                var results = await _context.ExecuteVulnerableQueryDynamic(procedureCall);

                return results.Select(row => new
                {
                    Id = Convert.ToInt32(row["id"]),
                    Date = Convert.ToDateTime(row["date"]),
                    Company = row["company"]?.ToString() ?? "",
                    Description = row["description"]?.ToString() ?? "",
                    TransactionType = row["transaction_type"]?.ToString() ?? "",
                    Amount = Convert.ToDecimal(row["amount"]),
                    BalanceAfter = Convert.ToDecimal(row["balance_after"]),
                    ReferenceNumber = row["reference_number"]?.ToString() ?? "",
                    Category = row["category"]?.ToString() ?? "General",
                    UserId = Convert.ToInt32(row["user_id"])
                }).Cast<object>().ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Stored procedure call error");
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        // Helper methods for dynamic object handling
        private string GetTransactionType(object transaction)
        {
            var type = transaction.GetType();
            var prop = type.GetProperty("TransactionType");
            return prop?.GetValue(transaction)?.ToString() ?? "";
        }

        private decimal GetAmount(object transaction)
        {
            var type = transaction.GetType();
            var prop = type.GetProperty("Amount");
            var value = prop?.GetValue(transaction);
            return value != null ? Convert.ToDecimal(value) : 0m;
        }

        /// <summary>
        /// EXTREMELY VULNERABLE: Renders user input as Razor template directly in memory
        /// Allows full Remote Code Execution via @{} syntax using RazorLight engine
        /// </summary>
        private async Task<string> RenderRazorTemplate(string templateContent, Transaction model)
        {
            try
            {
                // VULNERABILITY: Direct RazorLight compilation and execution
                var engine = new RazorLightEngineBuilder()
                    .UseEmbeddedResourcesProject(typeof(Program))
                    .UseMemoryCachingProvider()
                    .Build();

                // DANGER: User-controlled template gets compiled and executed as C# code
                // This allows arbitrary code execution through @{} blocks:
                // @{System.Environment.GetEnvironmentVariables()}
                // @{System.IO.Directory.GetFiles("C:\\")}  
                // @{System.Diagnostics.Process.Start("calc.exe")}
                var result = await engine.CompileRenderStringAsync("template", templateContent, model);
                
                return result;
            }
            catch (Exception ex)
            {
                // Even error messages can reveal system information
                return $"<div class='alert alert-danger'>Template Error: {ex.Message}</div>";
            }
        }
    }
}
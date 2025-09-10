using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using System.Diagnostics;
using BankingApp.Data;
using BankingApp.Models;
using BankingApp.Filters;
using System.Data;
using System.Text.Json;
using DotLiquid;

namespace BankingApp.Controllers
{
    /// <summary>
    /// Transaction controller handling all transaction-related functionality
    /// Equivalent to transaction.py routes in Python application
    /// Contains VULNERABLE SQL injection methods for training purposes
    /// </summary>
    public class TransactionController : Controller
    {
        private readonly BankingDbContext _context;

        public TransactionController(BankingDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Detailed view of a specific transaction with note editing capability
        /// Shows all transaction information and related data
        /// Handles note updates with VULNERABLE template injection
        /// Equivalent to transaction_detail() function in Python
        /// </summary>
        [HttpGet]
        [ActiveUserRequired]
        public async Task<IActionResult> Detail(int id)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            // Get transaction and verify it belongs to current user
            var transaction = await _context.Transactions
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == currentUserId);

            if (transaction == null)
            {
                TempData["Message"] = "Transaction not found or you do not have permission to view it.";
                TempData["MessageType"] = "error";
                return RedirectToAction("Dashboard", "Home");
            }

            // Get related transactions (same company, recent)
            var relatedTransactions = await _context.Transactions
                .Where(t => t.UserId == currentUserId && 
                           t.Company == transaction.Company && 
                           t.Id != transaction.Id)
                .OrderByDescending(t => t.Date)
                .Take(5)
                .ToListAsync();

            // VULNERABLE: Process note through DotLiquid template rendering
            string? renderedNote = null;
            if (!string.IsNullOrEmpty(transaction.Note))
            {
                try
                {
                    // VULNERABILITY: Direct template rendering of user input
                    // This allows template injection attacks
                    var template = Template.Parse(transaction.Note);
                    var templateData = new
                    {
                        current_user = new
                        {
                            id = currentUserId,
                            email = User.FindFirst(ClaimTypes.Name)?.Value,
                            first_name = User.FindFirst(ClaimTypes.GivenName)?.Value,
                            last_name = User.FindFirst(ClaimTypes.Surname)?.Value
                        },
                        transaction = new
                        {
                            id = transaction.Id,
                            amount = transaction.Amount,
                            company = transaction.Company,
                            type = transaction.TransactionType
                        },
                        request = new
                        {
                            path = HttpContext.Request.Path.Value,
                            method = HttpContext.Request.Method
                        }
                    };
                    
                    renderedNote = template.Render(Hash.FromAnonymousObject(templateData));
                }
                catch (Exception e)
                {
                    // If template rendering fails, show the raw note
                    renderedNote = transaction.Note;
                    TempData["Message"] = $"Note rendering error: {e.Message}";
                    TempData["MessageType"] = "warning";
                }
            }

            var viewModel = new TransactionDetailViewModel
            {
                Transaction = transaction,
                RelatedTransactions = relatedTransactions,
                RenderedNote = renderedNote
            };

            return View(viewModel);
        }

        [HttpPost]
        [ActiveUserRequired]
        public async Task<IActionResult> Detail(int id, string transactionNote)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            var transaction = await _context.Transactions
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == currentUserId);

            if (transaction == null)
            {
                TempData["Message"] = "Transaction not found or you do not have permission to view it.";
                TempData["MessageType"] = "error";
                return RedirectToAction("Dashboard", "Home");
            }

            try
            {
                // Update the note
                transaction.Note = string.IsNullOrEmpty(transactionNote?.Trim()) ? null : transactionNote.Trim();
                await _context.SaveChangesAsync();
                
                if (!string.IsNullOrEmpty(transaction.Note))
                {
                    TempData["Message"] = "Transaction note updated successfully.";
                    TempData["MessageType"] = "success";
                }
                else
                {
                    TempData["Message"] = "Transaction note cleared.";
                    TempData["MessageType"] = "info";
                }
            }
            catch (Exception e)
            {
                TempData["Message"] = $"Error updating note: {e.Message}";
                TempData["MessageType"] = "error";
            }

            return RedirectToAction("Detail", new { id });
        }

        /// <summary>
        /// Transaction search functionality with both Basic and Advanced search modes
        /// Basic search uses safe ORM queries
        /// Advanced search uses raw SQL for "better performance" (contains SQL injection vulnerabilities)
        /// Equivalent to search() function in Python
        /// </summary>
        [HttpGet]
        [ActiveUserRequired]
        public IActionResult Search()
        {
            var viewModel = new SearchViewModel
            {
                Transactions = new List<Transaction>(),
                SearchPerformed = false,
                SearchMode = "basic"
            };

            return View(viewModel);
        }

        [HttpPost]
        [ActiveUserRequired]
        public async Task<IActionResult> Search(string searchMode = "basic")
        {
            List<Transaction> transactions = new();
            bool searchPerformed = true;

            if (searchMode == "basic")
            {
                // SAFE: Basic search using Entity Framework ORM
                transactions = await _BasicSearch();
            }
            else
            {
                // VULNERABLE: Advanced search using raw SQL
                transactions = await _AdvancedSearch();
            }

            var viewModel = new SearchViewModel
            {
                Transactions = transactions,
                SearchPerformed = searchPerformed,
                SearchMode = searchMode
            };

            return View(viewModel);
        }

        /// <summary>
        /// Safe basic search using Entity Framework ORM
        /// </summary>
        private async Task<List<Transaction>> _BasicSearch()
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var company = Request.Form["company"].ToString().Trim();
            var dateFrom = Request.Form["date_from"].ToString().Trim();
            var dateTo = Request.Form["date_to"].ToString().Trim();

            // Build query safely using ORM
            var query = _context.Transactions.Where(t => t.UserId == currentUserId);

            // Add company filter if provided
            if (!string.IsNullOrEmpty(company))
            {
                query = query.Where(t => EF.Functions.ILike(t.Company, $"%{company}%"));
            }

            // Add date filters if provided
            if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var dateFromObj))
            {
                query = query.Where(t => t.Date >= dateFromObj);
            }

            if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var dateToObj))
            {
                var dateToEndOfDay = dateToObj.AddDays(1);
                query = query.Where(t => t.Date < dateToEndOfDay);
            }

            // Get results
            var transactions = await query.OrderByDescending(t => t.Date).Take(100).ToListAsync();

            if (transactions.Count == 0)
            {
                TempData["Message"] = "No transactions found matching your search criteria.";
                TempData["MessageType"] = "info";
            }
            else
            {
                TempData["Message"] = $"Found {transactions.Count} transaction(s).";
                TempData["MessageType"] = "success";
            }

            return transactions;
        }

        /// <summary>
        /// VULNERABLE: Advanced search using raw SQL for "better performance and flexibility"
        /// Contains multiple SQL injection vulnerabilities for training purposes
        /// </summary>
        private async Task<List<Transaction>> _AdvancedSearch()
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            // Get advanced search parameters
            var company = Request.Form["adv_company"].ToString().Trim();
            var amountMin = Request.Form["amount_min"].ToString().Trim();
            var amountMax = Request.Form["amount_max"].ToString().Trim();
            var transactionType = Request.Form["transaction_type"].ToString().Trim();
            var category = Request.Form["category"].ToString().Trim();
            var dateFrom = Request.Form["adv_date_from"].ToString().Trim();
            var dateTo = Request.Form["adv_date_to"].ToString().Trim();
            var sortBy = Request.Form["sort_by"].ToString().Trim();
            var sortOrder = Request.Form["sort_order"].ToString().Trim();

            // Set defaults for empty values
            if (string.IsNullOrEmpty(sortBy)) sortBy = "date";
            if (string.IsNullOrEmpty(sortOrder)) sortOrder = "DESC";

            // VULNERABILITY 1: Dynamic WHERE clause building with string concatenation
            var baseQuery = $@"
                SELECT t.""Id"", t.""UserId"", t.""TransactionType"", t.""Amount"", 
                       t.""Company"", t.""Description"", t.""Date"", t.""ReferenceNumber"",
                       t.""BalanceAfter"", t.""Category"", t.""Note"",
                       u.""FirstName"", u.""LastName""
                FROM ""transactions"" t 
                JOIN ""users"" u ON t.""UserId"" = u.""Id""
                WHERE t.""UserId"" = {currentUserId}";

            var whereConditions = new List<string>();

            // VULNERABILITY 2: Unsafe company name filtering
            if (!string.IsNullOrEmpty(company))
            {
                // This allows SQL injection via company name parameter
                whereConditions.Add($"t.\"Company\" ILIKE '%{company}%'");
            }

            // VULNERABILITY 3: Unsafe amount range filtering
            if (!string.IsNullOrEmpty(amountMin))
            {
                // Direct injection of user input into SQL
                whereConditions.Add($"t.\"Amount\" >= {amountMin}");
            }

            if (!string.IsNullOrEmpty(amountMax))
            {
                // Another injection point
                whereConditions.Add($"t.\"Amount\" <= {amountMax}");
            }

            // VULNERABILITY 4: Unsafe transaction type filtering
            if (!string.IsNullOrEmpty(transactionType) && transactionType.ToLower() != "all")
            {
                // Using user input directly in SQL
                whereConditions.Add($"t.\"TransactionType\" = '{transactionType}'");
            }

            // VULNERABILITY 5: Category filtering injection
            if (!string.IsNullOrEmpty(category))
            {
                // Another string concatenation vulnerability
                whereConditions.Add($"t.\"Category\" ILIKE '%{category}%'");
            }

            // VULNERABILITY 6: Date filtering vulnerabilities
            if (!string.IsNullOrEmpty(dateFrom))
            {
                // Date injection - users could inject SQL instead of dates
                whereConditions.Add($"t.\"Date\" >= '{dateFrom}'");
            }

            if (!string.IsNullOrEmpty(dateTo))
            {
                // Another date injection point
                whereConditions.Add($"t.\"Date\" <= '{dateTo} 23:59:59'");
            }

            // Build the complete WHERE clause
            if (whereConditions.Count > 0)
            {
                baseQuery += " AND " + string.Join(" AND ", whereConditions);
            }

            // VULNERABILITY 7: Unsafe ORDER BY clause
            // This allows injection via sort parameters
            baseQuery += $" ORDER BY t.\"{sortBy}\" {sortOrder}";

            // VULNERABILITY 8: Unsafe LIMIT clause (bonus injection point)
            var limit = Request.Form["limit"].ToString().Trim();
            if (string.IsNullOrEmpty(limit)) limit = "100";
            baseQuery += $" LIMIT {limit}";

            // Add some logging for "debugging" purposes (reveals the vulnerable query)
            Console.WriteLine($"DEBUG: Executing advanced search query: {baseQuery}");

            try
            {
                var transactions = new List<Transaction>();
                var connection = _context.Database.GetDbConnection();
                await connection.OpenAsync();

                using var command = connection.CreateCommand();
                command.CommandText = baseQuery;

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var transaction = new Transaction
                    {
                        Id = reader.GetInt32("Id"),
                        UserId = reader.GetInt32("UserId"),
                        TransactionType = reader.GetString("TransactionType"),
                        Amount = reader.GetDecimal("Amount"),
                        Company = reader.GetString("Company"),
                        Description = reader.IsDBNull("Description") ? null : reader.GetString("Description"),
                        Date = reader.GetDateTime("Date"),
                        ReferenceNumber = reader.GetString("ReferenceNumber"),
                        BalanceAfter = reader.GetDecimal("BalanceAfter"),
                        Category = reader.IsDBNull("Category") ? null : reader.GetString("Category"),
                        Note = reader.IsDBNull("Note") ? null : reader.GetString("Note"),
                        User = new User
                        {
                            FirstName = reader.GetString("FirstName"),
                            LastName = reader.GetString("LastName")
                        }
                    };
                    transactions.Add(transaction);
                }

                if (transactions.Count == 0)
                {
                    TempData["Message"] = "No transactions found matching your advanced search criteria.";
                    TempData["MessageType"] = "info";
                }
                else
                {
                    TempData["Message"] = $"Advanced search found {transactions.Count} transaction(s).";
                    TempData["MessageType"] = "success";
                }

                return transactions;
            }
            catch (Exception e)
            {
                // VULNERABILITY 9: Error message that reveals database structure
                var errorMsg = e.Message;
                TempData["Message"] = $"Advanced search failed: {errorMsg}";
                TempData["MessageType"] = "error";
                Console.WriteLine($"Advanced search error: {e}");
                return new List<Transaction>();
            }
        }

        /// <summary>
        /// VULNERABLE: Export transactions with customizable filename and format
        /// Contains command injection via filename parameters
        /// Equivalent to export_transactions() function in Python
        /// </summary>
        [HttpGet]
        [ActiveUserRequired]
        public IActionResult Export()
        {
            var viewModel = new ExportViewModel();
            return View(viewModel);
        }

        [HttpPost]
        [ActiveUserRequired]
        public async Task<IActionResult> Export(string filename, string dateRange)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            filename = filename?.Trim() ?? "transactions";
            dateRange = dateRange?.Trim() ?? "30";

            try
            {
                // Get user's transactions
                var days = int.TryParse(dateRange, out var parsedDays) ? parsedDays : 30;
                var cutoffDate = DateTime.UtcNow.AddDays(-days);
                
                var transactions = await _context.Transactions
                    .Where(t => t.UserId == currentUserId && t.Date >= cutoffDate)
                    .OrderByDescending(t => t.Date)
                    .ToListAsync();

                // VULNERABILITY: User input directly passed to shell command
                var exportPath = $"/tmp/exports/{filename}";

                try
                {
                    // Create directory and file with command injection vulnerability
                    var command = $"mkdir -p /tmp/exports && touch {exportPath}";

                    // Execute the vulnerable command
                    Console.WriteLine($"DEBUG: Executing command: {command}");
                    
                    var processInfo = new ProcessStartInfo
                    {
                        FileName = "/bin/bash",
                        Arguments = $"-c \"{command}\"",
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };

                    using var process = Process.Start(processInfo);
                    if (process != null)
                    {
                        await process.WaitForExitAsync();
                        var output = await process.StandardOutput.ReadToEndAsync();
                        var error = await process.StandardError.ReadToEndAsync();

                        // Generate actual CSV content
                        var csvContent = new StringBuilder();
                        csvContent.AppendLine("Date,Company,Type,Amount,Balance,Reference");
                        
                        foreach (var txn in transactions)
                        {
                            csvContent.AppendLine($"{txn.Date:yyyy-MM-dd HH:mm:ss},{txn.Company},{txn.TransactionType},{txn.Amount},{txn.BalanceAfter},{txn.ReferenceNumber}");
                        }

                        await System.IO.File.WriteAllTextAsync(exportPath, csvContent.ToString());

                        // Prepare results for template display
                        var exportResults = new ExportResultViewModel
                        {
                            Success = process.ExitCode == 0,
                            Filename = $"{filename}.csv",
                            TransactionCount = transactions.Count,
                            Output = output,
                            Error = error,
                            FileExists = System.IO.File.Exists(exportPath)
                        };

                        if (process.ExitCode == 0)
                        {
                            TempData["Message"] = $"Export generated successfully! Output: {output}, Error: {error}";
                            TempData["MessageType"] = "success";
                        }
                        else
                        {
                            TempData["Message"] = "Export command failed. See details below.";
                            TempData["MessageType"] = "error";
                        }

                        var viewModel = new ExportViewModel
                        {
                            Results = exportResults
                        };

                        return View(viewModel);
                    }
                }
                catch (Exception e)
                {
                    TempData["Message"] = $"Export error: {e.Message}";
                    TempData["MessageType"] = "error";
                    
                    var viewModel = new ExportViewModel
                    {
                        Results = new ExportResultViewModel
                        {
                            Success = false,
                            Filename = $"{filename}.csv",
                            Error = e.Message
                        }
                    };

                    return View(viewModel);
                }
            }
            catch (Exception e)
            {
                TempData["Message"] = $"Export preparation error: {e.Message}";
                TempData["MessageType"] = "error";
                return View(new ExportViewModel());
            }

            return View(new ExportViewModel());
        }

        /// <summary>
        /// Download generated export file
        /// </summary>
        [HttpGet]
        [ActiveUserRequired]
        public IActionResult DownloadExport(string filename)
        {
            if (string.IsNullOrEmpty(filename))
            {
                TempData["Message"] = "No filename specified for download.";
                TempData["MessageType"] = "error";
                return RedirectToAction("Export");
            }

            var filePath = $"/tmp/exports/{filename}";
            
            if (!System.IO.File.Exists(filePath))
            {
                TempData["Message"] = "Export file not found. Please generate the export first.";
                TempData["MessageType"] = "error";
                return RedirectToAction("Export");
            }

            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            return File(fileBytes, "text/csv", filename);
        }
    }

    // View Models
    public class TransactionDetailViewModel
    {
        public Transaction Transaction { get; set; } = null!;
        public List<Transaction> RelatedTransactions { get; set; } = new();
        public string? RenderedNote { get; set; }
    }

    public class SearchViewModel
    {
        public List<Transaction> Transactions { get; set; } = new();
        public bool SearchPerformed { get; set; }
        public string SearchMode { get; set; } = "basic";
    }

    public class ExportViewModel
    {
        public ExportResultViewModel? Results { get; set; }
    }

    public class ExportResultViewModel
    {
        public bool Success { get; set; }
        public string Filename { get; set; } = string.Empty;
        public int TransactionCount { get; set; }
        public string Output { get; set; } = string.Empty;
        public string Error { get; set; } = string.Empty;
        public bool FileExists { get; set; }
    }
}

using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using BankingApp.Data;
using System.Text.Json;

namespace BankingApp.Controllers
{
    /// <summary>
    /// API controller handling REST API endpoints
    /// Equivalent to api.py routes in Python application
    /// Contains VULNERABLE command injection for training purposes
    /// </summary>
    [ApiController]
    [Route("api")]
    public class APIController : ControllerBase
    {
        private readonly BankingDbContext _context;

        public APIController(BankingDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// API endpoint for bank statistics
        /// Returns JSON data for potential AJAX requests
        /// Equivalent to api_stats() function in Python
        /// </summary>
        [HttpGet("stats")]
        public IActionResult GetStats()
        {
            try
            {
                var stats = _context.GetDatabaseStats();
                
                return Ok(new
                {
                    total_users = stats.TotalUsers,
                    total_transactions = stats.TotalTransactions,
                    total_volume = (double)stats.TotalVolume,
                    monthly_volume = (double)stats.MonthlyVolume,
                    total_feedback = stats.TotalFeedback,
                    average_score = stats.AverageScore
                });
            }
            catch (Exception e)
            {
                Console.WriteLine($"Database not ready: {e}");
                return Ok(new
                {
                    total_users = 0,
                    total_transactions = 0,
                    total_volume = 0.0,
                    monthly_volume = 0.0,
                    total_feedback = 0,
                    average_score = 0.0
                });
            }
        }

        /// <summary>
        /// Partner bank transaction submission endpoint
        /// POST /api/transactions
        /// VULNERABLE: Transaction processing logic allows command injection
        /// Equivalent to api_transactions() function in Python
        /// </summary>
        [HttpPost("transactions")]
        public async Task<IActionResult> ProcessTransactions([FromBody] PartnerTransactionRequest request)
        {
            try
            {
                if (request.Transactions == null || request.Transactions.Count == 0)
                {
                    return BadRequest(new
                    {
                        status = "error",
                        message = "No transactions provided"
                    });
                }

                // Process each transaction
                var processedTransactions = new List<object>();
                decimal totalAmount = 0;

                for (int i = 0; i < request.Transactions.Count; i++)
                {
                    var txn = request.Transactions[i];
                    try
                    {
                        // Extract transaction data
                        var amount = txn.Amount;
                        var currency = txn.Currency ?? "USD";
                        var companyName = txn.CompanyName ?? "Unknown Company";
                        var transactionRef = txn.Reference ?? $"REF{i + 1}";
                        var description = txn.Description ?? "Partner transaction";

                        // VULNERABILITY 1: Log file creation with unsafe company name
                        // Create audit log file for each company (normal business requirement)
                        var logFilename = $"partner_audit_{request.PartnerBankCode}_{companyName}.log";
                        var logCommand = $"echo '{DateTime.UtcNow} - Transaction {transactionRef}: ${amount}' >> /tmp/logs/{logFilename}";

                        // VULNERABLE: company_name can contain shell metacharacters
                        await ExecuteCommand(logCommand);

                        // VULNERABILITY 2: Notification system with transaction description
                        // Send notifications for large transactions (normal business requirement)
                        if (amount > 5000)
                        {
                            var notificationMsg = $"Large transaction alert: {description} for ${amount}";
                            // VULNERABLE: description can contain command injection
                            var notifyCommand = $"echo '{notificationMsg}' | logger -t partner_alerts";
                            await ExecuteCommand(notifyCommand);
                        }

                        // VULNERABILITY 3: Reference number validation with file operations
                        // Validate reference number format (normal business requirement)
                        if (!string.IsNullOrEmpty(transactionRef))
                        {
                            // VULNERABLE: Using transaction_ref in subprocess without sanitization
                            var validationCommand = $"echo 'Validating ref: {transactionRef}' > /tmp/validation_{transactionRef}.tmp";
                            await ExecuteCommand(validationCommand);
                        }

                        // VULNERABILITY 4: Currency conversion lookup
                        // Look up exchange rates for non-USD transactions (normal business requirement)
                        if (currency != "USD")
                        {
                            // VULNERABLE: currency code used in file operations
                            var rateLookupCmd = $"touch /tmp/rates/exchange_rate_{currency}_{DateTime.UtcNow:yyyyMMdd}.txt";
                            await ExecuteCommand(rateLookupCmd);
                        }

                        // Normal processing (safe)
                        totalAmount += amount;
                        processedTransactions.Add(new
                        {
                            reference = transactionRef,
                            amount = amount,
                            currency = currency,
                            company = companyName,
                            status = "processed"
                        });
                    }
                    catch (Exception e)
                    {
                        // Continue processing other transactions
                        processedTransactions.Add(new
                        {
                            reference = txn.Reference ?? $"REF{i + 1}",
                            status = "error",
                            error = e.Message
                        });
                        continue;
                    }
                }

                // VULNERABILITY 5: Batch summary report generation
                // Generate summary report (normal business requirement)
                var summaryFilename = $"batch_summary_{request.PartnerBankCode}_{request.BatchId}.txt";
                var summaryCommand = $"echo 'Batch {request.BatchId} processed {processedTransactions.Count} transactions' > /tmp/reports/{summaryFilename}";

                // VULNERABLE: batch_id can contain shell metacharacters
                await ExecuteCommand(summaryCommand);

                // Return success response
                return Ok(new
                {
                    status = "success",
                    partner_bank_code = request.PartnerBankCode,
                    batch_id = request.BatchId,
                    transactions_processed = processedTransactions.Count,
                    total_amount = totalAmount,
                    processed_transactions = processedTransactions,
                    summary_file = summaryFilename
                });
            }
            catch (Exception e)
            {
                return StatusCode(500, new
                {
                    status = "error",
                    message = $"Transaction processing failed: {e.Message}"
                });
            }
        }

        /// <summary>
        /// VULNERABLE helper method to execute shell commands
        /// Contains command injection vulnerabilities for training purposes
        /// </summary>
        private async Task<string> ExecuteCommand(string command)
        {
            try
            {
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

                    if (process.ExitCode != 0)
                    {
                        Console.WriteLine($"Command failed: {error}");
                    }

                    return output;
                }

                return "";
            }
            catch (Exception e)
            {
                Console.WriteLine($"Command execution error: {e.Message}");
                return "";
            }
        }
    }

    /// <summary>
    /// Request models for API endpoints
    /// </summary>
    public class PartnerTransactionRequest
    {
        public string PartnerBankCode { get; set; } = "UNKNOWN";
        public string BatchId { get; set; } = "BATCH001";
        public List<TransactionData> Transactions { get; set; } = new();
    }

    public class TransactionData
    {
        public decimal Amount { get; set; }
        public string? Currency { get; set; }
        public string? CompanyName { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
    }
}

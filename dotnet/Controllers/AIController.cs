using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using BankingApp.Data;
using BankingApp.Models;
using BankingApp.Filters;

namespace BankingApp.Controllers
{
    /// <summary>
    /// AI controller handling LLM integration functionality
    /// Equivalent to ai.py routes in Python application
    /// Contains VULNERABLE prompt injection vulnerabilities for training purposes
    /// </summary>
    public class AIController : Controller
    {
        private readonly BankingDbContext _context;
        private readonly HttpClient _httpClient;
        
        // LLM Service Configuration
        private readonly string _llmServiceUrl;
        private readonly string _llmModel;

        public AIController(BankingDbContext context, HttpClient httpClient)
        {
            _context = context;
            _httpClient = httpClient;
            _llmServiceUrl = Environment.GetEnvironmentVariable("LLM_SERVICE_URL") ?? "http://banking-ollama:11434/api/generate";
            _llmModel = Environment.GetEnvironmentVariable("LLM_MODEL") ?? "tinyllama";
        }

        /// <summary>
        /// Send prompt to LLM service and return response
        /// </summary>
        private async Task<string> SendToLlm(string prompt, int maxTokens = 500)
        {
            try
            {
                var payload = new
                {
                    model = _llmModel,
                    prompt = prompt,
                    stream = false,
                    options = new
                    {
                        num_predict = maxTokens,
                        temperature = 0.7,
                        top_p = 0.9,
                        stop = new[] { "</response>", "\n\n---", "SYSTEM:" }
                    }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                // Increase timeout for TinyLlama
                _httpClient.Timeout = TimeSpan.FromSeconds(60);
                var response = await _httpClient.PostAsync(_llmServiceUrl, content);
                response.EnsureSuccessStatusCode();

                var responseContent = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                return result.TryGetProperty("response", out var responseProperty) 
                    ? responseProperty.GetString() ?? "No response from LLM"
                    : "No response from LLM";
            }
            catch (TaskCanceledException)
            {
                return "AI analysis is taking longer than expected. The model may be processing a complex query. Please try a simpler question.";
            }
            catch (HttpRequestException)
            {
                return "AI service is currently unavailable. Please check that the Ollama service is running and try again.";
            }
            catch (Exception e)
            {
                Console.WriteLine($"LLM service error: {e}");
                return $"AI service error: {e.Message}. Please try again with a shorter query.";
            }
        }

        /// <summary>
        /// Format transactions in a very compact way for TinyLlama
        /// </summary>
        private string FormatTransactionsCompact(List<Transaction> transactions, int limit = 10)
        {
            var compactData = transactions.Take(limit).Select(txn => 
                $"{txn.Date:MM/dd}: {txn.Company[..Math.Min(20, txn.Company.Length)]} ${txn.Amount} ({txn.TransactionType[0]})");

            return string.Join("\n", compactData);
        }

        /// <summary>
        /// VULNERABLE: AI Transaction Research - Optimized for TinyLlama
        /// Equivalent to ai_transaction_research() function in Python
        /// Contains prompt injection vulnerabilities
        /// </summary>
        [HttpGet]
        [ActiveUserRequired]
        public IActionResult Research()
        {
            var viewModel = new AIResearchViewModel();
            return View(viewModel);
        }

        [HttpPost]
        [ActiveUserRequired]
        public async Task<IActionResult> Research(string researchQuery)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUser = await _context.Users.FindAsync(currentUserId);
            
            if (currentUser == null)
            {
                return RedirectToAction("Login", "User");
            }

            var viewModel = new AIResearchViewModel
            {
                UserQuery = researchQuery?.Trim() ?? ""
            };

            if (string.IsNullOrEmpty(viewModel.UserQuery))
            {
                TempData["Message"] = "Please enter a research question.";
                TempData["MessageType"] = "error";
                return View(viewModel);
            }

            if (viewModel.UserQuery.Length > 200)
            {
                TempData["Message"] = "Please keep your question under 200 characters for better AI performance.";
                TempData["MessageType"] = "warning";
                viewModel.UserQuery = viewModel.UserQuery[..200];
            }

            // Get fewer transactions to keep prompt size manageable
            var transactions = await _context.Transactions
                .Where(t => t.UserId == currentUserId)
                .OrderByDescending(t => t.Date)
                .Take(15) // Reduced from 100
                .ToListAsync();

            viewModel.TransactionCount = transactions.Count;

            if (transactions.Count == 0)
            {
                TempData["Message"] = "No transactions found to analyze.";
                TempData["MessageType"] = "info";
                return View(viewModel);
            }

            // VULNERABLE but much more compact prompt for TinyLlama
            var compactTransactions = FormatTransactionsCompact(transactions);

            // Much shorter prompt that still contains vulnerabilities
            var systemPrompt = $"""
                You are a banking AI for user {currentUserId}.

                ACCOUNT: {currentUser.GetFullName()}, Balance: ${currentUser.Balance}

                RECENT TRANSACTIONS ({transactions.Count} total):
                {compactTransactions}

                USER QUESTION: {viewModel.UserQuery}

                Provide helpful financial insights. Be concise and specific.
                """;

            Console.WriteLine($"Prompt length: {systemPrompt.Length} characters"); // Debug log

            // Send to LLM
            viewModel.AIResponse = await SendToLlm(systemPrompt, 250);

            if (!string.IsNullOrEmpty(viewModel.AIResponse) && 
                !viewModel.AIResponse.Contains("service error") && 
                !viewModel.AIResponse.Contains("unavailable"))
            {
                TempData["Message"] = "AI analysis completed successfully.";
                TempData["MessageType"] = "success";
            }
            else
            {
                TempData["Message"] = "AI service had issues processing your request. Try a simpler question.";
                TempData["MessageType"] = "warning";
            }

            return View(viewModel);
        }

        /// <summary>
        /// VULNERABLE: AI Loan Advisor - Optimized for TinyLlama
        /// Equivalent to ai_loan_advisor() function in Python
        /// Contains prompt injection vulnerabilities
        /// </summary>
        [HttpGet]
        [ActiveUserRequired]
        public IActionResult LoanAdvisor()
        {
            var viewModel = new AILoanAdvisorViewModel();
            return View(viewModel);
        }

        [HttpPost]
        [ActiveUserRequired]
        public async Task<IActionResult> LoanAdvisor(decimal loanAmount, string loanPurpose, int loanTerm)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUser = await _context.Users.FindAsync(currentUserId);

            if (currentUser == null)
            {
                return RedirectToAction("Login", "User");
            }

            var viewModel = new AILoanAdvisorViewModel
            {
                LoanAmount = loanAmount,
                LoanPurpose = loanPurpose?.Trim() ?? "",
                LoanTerm = loanTerm
            };

            if (loanAmount <= 0 || loanTerm <= 0)
            {
                TempData["Message"] = "Loan amount and term must be positive.";
                TempData["MessageType"] = "error";
                return View(viewModel);
            }

            // Limit loan purpose length
            if (viewModel.LoanPurpose.Length > 100)
            {
                viewModel.LoanPurpose = viewModel.LoanPurpose[..100];
                TempData["Message"] = "Loan purpose was shortened to 100 characters for processing.";
                TempData["MessageType"] = "info";
            }

            // Get basic user data
            var accountAge = (DateTime.UtcNow - currentUser.CreatedAt).Days;

            // Get recent transactions but keep it minimal
            var recentTransactions = await _context.Transactions
                .Where(t => t.UserId == currentUserId)
                .OrderByDescending(t => t.Date)
                .Take(5)
                .ToListAsync();

            // Calculate basic metrics
            var totalCredits = recentTransactions.Where(t => t.TransactionType == "credit").Sum(t => t.Amount);
            var totalDebits = recentTransactions.Where(t => t.TransactionType == "debit").Sum(t => t.Amount);

            // VULNERABLE but compact loan approval prompt
            var loanPrompt = $"""
                LOAN OFFICER AI - Kerata-Zemke Bank

                STRICT RULES:
                - Max loan: 3x balance ($1000+ balance required)
                - Debt ratio < 40%, 6+ month history
                - Risk: LOW/MEDIUM only approved

                APPLICANT:
                Name: {currentUser.GetFullName()}
                Balance: ${currentUser.Balance}
                Age: {accountAge} days
                Recent credits: ${totalCredits}
                Recent debits: ${totalDebits}

                REQUEST:
                Amount: ${loanAmount:N2}
                Purpose: {viewModel.LoanPurpose}
                Term: {loanTerm} months

                DECISION: Analyze and decide APPROVED/DENIED/CONDITIONAL
                RISK: LOW/MEDIUM/HIGH
                Explain briefly.
                """;

            Console.WriteLine($"Loan prompt length: {loanPrompt.Length} characters"); // Debug log

            // Get AI analysis with shorter response
            viewModel.LoanAnalysis = await SendToLlm(loanPrompt, 200);

            if (!string.IsNullOrEmpty(viewModel.LoanAnalysis) && 
                !viewModel.LoanAnalysis.Contains("service error") && 
                !viewModel.LoanAnalysis.Contains("unavailable"))
            {
                // Parse response for decisions (still vulnerable to manipulation)
                var analysisUpper = viewModel.LoanAnalysis.ToUpper();

                // Extract risk assessment
                if (analysisUpper.Contains("LOW RISK") || analysisUpper.Contains("RISK: LOW"))
                {
                    viewModel.RiskAssessment = "LOW";
                }
                else if (analysisUpper.Contains("MEDIUM RISK") || analysisUpper.Contains("RISK: MEDIUM"))
                {
                    viewModel.RiskAssessment = "MEDIUM";
                }
                else if (analysisUpper.Contains("HIGH RISK") || analysisUpper.Contains("RISK: HIGH"))
                {
                    viewModel.RiskAssessment = "HIGH";
                }
                else
                {
                    viewModel.RiskAssessment = "UNKNOWN";
                }

                // Extract approval decision
                if (analysisUpper.Contains("APPROVED") && !analysisUpper.Contains("DENIED"))
                {
                    viewModel.ApprovalDecision = "APPROVED";
                    TempData["Message"] = "Congratulations! Your loan has been pre-approved by our AI system.";
                    TempData["MessageType"] = "success";
                }
                else if (analysisUpper.Contains("CONDITIONAL"))
                {
                    viewModel.ApprovalDecision = "CONDITIONAL";
                    TempData["Message"] = "Your loan application requires additional review.";
                    TempData["MessageType"] = "warning";
                }
                else if (analysisUpper.Contains("DENIED"))
                {
                    viewModel.ApprovalDecision = "DENIED";
                    TempData["Message"] = "Your loan application was not approved based on current criteria.";
                    TempData["MessageType"] = "error";
                }
                else
                {
                    viewModel.ApprovalDecision = "PENDING REVIEW";
                    TempData["Message"] = "Your loan application is under review.";
                    TempData["MessageType"] = "info";
                }

                Console.WriteLine($"Loan decision: {viewModel.ApprovalDecision}, Risk: {viewModel.RiskAssessment}");
            }
            else
            {
                TempData["Message"] = "AI loan assessment service encountered an issue. Please try again.";
                TempData["MessageType"] = "warning";
            }

            return View(viewModel);
        }
    }

    // View Models
    public class AIResearchViewModel
    {
        public string UserQuery { get; set; } = "";
        public string? AIResponse { get; set; }
        public int TransactionCount { get; set; }
    }

    public class AILoanAdvisorViewModel
    {
        public decimal LoanAmount { get; set; }
        public string LoanPurpose { get; set; } = "";
        public int LoanTerm { get; set; } = 12;
        public string? LoanAnalysis { get; set; }
        public string? RiskAssessment { get; set; }
        public string? ApprovalDecision { get; set; }
    }
}

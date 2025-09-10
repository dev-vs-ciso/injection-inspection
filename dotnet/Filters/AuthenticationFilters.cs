using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace BankingApp.Filters
{
    /// <summary>
    /// Authentication filter equivalent to @login_required decorator in Python
    /// Requires user authentication and redirects to login page if not authenticated
    /// </summary>
    public class LoginRequiredAttribute : Attribute, IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            var user = context.HttpContext.User;
            
            if (!user.Identity?.IsAuthenticated ?? true)
            {
                // Save the URL user was trying to access
                var returnUrl = context.HttpContext.Request.Path + context.HttpContext.Request.QueryString;
                context.HttpContext.Session.SetString("ReturnUrl", returnUrl);
                
                // Set TempData message equivalent to flash() in Flask
                var controller = context.Controller as Controller;
                controller?.TempData.Add("Message", "Please log in to access this page.");
                controller?.TempData.Add("MessageType", "warning");
                
                context.Result = new RedirectToActionResult("Login", "User", null);
            }
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            // No action needed after execution
        }
    }

    /// <summary>
    /// Active user filter equivalent to @active_user_required decorator in Python
    /// Ensures that only active users can access protected resources
    /// </summary>
    public class ActiveUserRequiredAttribute : Attribute, IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            var user = context.HttpContext.User;
            
            if (!user.Identity?.IsAuthenticated ?? true)
            {
                var returnUrl = context.HttpContext.Request.Path + context.HttpContext.Request.QueryString;
                context.HttpContext.Session.SetString("ReturnUrl", returnUrl);
                
                var controller = context.Controller as Controller;
                controller?.TempData.Add("Message", "Please log in to access this page.");
                controller?.TempData.Add("MessageType", "warning");
                
                context.Result = new RedirectToActionResult("Login", "User", null);
                return;
            }

            // Check if user is active
            var isActiveClaim = user.FindFirst("IsActive")?.Value;
            if (isActiveClaim != "True")
            {
                var controller = context.Controller as Controller;
                controller?.TempData.Add("Message", "Your account has been deactivated. Please contact support.");
                controller?.TempData.Add("MessageType", "error");
                
                context.Result = new RedirectToActionResult("Login", "User", null);
            }
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            // No action needed after execution
        }
    }

    /// <summary>
    /// Anonymous user filter equivalent to @anonymous_required decorator in Python
    /// Redirects authenticated users to dashboard
    /// Useful for login/register pages that shouldn't be accessible to logged-in users
    /// </summary>
    public class AnonymousRequiredAttribute : Attribute, IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            var user = context.HttpContext.User;
            
            if (user.Identity?.IsAuthenticated ?? false)
            {
                context.Result = new RedirectToActionResult("Dashboard", "Home", null);
            }
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            // No action needed after execution
        }
    }

    /// <summary>
    /// User access validation filter equivalent to @validate_user_access decorator in Python
    /// Compares the user_id parameter with current user's id
    /// </summary>
    public class ValidateUserAccessAttribute : Attribute, IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            var user = context.HttpContext.User;
            
            if (!user.Identity?.IsAuthenticated ?? true)
            {
                var controller = context.Controller as Controller;
                controller?.TempData.Add("Message", "Please log in to access this page.");
                controller?.TempData.Add("MessageType", "warning");
                
                context.Result = new RedirectToActionResult("Login", "User", null);
                return;
            }

            // Check if user_id parameter exists and validate it
            if (context.ActionArguments.TryGetValue("userId", out var userIdObj))
            {
                var currentUserId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (int.TryParse(currentUserId, out var currentUserIdInt) && 
                    int.TryParse(userIdObj?.ToString(), out var parameterUserId))
                {
                    if (parameterUserId != currentUserIdInt)
                    {
                        var controller = context.Controller as Controller;
                        controller?.TempData.Add("Message", "You can only access your own data.");
                        controller?.TempData.Add("MessageType", "error");
                        
                        context.Result = new RedirectToActionResult("Dashboard", "Home", null);
                    }
                }
            }
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            // No action needed after execution
        }
    }

    /// <summary>
    /// Rate limiting filter for login attempts equivalent to @rate_limit_login decorator in Python
    /// </summary>
    public class RateLimitLoginAttribute : Attribute, IActionFilter
    {
        private readonly int _maxAttempts;
        private readonly int _windowMinutes;

        public RateLimitLoginAttribute(int maxAttempts = 5, int windowMinutes = 15)
        {
            _maxAttempts = maxAttempts;
            _windowMinutes = windowMinutes;
        }

        public void OnActionExecuting(ActionExecutingContext context)
        {
            var clientIp = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var attemptsKey = $"login_attempts_{clientIp}";
            
            // Get current attempts from session
            var attemptsJson = context.HttpContext.Session.GetString(attemptsKey);
            var attempts = new List<DateTime>();
            
            if (!string.IsNullOrEmpty(attemptsJson))
            {
                try
                {
                    attempts = System.Text.Json.JsonSerializer.Deserialize<List<DateTime>>(attemptsJson) ?? new List<DateTime>();
                }
                catch
                {
                    attempts = new List<DateTime>();
                }
            }

            // Clean old attempts (older than window_minutes)
            var cutoffTime = DateTime.UtcNow.AddMinutes(-_windowMinutes);
            attempts = attempts.Where(attempt => attempt > cutoffTime).ToList();

            // Check if too many attempts
            if (attempts.Count >= _maxAttempts)
            {
                var controller = context.Controller as Controller;
                controller?.TempData.Add("Message", $"Too many login attempts. Please wait {_windowMinutes} minutes before trying again.");
                controller?.TempData.Add("MessageType", "error");
                
                context.Result = new RedirectToActionResult("Index", "Home", null);
            }
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            // Add current attempt to the list if login failed
            // This would need to be implemented based on the actual login result
            // For now, we'll add the attempt time to session
            var clientIp = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var attemptsKey = $"login_attempts_{clientIp}";
            
            var attemptsJson = context.HttpContext.Session.GetString(attemptsKey);
            var attempts = new List<DateTime>();
            
            if (!string.IsNullOrEmpty(attemptsJson))
            {
                try
                {
                    attempts = System.Text.Json.JsonSerializer.Deserialize<List<DateTime>>(attemptsJson) ?? new List<DateTime>();
                }
                catch
                {
                    attempts = new List<DateTime>();
                }
            }

            attempts.Add(DateTime.UtcNow);
            var updatedAttemptsJson = System.Text.Json.JsonSerializer.Serialize(attempts);
            context.HttpContext.Session.SetString(attemptsKey, updatedAttemptsJson);
        }
    }
}

using InjectionInspection.Models;

namespace InjectionInspection.Models.ViewModels
{
    /// <summary>
    /// View model for the user dashboard page
    /// </summary>
    public class DashboardViewModel
    {
        public User User { get; set; } = null!;
        public List<Transaction> RecentTransactions { get; set; } = new List<Transaction>();
        public decimal TotalCredits { get; set; }
        public decimal TotalDebits { get; set; }
        public int RecentActivityCount { get; set; }
        public decimal TotalVolume { get; set; }
        public int TransactionCount { get; set; }
        public string BankName { get; set; } = "SecureBank Training";
    }
}
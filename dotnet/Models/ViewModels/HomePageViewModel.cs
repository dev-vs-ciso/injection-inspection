namespace InjectionInspection.Models.ViewModels
{
    /// <summary>
    /// View model for the home page statistics
    /// </summary>
    public class HomePageViewModel
    {
        public int TotalUsers { get; set; }
        public int TotalTransactions { get; set; }
        public decimal TotalVolume { get; set; }
        public decimal MonthlyVolume { get; set; }
        public double AverageScore { get; set; }
        public string BankName { get; set; } = "SecureBank Training";
    }
}
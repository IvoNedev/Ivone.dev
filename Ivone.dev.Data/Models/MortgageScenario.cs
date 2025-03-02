public class MortgageScenario
{
    public int Id { get; set; } // Primary Key
    public string Name { get; set; } // Scenario name (e.g., "House A")
    public decimal TotalCost { get; set; }
    public decimal DepositPercentage { get; set; } // Stored as a percentage (e.g., 20 for 20%)
    public decimal DepositAmount { get; set; }
    public decimal MortgageAmount { get; set; }
    public decimal ParkingSpotCost { get; set; }
    public decimal CommissionRate { get; set; } // Stored as a percentage (e.g., 3.5 for 3.5%)
    public decimal CommissionAmount { get; set; }
    public decimal LawyerFeeRate { get; set; } // Stored as a percentage (e.g., 4 for 4%)
    public decimal LawyerFeeAmount { get; set; }
    public int LoanTermInYears { get; set; } // Loan term (e.g., 25, 30 years)
    public string Currency { get; set; } // e.g., "EUR", "BGN"
}

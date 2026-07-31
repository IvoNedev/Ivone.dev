namespace Ivone.dev.Data.Models.Todo;

public sealed class TodoDocument
{
    public byte Id { get; set; }
    public int SchemaVersion { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public string MeasurementUnit { get; set; } = "metric";
    public bool MeasurementSimplified { get; set; } = true;
    public decimal FinanceMonthlyBudget { get; set; }
    public string FinanceCurrency { get; set; } = "EUR";
    public byte[] RowVersion { get; set; } = [];

    public ICollection<TodoGroup> Groups { get; set; } = [];
    public ICollection<TodoNote> Notes { get; set; } = [];
    public ICollection<TodoCalendarEvent> CalendarEvents { get; set; } = [];
    public ICollection<TodoMealEntry> MealEntries { get; set; } = [];
    public ICollection<TodoGoal> Goals { get; set; } = [];
    public ICollection<TodoMeasurementEntry> MeasurementEntries { get; set; } = [];
    public ICollection<TodoRecipe> Recipes { get; set; } = [];
    public ICollection<TodoFinanceExpense> FinanceExpenses { get; set; } = [];
    public ICollection<TodoDeletion> Deletions { get; set; } = [];
}

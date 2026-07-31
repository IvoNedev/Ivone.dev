namespace Ivone.dev.Todo;

internal sealed class TodoDocumentPayload
{
    public int Version { get; set; } = 9;
    public string UpdatedAt { get; set; } = string.Empty;
    public List<TodoGroupPayload> Groups { get; set; } = [];
    public List<TodoNotePayload> Notes { get; set; } = [];
    public Dictionary<string, string> DeletedNotes { get; set; } = [];
    public List<TodoCalendarEventPayload> CalendarEvents { get; set; } = [];
    public Dictionary<string, string> DeletedCalendarEvents { get; set; } = [];
    public List<TodoMealEntryPayload> MealEntries { get; set; } = [];
    public Dictionary<string, string> DeletedMealEntries { get; set; } = [];
    public List<TodoGoalPayload> Goals { get; set; } = [];
    public Dictionary<string, string> DeletedGoals { get; set; } = [];
    public decimal FinanceMonthlyBudget { get; set; }
    public string FinanceCurrency { get; set; } = "EUR";
    public List<TodoFinanceExpensePayload> FinanceExpenses { get; set; } = [];
    public Dictionary<string, string> DeletedFinanceExpenses { get; set; } = [];
    public string MeasurementUnit { get; set; } = "metric";
    public bool MeasurementSimplified { get; set; } = true;
    public List<TodoMeasurementEntryPayload> MeasurementEntries { get; set; } = [];
    public Dictionary<string, string> DeletedMeasurementEntries { get; set; } = [];
    public List<TodoRecipePayload> Recipes { get; set; } = [];
    public Dictionary<string, string> DeletedRecipes { get; set; } = [];
}

internal sealed class TodoFinanceExpensePayload
{
    public string Id { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Group { get; set; } = "Other";
    public string Notes { get; set; } = string.Empty;
    public bool IsRecurring { get; set; }
    public string Recurrence { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

internal sealed class TodoGroupPayload
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public decimal? ManualOrder { get; set; }
    public string OrderUpdatedAt { get; set; } = string.Empty;
}

internal sealed class TodoNotePayload
{
    public string Id { get; set; } = string.Empty;
    public string GroupId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public List<TodoItemPayload> Items { get; set; } = [];
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
    public bool Pinned { get; set; }
    public decimal? ManualOrder { get; set; }
    public string OrderUpdatedAt { get; set; } = string.Empty;
    public string? LastVisitedAt { get; set; }
    public Dictionary<string, int> Visits { get; set; } = [];
}

internal sealed class TodoItemPayload
{
    public string Id { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string Status { get; set; } = "open";
    public bool Collapsed { get; set; }
    public List<TodoItemPayload> Children { get; set; } = [];
}

internal sealed class TodoCalendarEventPayload
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public int StartMinutes { get; set; }
    public int DurationMinutes { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

internal sealed class TodoMealEntryPayload
{
    public string Id { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public int StartMinutes { get; set; }
    public string RecipeId { get; set; } = string.Empty;
    public string RecipeTitle { get; set; } = string.Empty;
    public decimal PortionPercent { get; set; } = 100;
    public TodoMacroPayload Macros { get; set; } = new();
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

internal sealed class TodoGoalPayload
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Deadline { get; set; } = string.Empty;
    public bool IsMain { get; set; }
    public bool Completed { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

internal sealed class TodoMeasurementEntryPayload
{
    public string Id { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public decimal? DailyCalories { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? BodyFatPercent { get; set; }
    public decimal? NeckCm { get; set; }
    public decimal? ShouldersCm { get; set; }
    public decimal? ChestCm { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? HipsCm { get; set; }
    public decimal? UpperArmRelaxedCm { get; set; }
    public decimal? UpperArmFlexedCm { get; set; }
    public decimal? LeftUpperArmCm { get; set; }
    public decimal? RightUpperArmCm { get; set; }
    public decimal? LeftForearmCm { get; set; }
    public decimal? RightForearmCm { get; set; }
    public decimal? LeftThighCm { get; set; }
    public decimal? RightThighCm { get; set; }
    public decimal? LeftCalfCm { get; set; }
    public decimal? RightCalfCm { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

internal sealed class TodoRecipePayload
{
    public string Id { get; set; } = string.Empty;
    public string Kind { get; set; } = "recipe";
    public string Title { get; set; } = string.Empty;
    public List<string> Ingredients { get; set; } = [];
    public List<string> Method { get; set; } = [];
    public string Notes { get; set; } = string.Empty;
    public string MacroText { get; set; } = string.Empty;
    public TodoMacroPayload Macros { get; set; } = new();
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

internal sealed class TodoMacroPayload
{
    public decimal? Calories { get; set; }
    public decimal? ProteinG { get; set; }
    public decimal? CarbsG { get; set; }
    public decimal? FatG { get; set; }
}

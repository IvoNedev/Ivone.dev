namespace Ivone.dev.Data.Models.Todo;

public abstract class TodoDocumentChild
{
    public byte TodoDocumentId { get; set; }
    public TodoDocument Document { get; set; } = null!;
}

public sealed class TodoGroup : TodoDocumentChild
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public decimal? ManualOrder { get; set; }
    public DateTimeOffset OrderUpdatedAtUtc { get; set; }
}

public sealed class TodoNote : TodoDocumentChild
{
    public string Id { get; set; } = string.Empty;
    public string GroupId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public bool Pinned { get; set; }
    public decimal? ManualOrder { get; set; }
    public DateTimeOffset OrderUpdatedAtUtc { get; set; }
    public DateTimeOffset? LastVisitedAtUtc { get; set; }
    public ICollection<TodoNoteItem> Items { get; set; } = [];
    public ICollection<TodoNoteVisit> Visits { get; set; } = [];
}

public sealed class TodoNoteItem
{
    public byte TodoDocumentId { get; set; }
    public string NoteId { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public string? ParentItemId { get; set; }
    public int SortOrder { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Status { get; set; } = "open";
    public bool Collapsed { get; set; }
    public TodoNote Note { get; set; } = null!;
}

public sealed class TodoNoteVisit
{
    public byte TodoDocumentId { get; set; }
    public string NoteId { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public int VisitCount { get; set; }
    public TodoNote Note { get; set; } = null!;
}

public sealed class TodoCalendarEvent : TodoDocumentChild
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public int StartMinutes { get; set; }
    public int DurationMinutes { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class TodoMealEntry : TodoDocumentChild
{
    public string Id { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public int StartMinutes { get; set; }
    public string RecipeId { get; set; } = string.Empty;
    public string RecipeTitle { get; set; } = string.Empty;
    public decimal PortionPercent { get; set; }
    public decimal? Calories { get; set; }
    public decimal? ProteinG { get; set; }
    public decimal? CarbsG { get; set; }
    public decimal? FatG { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class TodoGoal : TodoDocumentChild
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateOnly Deadline { get; set; }
    public bool IsMain { get; set; }
    public bool Completed { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class TodoFinanceExpense : TodoDocumentChild
{
    public string Id { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Group { get; set; } = "Other";
    public string Notes { get; set; } = string.Empty;
    public bool IsRecurring { get; set; }
    public string Recurrence { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class TodoMeasurementEntry : TodoDocumentChild
{
    public string Id { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
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
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class TodoRecipe : TodoDocumentChild
{
    public string Id { get; set; } = string.Empty;
    public string Kind { get; set; } = "recipe";
    public string Title { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string MacroText { get; set; } = string.Empty;
    public decimal? Calories { get; set; }
    public decimal? ProteinG { get; set; }
    public decimal? CarbsG { get; set; }
    public decimal? FatG { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public ICollection<TodoRecipeIngredient> Ingredients { get; set; } = [];
    public ICollection<TodoRecipeMethodStep> MethodSteps { get; set; } = [];
}

public sealed class TodoRecipeIngredient
{
    public byte TodoDocumentId { get; set; }
    public string RecipeId { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Text { get; set; } = string.Empty;
    public TodoRecipe Recipe { get; set; } = null!;
}

public sealed class TodoRecipeMethodStep
{
    public byte TodoDocumentId { get; set; }
    public string RecipeId { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Text { get; set; } = string.Empty;
    public TodoRecipe Recipe { get; set; } = null!;
}

public sealed class TodoDeletion : TodoDocumentChild
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public DateTimeOffset DeletedAtUtc { get; set; }
}

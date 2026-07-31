using ivone.dev.Data.Contexts;
using Ivone.dev.Data.Models.Todo;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Ivone.dev.Todo;

public sealed class TodoSqlStore
{
    public const int MaximumDocumentBytes = 2 * 1024 * 1024;

    private const byte SharedDocumentId = 1;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AppDbContext _dbContext;

    public TodoSqlStore(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<TodoStoredDocument?> ReadAsync(CancellationToken cancellationToken)
    {
        var document = await LoadDocumentGraph()
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == SharedDocumentId, cancellationToken);

        if (document is null)
        {
            return null;
        }

        var json = JsonSerializer.Serialize(ToPayload(document), JsonOptions);
        return new TodoStoredDocument(json, BuildETag(document.RowVersion));
    }

    public async Task<string> WriteAsync(
        JsonElement document,
        string? ifMatch,
        bool createOnly,
        CancellationToken cancellationToken)
    {
        if (document.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidDataException("The todo document must be a JSON object.");
        }

        var rawJson = document.GetRawText();
        if (Encoding.UTF8.GetByteCount(rawJson) > MaximumDocumentBytes)
        {
            throw new InvalidDataException("The todo document is too large.");
        }

        TodoDocumentPayload payload;
        try
        {
            payload = JsonSerializer.Deserialize<TodoDocumentPayload>(rawJson, JsonOptions)
                ?? throw new InvalidDataException("The todo document is empty.");
        }
        catch (JsonException exception)
        {
            throw new InvalidDataException("The todo document is not valid.", exception);
        }

        ValidatePayload(payload);

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var existing = await _dbContext.TodoDocuments
            .FromSqlInterpolated($"""
                SELECT *
                FROM dbo.TodoDocuments WITH (UPDLOCK, HOLDLOCK)
                WHERE Id = {SharedDocumentId}
                """)
            .SingleOrDefaultAsync(cancellationToken);
        var existingETag = existing is null ? null : BuildETag(existing.RowVersion);

        if ((createOnly && existing is not null) ||
            (ifMatch is not null && !ETagMatches(ifMatch, existingETag)))
        {
            throw new TodoPreconditionFailedException();
        }

        if (existing is null)
        {
            existing = new TodoDocument { Id = SharedDocumentId };
            _dbContext.TodoDocuments.Add(existing);
        }
        else
        {
            await DeleteExistingChildren(cancellationToken);
            _dbContext.Entry(existing)
                .Property(x => x.UpdatedAtUtc)
                .IsModified = true;
        }

        ApplyPayload(existing, payload);

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new TodoPreconditionFailedException(exception);
        }
        catch (DbUpdateException exception) when (IsUniqueConstraintViolation(exception))
        {
            throw new TodoPreconditionFailedException(exception);
        }

        return BuildETag(existing.RowVersion);
    }

    private IQueryable<TodoDocument> LoadDocumentGraph() =>
        _dbContext.TodoDocuments
            .AsSplitQuery()
            .Include(x => x.Groups)
            .Include(x => x.Notes).ThenInclude(x => x.Items)
            .Include(x => x.Notes).ThenInclude(x => x.Visits)
            .Include(x => x.CalendarEvents)
            .Include(x => x.MealEntries)
            .Include(x => x.Goals)
            .Include(x => x.FinanceExpenses)
            .Include(x => x.MeasurementEntries)
            .Include(x => x.Recipes).ThenInclude(x => x.Ingredients)
            .Include(x => x.Recipes).ThenInclude(x => x.MethodSteps)
            .Include(x => x.Deletions);

    private async Task DeleteExistingChildren(CancellationToken cancellationToken)
    {
        await _dbContext.Database.ExecuteSqlRawAsync("""
            DELETE FROM dbo.TodoDeletions WHERE TodoDocumentId = 1;
            DELETE FROM dbo.TodoFinanceExpenses WHERE TodoDocumentId = 1;
            DELETE FROM dbo.TodoRecipes WHERE TodoDocumentId = 1;
            DELETE FROM dbo.TodoMeasurementEntries WHERE TodoDocumentId = 1;
            DELETE FROM dbo.TodoGoals WHERE TodoDocumentId = 1;
            DELETE FROM dbo.TodoMealEntries WHERE TodoDocumentId = 1;
            DELETE FROM dbo.TodoCalendarEvents WHERE TodoDocumentId = 1;
            DELETE FROM dbo.TodoNotes WHERE TodoDocumentId = 1;
            DELETE FROM dbo.TodoGroups WHERE TodoDocumentId = 1;
            """, cancellationToken);
    }

    private static void ApplyPayload(TodoDocument target, TodoDocumentPayload payload)
    {
        var now = DateTimeOffset.UtcNow;
        target.SchemaVersion = payload.Version;
        target.UpdatedAtUtc = ParseTimestamp(payload.UpdatedAt, now);
        target.MeasurementUnit = payload.MeasurementUnit == "imperial" ? "imperial" : "metric";
        target.MeasurementSimplified = payload.MeasurementSimplified;
        target.FinanceMonthlyBudget = Math.Max(0m, payload.FinanceMonthlyBudget);
        target.FinanceCurrency = payload.FinanceCurrency == "EUR" ? "EUR" : "EUR";

        target.Groups = payload.Groups.Select(group => new TodoGroup
        {
            Document = target,
            Id = group.Id,
            Name = group.Name,
            Color = group.Color,
            CreatedAtUtc = ParseTimestamp(group.CreatedAt, now),
            ManualOrder = group.ManualOrder,
            OrderUpdatedAtUtc = ParseTimestamp(group.OrderUpdatedAt, now)
        }).ToList();

        target.Notes = payload.Notes.Select(note =>
        {
            var entity = new TodoNote
            {
                Document = target,
                Id = note.Id,
                GroupId = note.GroupId,
                Title = note.Title,
                CreatedAtUtc = ParseTimestamp(note.CreatedAt, now),
                UpdatedAtUtc = ParseTimestamp(note.UpdatedAt, now),
                Pinned = note.Pinned,
                ManualOrder = note.ManualOrder,
                OrderUpdatedAtUtc = ParseTimestamp(note.OrderUpdatedAt, now),
                LastVisitedAtUtc = ParseNullableTimestamp(note.LastVisitedAt)
            };
            FlattenItems(entity, note.Items, null);
            entity.Visits = note.Visits.Select(visit => new TodoNoteVisit
            {
                Note = entity,
                DeviceId = visit.Key,
                VisitCount = visit.Value
            }).ToList();
            return entity;
        }).ToList();

        target.CalendarEvents = payload.CalendarEvents.Select(item => new TodoCalendarEvent
        {
            Document = target,
            Id = item.Id,
            Title = item.Title,
            Date = ParseDate(item.Date),
            StartMinutes = item.StartMinutes,
            DurationMinutes = item.DurationMinutes,
            CreatedAtUtc = ParseTimestamp(item.CreatedAt, now),
            UpdatedAtUtc = ParseTimestamp(item.UpdatedAt, now)
        }).ToList();

        target.MealEntries = payload.MealEntries.Select(item => new TodoMealEntry
        {
            Document = target,
            Id = item.Id,
            Date = ParseDate(item.Date),
            StartMinutes = item.StartMinutes,
            RecipeId = item.RecipeId,
            RecipeTitle = item.RecipeTitle,
            PortionPercent = item.PortionPercent,
            Calories = item.Macros?.Calories,
            ProteinG = item.Macros?.ProteinG,
            CarbsG = item.Macros?.CarbsG,
            FatG = item.Macros?.FatG,
            CreatedAtUtc = ParseTimestamp(item.CreatedAt, now),
            UpdatedAtUtc = ParseTimestamp(item.UpdatedAt, now)
        }).ToList();

        target.Goals = payload.Goals.Select(item => new TodoGoal
        {
            Document = target,
            Id = item.Id,
            Title = item.Title,
            Deadline = ParseDate(item.Deadline),
            IsMain = item.IsMain,
            Completed = item.Completed,
            CreatedAtUtc = ParseTimestamp(item.CreatedAt, now),
            UpdatedAtUtc = ParseTimestamp(item.UpdatedAt, now)
        }).ToList();

        target.FinanceExpenses = payload.FinanceExpenses.Select(item => new TodoFinanceExpense
        {
            Document = target,
            Id = item.Id,
            Date = ParseDate(item.Date),
            Amount = item.Amount,
            Label = item.Label,
            Group = item.Group,
            Notes = item.Notes,
            IsRecurring = item.IsRecurring,
            Recurrence = item.IsRecurring ? item.Recurrence : string.Empty,
            CreatedAtUtc = ParseTimestamp(item.CreatedAt, now),
            UpdatedAtUtc = ParseTimestamp(item.UpdatedAt, now)
        }).ToList();

        target.MeasurementEntries = payload.MeasurementEntries.Select(item => new TodoMeasurementEntry
        {
            Document = target,
            Id = item.Id,
            Date = ParseDate(item.Date),
            Note = item.Note,
            DailyCalories = item.DailyCalories,
            WeightKg = item.WeightKg,
            BodyFatPercent = item.BodyFatPercent,
            NeckCm = item.NeckCm,
            ShouldersCm = item.ShouldersCm,
            ChestCm = item.ChestCm,
            WaistCm = item.WaistCm,
            HipsCm = item.HipsCm,
            UpperArmRelaxedCm = item.UpperArmRelaxedCm,
            UpperArmFlexedCm = item.UpperArmFlexedCm,
            LeftUpperArmCm = item.LeftUpperArmCm,
            RightUpperArmCm = item.RightUpperArmCm,
            LeftForearmCm = item.LeftForearmCm,
            RightForearmCm = item.RightForearmCm,
            LeftThighCm = item.LeftThighCm,
            RightThighCm = item.RightThighCm,
            LeftCalfCm = item.LeftCalfCm,
            RightCalfCm = item.RightCalfCm,
            CreatedAtUtc = ParseTimestamp(item.CreatedAt, now),
            UpdatedAtUtc = ParseTimestamp(item.UpdatedAt, now)
        }).ToList();

        target.Recipes = payload.Recipes.Select(item =>
        {
            var recipe = new TodoRecipe
            {
                Document = target,
                Id = item.Id,
                Kind = item.Kind == "food" ? "food" : "recipe",
                Title = item.Title,
                Notes = item.Notes,
                MacroText = item.MacroText,
                Calories = item.Macros?.Calories,
                ProteinG = item.Macros?.ProteinG,
                CarbsG = item.Macros?.CarbsG,
                FatG = item.Macros?.FatG,
                CreatedAtUtc = ParseTimestamp(item.CreatedAt, now),
                UpdatedAtUtc = ParseTimestamp(item.UpdatedAt, now)
            };
            recipe.Ingredients = item.Ingredients.Select((text, index) => new TodoRecipeIngredient
            {
                Recipe = recipe,
                SortOrder = index,
                Text = text
            }).ToList();
            recipe.MethodSteps = item.Method.Select((text, index) => new TodoRecipeMethodStep
            {
                Recipe = recipe,
                SortOrder = index,
                Text = text
            }).ToList();
            return recipe;
        }).ToList();

        target.Deletions = EnumerateDeletions(payload)
            .Select(item => new TodoDeletion
            {
                Document = target,
                EntityType = item.Type,
                EntityId = item.Id,
                DeletedAtUtc = ParseTimestamp(item.Timestamp, now)
            }).ToList();
    }

    private static TodoDocumentPayload ToPayload(TodoDocument document)
    {
        var payload = new TodoDocumentPayload
        {
            Version = document.SchemaVersion,
            UpdatedAt = FormatTimestamp(document.UpdatedAtUtc),
            MeasurementUnit = document.MeasurementUnit,
            MeasurementSimplified = document.MeasurementSimplified,
            FinanceMonthlyBudget = document.FinanceMonthlyBudget,
            FinanceCurrency = document.FinanceCurrency,
            Groups = document.Groups.OrderBy(x => x.Id).Select(x => new TodoGroupPayload
            {
                Id = x.Id,
                Name = x.Name,
                Color = x.Color,
                CreatedAt = FormatTimestamp(x.CreatedAtUtc),
                ManualOrder = x.ManualOrder,
                OrderUpdatedAt = FormatTimestamp(x.OrderUpdatedAtUtc)
            }).ToList(),
            Notes = document.Notes.OrderBy(x => x.Id).Select(x => new TodoNotePayload
            {
                Id = x.Id,
                GroupId = x.GroupId,
                Title = x.Title,
                Items = BuildItemTree(x.Items),
                CreatedAt = FormatTimestamp(x.CreatedAtUtc),
                UpdatedAt = FormatTimestamp(x.UpdatedAtUtc),
                Pinned = x.Pinned,
                ManualOrder = x.ManualOrder,
                OrderUpdatedAt = FormatTimestamp(x.OrderUpdatedAtUtc),
                LastVisitedAt = x.LastVisitedAtUtc is null ? null : FormatTimestamp(x.LastVisitedAtUtc.Value),
                Visits = x.Visits.OrderBy(v => v.DeviceId).ToDictionary(v => v.DeviceId, v => v.VisitCount)
            }).ToList(),
            CalendarEvents = document.CalendarEvents.OrderBy(x => x.Id).Select(x => new TodoCalendarEventPayload
            {
                Id = x.Id,
                Title = x.Title,
                Date = FormatDate(x.Date),
                StartMinutes = x.StartMinutes,
                DurationMinutes = x.DurationMinutes,
                CreatedAt = FormatTimestamp(x.CreatedAtUtc),
                UpdatedAt = FormatTimestamp(x.UpdatedAtUtc)
            }).ToList(),
            MealEntries = document.MealEntries.OrderBy(x => x.Id).Select(x => new TodoMealEntryPayload
            {
                Id = x.Id,
                Date = FormatDate(x.Date),
                StartMinutes = x.StartMinutes,
                RecipeId = x.RecipeId,
                RecipeTitle = x.RecipeTitle,
                PortionPercent = x.PortionPercent,
                Macros = ToMacros(x.Calories, x.ProteinG, x.CarbsG, x.FatG),
                CreatedAt = FormatTimestamp(x.CreatedAtUtc),
                UpdatedAt = FormatTimestamp(x.UpdatedAtUtc)
            }).ToList(),
            Goals = document.Goals.OrderBy(x => x.Id).Select(x => new TodoGoalPayload
            {
                Id = x.Id,
                Title = x.Title,
                Deadline = FormatDate(x.Deadline),
                IsMain = x.IsMain,
                Completed = x.Completed,
                CreatedAt = FormatTimestamp(x.CreatedAtUtc),
                UpdatedAt = FormatTimestamp(x.UpdatedAtUtc)
            }).ToList(),
            FinanceExpenses = document.FinanceExpenses.OrderBy(x => x.Id).Select(x => new TodoFinanceExpensePayload
            {
                Id = x.Id,
                Date = FormatDate(x.Date),
                Amount = x.Amount,
                Label = x.Label,
                Group = x.Group,
                Notes = x.Notes,
                IsRecurring = x.IsRecurring,
                Recurrence = x.Recurrence,
                CreatedAt = FormatTimestamp(x.CreatedAtUtc),
                UpdatedAt = FormatTimestamp(x.UpdatedAtUtc)
            }).ToList(),
            MeasurementEntries = document.MeasurementEntries.OrderBy(x => x.Id).Select(ToMeasurementPayload).ToList(),
            Recipes = document.Recipes.OrderBy(x => x.Id).Select(x => new TodoRecipePayload
            {
                Id = x.Id,
                Kind = x.Kind == "food" ? "food" : "recipe",
                Title = x.Title,
                Ingredients = x.Ingredients.OrderBy(line => line.SortOrder).Select(line => line.Text).ToList(),
                Method = x.MethodSteps.OrderBy(line => line.SortOrder).Select(line => line.Text).ToList(),
                Notes = x.Notes,
                MacroText = x.MacroText,
                Macros = ToMacros(x.Calories, x.ProteinG, x.CarbsG, x.FatG),
                CreatedAt = FormatTimestamp(x.CreatedAtUtc),
                UpdatedAt = FormatTimestamp(x.UpdatedAtUtc)
            }).ToList()
        };

        foreach (var deletion in document.Deletions.OrderBy(x => x.EntityType).ThenBy(x => x.EntityId))
        {
            var dictionary = deletion.EntityType switch
            {
                "note" => payload.DeletedNotes,
                "calendarEvent" => payload.DeletedCalendarEvents,
                "mealEntry" => payload.DeletedMealEntries,
                "goal" => payload.DeletedGoals,
                "financeExpense" => payload.DeletedFinanceExpenses,
                "measurementEntry" => payload.DeletedMeasurementEntries,
                "recipe" => payload.DeletedRecipes,
                _ => null
            };
            if (dictionary is not null)
            {
                dictionary[deletion.EntityId] = FormatTimestamp(deletion.DeletedAtUtc);
            }
        }

        return payload;
    }

    private static TodoMeasurementEntryPayload ToMeasurementPayload(TodoMeasurementEntry x) => new()
    {
        Id = x.Id,
        Date = FormatDate(x.Date),
        Note = x.Note,
        DailyCalories = x.DailyCalories,
        WeightKg = x.WeightKg,
        BodyFatPercent = x.BodyFatPercent,
        NeckCm = x.NeckCm,
        ShouldersCm = x.ShouldersCm,
        ChestCm = x.ChestCm,
        WaistCm = x.WaistCm,
        HipsCm = x.HipsCm,
        UpperArmRelaxedCm = x.UpperArmRelaxedCm,
        UpperArmFlexedCm = x.UpperArmFlexedCm,
        LeftUpperArmCm = x.LeftUpperArmCm,
        RightUpperArmCm = x.RightUpperArmCm,
        LeftForearmCm = x.LeftForearmCm,
        RightForearmCm = x.RightForearmCm,
        LeftThighCm = x.LeftThighCm,
        RightThighCm = x.RightThighCm,
        LeftCalfCm = x.LeftCalfCm,
        RightCalfCm = x.RightCalfCm,
        CreatedAt = FormatTimestamp(x.CreatedAtUtc),
        UpdatedAt = FormatTimestamp(x.UpdatedAtUtc)
    };

    private static void FlattenItems(TodoNote note, IEnumerable<TodoItemPayload> items, string? parentId)
    {
        var index = 0;
        foreach (var item in items)
        {
            note.Items.Add(new TodoNoteItem
            {
                Note = note,
                Id = item.Id,
                ParentItemId = parentId,
                SortOrder = index++,
                Text = item.Text,
                Status = item.Status,
                Collapsed = item.Collapsed
            });
            FlattenItems(note, item.Children, item.Id);
        }
    }

    private static List<TodoItemPayload> BuildItemTree(IEnumerable<TodoNoteItem> entities)
    {
        var payloads = entities.ToDictionary(x => x.Id, x => new TodoItemPayload
        {
            Id = x.Id,
            Text = x.Text,
            Status = x.Status,
            Collapsed = x.Collapsed
        });
        var roots = new List<(int SortOrder, TodoItemPayload Payload)>();
        foreach (var entity in entities)
        {
            var payload = payloads[entity.Id];
            if (entity.ParentItemId is not null && payloads.TryGetValue(entity.ParentItemId, out var parent))
            {
                parent.Children.Add(payload);
            }
            else
            {
                roots.Add((entity.SortOrder, payload));
            }
        }

        SortChildren(entities, payloads);
        return roots.OrderBy(x => x.SortOrder).Select(x => x.Payload).ToList();
    }

    private static void SortChildren(
        IEnumerable<TodoNoteItem> entities,
        IReadOnlyDictionary<string, TodoItemPayload> payloads)
    {
        var sortOrders = entities.ToDictionary(x => x.Id, x => x.SortOrder);
        foreach (var payload in payloads.Values)
        {
            payload.Children = payload.Children.OrderBy(x => sortOrders[x.Id]).ToList();
        }
    }

    private static IEnumerable<(string Type, string Id, string Timestamp)> EnumerateDeletions(
        TodoDocumentPayload payload)
    {
        return Entries("note", payload.DeletedNotes)
            .Concat(Entries("calendarEvent", payload.DeletedCalendarEvents))
            .Concat(Entries("mealEntry", payload.DeletedMealEntries))
            .Concat(Entries("goal", payload.DeletedGoals))
            .Concat(Entries("financeExpense", payload.DeletedFinanceExpenses))
            .Concat(Entries("measurementEntry", payload.DeletedMeasurementEntries))
            .Concat(Entries("recipe", payload.DeletedRecipes));

        static IEnumerable<(string, string, string)> Entries(
            string type,
            IReadOnlyDictionary<string, string> dictionary) =>
            dictionary.Select(item => (type, item.Key, item.Value));
    }

    private static TodoMacroPayload ToMacros(
        decimal? calories,
        decimal? proteinG,
        decimal? carbsG,
        decimal? fatG) => new()
        {
            Calories = calories,
            ProteinG = proteinG,
            CarbsG = carbsG,
            FatG = fatG
        };

    private static void ValidatePayload(TodoDocumentPayload payload)
    {
        EnsureUnique(payload.Groups.Select(x => x.Id), "group");
        EnsureUnique(payload.Notes.Select(x => x.Id), "note");
        EnsureUnique(payload.CalendarEvents.Select(x => x.Id), "calendar event");
        EnsureUnique(payload.MealEntries.Select(x => x.Id), "meal");
        EnsureUnique(payload.Goals.Select(x => x.Id), "goal");
        EnsureUnique(payload.FinanceExpenses.Select(x => x.Id), "finance expense");
        EnsureUnique(payload.MeasurementEntries.Select(x => x.Id), "measurement");
        EnsureUnique(payload.Recipes.Select(x => x.Id), "recipe");
        foreach (var note in payload.Notes)
        {
            EnsureUnique(EnumerateItemIds(note.Items), $"item in note {note.Id}");
        }
    }

    private static IEnumerable<string> EnumerateItemIds(IEnumerable<TodoItemPayload> items)
    {
        foreach (var item in items)
        {
            yield return item.Id;
            foreach (var childId in EnumerateItemIds(item.Children))
            {
                yield return childId;
            }
        }
    }

    private static void EnsureUnique(IEnumerable<string> ids, string entityName)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var id in ids)
        {
            if (string.IsNullOrWhiteSpace(id) || !seen.Add(id))
            {
                throw new InvalidDataException($"Every {entityName} must have a unique ID.");
            }
        }
    }

    private static DateTimeOffset ParseTimestamp(string? value, DateTimeOffset fallback) =>
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed)
            ? parsed
            : fallback;

    private static DateTimeOffset? ParseNullableTimestamp(string? value) =>
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed)
            ? parsed
            : null;

    private static DateOnly ParseDate(string value) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)
            ? parsed
            : DateOnly.FromDateTime(DateTime.UtcNow);

    private static string FormatTimestamp(DateTimeOffset value) =>
        value.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);

    private static string FormatDate(DateOnly value) =>
        value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static string BuildETag(byte[] rowVersion) =>
        $"\"{Convert.ToHexString(rowVersion)}\"";

    private static bool ETagMatches(string ifMatch, string? currentETag) =>
        currentETag is not null &&
        ifMatch.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Any(candidate => candidate == "*" ||
                              string.Equals(
                                  NormalizeETag(candidate),
                                  NormalizeETag(currentETag),
                                  StringComparison.Ordinal));

    private static string NormalizeETag(string value) =>
        value.StartsWith("W/", StringComparison.OrdinalIgnoreCase)
            ? value[2..]
            : value;

    private static bool IsUniqueConstraintViolation(DbUpdateException exception) =>
        exception.InnerException is SqlException { Number: 2601 or 2627 };
}

public sealed record TodoStoredDocument(string Json, string ETag);

public sealed class TodoPreconditionFailedException : Exception
{
    public TodoPreconditionFailedException()
    {
    }

    public TodoPreconditionFailedException(Exception innerException)
        : base("The shared Todo document changed while it was being saved.", innerException)
    {
    }
}

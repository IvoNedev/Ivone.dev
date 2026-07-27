using Ivone.dev.Data.Models.Todo;
using Microsoft.EntityFrameworkCore;

namespace ivone.dev.Data.Contexts;

internal static class TodoModelConfiguration
{
    public static void ConfigureTodoModel(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TodoDocument>(entity =>
        {
            entity.ToTable("TodoDocuments", table =>
                table.HasCheckConstraint("CK_TodoDocuments_SharedId", "[Id] = 1"));
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.UpdatedAtUtc).HasColumnType("datetimeoffset(7)");
            entity.Property(x => x.MeasurementUnit).HasMaxLength(16).IsRequired();
            entity.Property(x => x.RowVersion).IsRowVersion();
        });

        ConfigureDocumentChild<TodoGroup>(modelBuilder, "TodoGroups", x => x.Groups);
        modelBuilder.Entity<TodoGroup>(entity =>
        {
            entity.HasKey(x => new { x.TodoDocumentId, x.Id });
            entity.Property(x => x.Id).HasMaxLength(160);
            entity.Property(x => x.Name).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Color).HasMaxLength(7).IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasColumnType("datetimeoffset(7)");
            entity.Property(x => x.ManualOrder).HasColumnType("decimal(18,6)");
            entity.Property(x => x.OrderUpdatedAtUtc).HasColumnType("datetimeoffset(7)");
        });

        ConfigureDocumentChild<TodoNote>(modelBuilder, "TodoNotes", x => x.Notes);
        modelBuilder.Entity<TodoNote>(entity =>
        {
            entity.HasKey(x => new { x.TodoDocumentId, x.Id });
            entity.Property(x => x.Id).HasMaxLength(160);
            entity.Property(x => x.GroupId).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(180).IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasColumnType("datetimeoffset(7)");
            entity.Property(x => x.UpdatedAtUtc).HasColumnType("datetimeoffset(7)");
            entity.Property(x => x.ManualOrder).HasColumnType("decimal(18,6)");
            entity.Property(x => x.OrderUpdatedAtUtc).HasColumnType("datetimeoffset(7)");
            entity.Property(x => x.LastVisitedAtUtc).HasColumnType("datetimeoffset(7)");
            entity.HasIndex(x => new { x.TodoDocumentId, x.GroupId });
        });

        modelBuilder.Entity<TodoNoteItem>(entity =>
        {
            entity.ToTable("TodoNoteItems");
            entity.HasKey(x => new { x.TodoDocumentId, x.NoteId, x.Id });
            entity.Property(x => x.NoteId).HasMaxLength(160);
            entity.Property(x => x.Id).HasMaxLength(160);
            entity.Property(x => x.ParentItemId).HasMaxLength(160);
            entity.Property(x => x.Text).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(x => x.Status).HasMaxLength(16).IsRequired();
            entity.HasIndex(x => new { x.TodoDocumentId, x.NoteId, x.ParentItemId, x.SortOrder });
            entity.HasOne(x => x.Note)
                .WithMany(x => x.Items)
                .HasForeignKey(x => new { x.TodoDocumentId, x.NoteId })
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TodoNoteVisit>(entity =>
        {
            entity.ToTable("TodoNoteVisits");
            entity.HasKey(x => new { x.TodoDocumentId, x.NoteId, x.DeviceId });
            entity.Property(x => x.NoteId).HasMaxLength(160);
            entity.Property(x => x.DeviceId).HasMaxLength(160);
            entity.HasOne(x => x.Note)
                .WithMany(x => x.Visits)
                .HasForeignKey(x => new { x.TodoDocumentId, x.NoteId })
                .OnDelete(DeleteBehavior.Cascade);
        });

        ConfigureDocumentChild<TodoCalendarEvent>(modelBuilder, "TodoCalendarEvents", x => x.CalendarEvents);
        modelBuilder.Entity<TodoCalendarEvent>(entity =>
        {
            entity.HasKey(x => new { x.TodoDocumentId, x.Id });
            ConfigureCommonId(entity);
            entity.Property(x => x.Title).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Date).HasColumnType("date");
            ConfigureAuditDates(entity);
            entity.HasIndex(x => new { x.TodoDocumentId, x.Date, x.StartMinutes });
        });

        ConfigureDocumentChild<TodoMealEntry>(modelBuilder, "TodoMealEntries", x => x.MealEntries);
        modelBuilder.Entity<TodoMealEntry>(entity =>
        {
            entity.HasKey(x => new { x.TodoDocumentId, x.Id });
            ConfigureCommonId(entity);
            entity.Property(x => x.Date).HasColumnType("date");
            entity.Property(x => x.RecipeId).HasMaxLength(160).IsRequired();
            entity.Property(x => x.RecipeTitle).HasMaxLength(180).IsRequired();
            entity.Property(x => x.PortionPercent).HasColumnType("decimal(7,1)");
            ConfigureMacros(entity);
            ConfigureAuditDates(entity);
            entity.HasIndex(x => new { x.TodoDocumentId, x.Date, x.StartMinutes });
        });

        ConfigureDocumentChild<TodoGoal>(modelBuilder, "TodoGoals", x => x.Goals);
        modelBuilder.Entity<TodoGoal>(entity =>
        {
            entity.HasKey(x => new { x.TodoDocumentId, x.Id });
            ConfigureCommonId(entity);
            entity.Property(x => x.Title).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Deadline).HasColumnType("date");
            ConfigureAuditDates(entity);
        });

        ConfigureDocumentChild<TodoMeasurementEntry>(modelBuilder, "TodoMeasurementEntries", x => x.MeasurementEntries);
        modelBuilder.Entity<TodoMeasurementEntry>(entity =>
        {
            entity.HasKey(x => new { x.TodoDocumentId, x.Id });
            ConfigureCommonId(entity);
            entity.Property(x => x.Date).HasColumnType("date");
            entity.Property(x => x.Note).HasMaxLength(500).IsRequired();
            foreach (var propertyName in MeasurementPropertyNames)
            {
                entity.Property(propertyName).HasColumnType("decimal(10,2)");
            }
            ConfigureAuditDates(entity);
            entity.HasIndex(x => new { x.TodoDocumentId, x.Date });
        });

        ConfigureDocumentChild<TodoRecipe>(modelBuilder, "TodoRecipes", x => x.Recipes);
        modelBuilder.Entity<TodoRecipe>(entity =>
        {
            entity.HasKey(x => new { x.TodoDocumentId, x.Id });
            ConfigureCommonId(entity);
            entity.Property(x => x.Kind).HasMaxLength(16).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(4000).IsRequired();
            entity.Property(x => x.MacroText).HasMaxLength(1000).IsRequired();
            ConfigureMacros(entity);
            ConfigureAuditDates(entity);
        });

        modelBuilder.Entity<TodoRecipeIngredient>(entity =>
        {
            entity.ToTable("TodoRecipeIngredients");
            entity.HasKey(x => new { x.TodoDocumentId, x.RecipeId, x.SortOrder });
            entity.Property(x => x.RecipeId).HasMaxLength(160);
            entity.Property(x => x.Text).HasMaxLength(1000).IsRequired();
            entity.HasOne(x => x.Recipe)
                .WithMany(x => x.Ingredients)
                .HasForeignKey(x => new { x.TodoDocumentId, x.RecipeId })
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TodoRecipeMethodStep>(entity =>
        {
            entity.ToTable("TodoRecipeMethodSteps");
            entity.HasKey(x => new { x.TodoDocumentId, x.RecipeId, x.SortOrder });
            entity.Property(x => x.RecipeId).HasMaxLength(160);
            entity.Property(x => x.Text).HasMaxLength(1000).IsRequired();
            entity.HasOne(x => x.Recipe)
                .WithMany(x => x.MethodSteps)
                .HasForeignKey(x => new { x.TodoDocumentId, x.RecipeId })
                .OnDelete(DeleteBehavior.Cascade);
        });

        ConfigureDocumentChild<TodoDeletion>(modelBuilder, "TodoDeletions", x => x.Deletions);
        modelBuilder.Entity<TodoDeletion>(entity =>
        {
            entity.HasKey(x => new { x.TodoDocumentId, x.EntityType, x.EntityId });
            entity.Property(x => x.EntityType).HasMaxLength(32);
            entity.Property(x => x.EntityId).HasMaxLength(160);
            entity.Property(x => x.DeletedAtUtc).HasColumnType("datetimeoffset(7)");
        });
    }

    private static readonly string[] MeasurementPropertyNames =
    [
        nameof(TodoMeasurementEntry.DailyCalories),
        nameof(TodoMeasurementEntry.WeightKg),
        nameof(TodoMeasurementEntry.BodyFatPercent),
        nameof(TodoMeasurementEntry.NeckCm),
        nameof(TodoMeasurementEntry.ShouldersCm),
        nameof(TodoMeasurementEntry.ChestCm),
        nameof(TodoMeasurementEntry.WaistCm),
        nameof(TodoMeasurementEntry.HipsCm),
        nameof(TodoMeasurementEntry.UpperArmRelaxedCm),
        nameof(TodoMeasurementEntry.UpperArmFlexedCm),
        nameof(TodoMeasurementEntry.LeftUpperArmCm),
        nameof(TodoMeasurementEntry.RightUpperArmCm),
        nameof(TodoMeasurementEntry.LeftForearmCm),
        nameof(TodoMeasurementEntry.RightForearmCm),
        nameof(TodoMeasurementEntry.LeftThighCm),
        nameof(TodoMeasurementEntry.RightThighCm),
        nameof(TodoMeasurementEntry.LeftCalfCm),
        nameof(TodoMeasurementEntry.RightCalfCm)
    ];

    private static void ConfigureDocumentChild<TEntity>(
        ModelBuilder modelBuilder,
        string tableName,
        System.Linq.Expressions.Expression<Func<TodoDocument, IEnumerable<TEntity>?>> navigation)
        where TEntity : TodoDocumentChild
    {
        modelBuilder.Entity<TEntity>(entity =>
        {
            entity.ToTable(tableName);
            entity.HasOne(x => x.Document)
                .WithMany(navigation)
                .HasForeignKey(x => x.TodoDocumentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureCommonId<TEntity>(
        Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> entity)
        where TEntity : TodoDocumentChild
    {
        entity.Property("Id").HasMaxLength(160);
    }

    private static void ConfigureAuditDates<TEntity>(
        Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> entity)
        where TEntity : class
    {
        entity.Property("CreatedAtUtc").HasColumnType("datetimeoffset(7)");
        entity.Property("UpdatedAtUtc").HasColumnType("datetimeoffset(7)");
    }

    private static void ConfigureMacros<TEntity>(
        Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> entity)
        where TEntity : class
    {
        entity.Property("Calories").HasColumnType("decimal(10,1)");
        entity.Property("ProteinG").HasColumnType("decimal(10,1)");
        entity.Property("CarbsG").HasColumnType("decimal(10,1)");
        entity.Property("FatG").HasColumnType("decimal(10,1)");
    }
}

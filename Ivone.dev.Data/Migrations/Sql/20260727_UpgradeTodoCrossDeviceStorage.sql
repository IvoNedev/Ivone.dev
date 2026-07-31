/*
    Safe upgrade for an existing relational Todo database.
    This script does not replace or seed Todo data.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.TodoDocuments', N'U') IS NULL
        THROW 50001, 'TodoDocuments is missing. Run 20260727_CreateAndSeedTodoStorage.sql first.', 1;

    IF OBJECT_ID(N'dbo.TodoMeasurementEntries', N'U') IS NULL
        THROW 50002, 'TodoMeasurementEntries is missing. Run 20260727_CreateAndSeedTodoStorage.sql first.', 1;

    IF OBJECT_ID(N'dbo.TodoRecipes', N'U') IS NULL
        THROW 50003, 'TodoRecipes is missing. Run 20260727_CreateAndSeedTodoStorage.sql first.', 1;

    IF COL_LENGTH(N'dbo.TodoMeasurementEntries', N'DailyCalories') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE dbo.TodoMeasurementEntries
            ADD DailyCalories decimal(10,2) NULL;');
    END;

    IF COL_LENGTH(N'dbo.TodoRecipes', N'Kind') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE dbo.TodoRecipes
            ADD Kind nvarchar(16) NOT NULL
                CONSTRAINT DF_TodoRecipes_Kind DEFAULT N''recipe'';');
    END;

    IF COL_LENGTH(N'dbo.TodoDocuments', N'FinanceMonthlyBudget') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE dbo.TodoDocuments
            ADD FinanceMonthlyBudget decimal(18,2) NOT NULL
                CONSTRAINT DF_TodoDocuments_FinanceMonthlyBudget DEFAULT 0;');
    END;

    IF COL_LENGTH(N'dbo.TodoDocuments', N'FinanceCurrency') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE dbo.TodoDocuments
            ADD FinanceCurrency nvarchar(3) NOT NULL
                CONSTRAINT DF_TodoDocuments_FinanceCurrency DEFAULT N''EUR'';');
    END;

    IF OBJECT_ID(N'dbo.TodoFinanceExpenses', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.TodoFinanceExpenses
        (
            TodoDocumentId tinyint NOT NULL,
            Id nvarchar(160) NOT NULL,
            [Date] date NOT NULL,
            Amount decimal(18,2) NOT NULL,
            Label nvarchar(160) NOT NULL,
            [Group] nvarchar(60) NOT NULL,
            Notes nvarchar(1000) NOT NULL CONSTRAINT DF_TodoFinanceExpenses_Notes DEFAULT N'',
            IsRecurring bit NOT NULL CONSTRAINT DF_TodoFinanceExpenses_IsRecurring DEFAULT 0,
            Recurrence nvarchar(16) NOT NULL CONSTRAINT DF_TodoFinanceExpenses_Recurrence DEFAULT N'',
            CreatedAtUtc datetimeoffset(7) NOT NULL,
            UpdatedAtUtc datetimeoffset(7) NOT NULL,
            CONSTRAINT PK_TodoFinanceExpenses PRIMARY KEY (TodoDocumentId, Id),
            CONSTRAINT FK_TodoFinanceExpenses_TodoDocuments
                FOREIGN KEY (TodoDocumentId) REFERENCES dbo.TodoDocuments(Id) ON DELETE CASCADE,
            CONSTRAINT CK_TodoFinanceExpenses_Amount CHECK (Amount > 0)
        );
        CREATE INDEX IX_TodoFinanceExpenses_Document_Date
            ON dbo.TodoFinanceExpenses(TodoDocumentId, [Date]);
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT
    COL_LENGTH(N'dbo.TodoMeasurementEntries', N'DailyCalories') AS DailyCaloriesColumnBytes,
    COL_LENGTH(N'dbo.TodoRecipes', N'Kind') AS RecipeKindColumnBytes,
    COL_LENGTH(N'dbo.TodoDocuments', N'FinanceMonthlyBudget') AS FinanceBudgetColumnBytes,
    OBJECT_ID(N'dbo.TodoFinanceExpenses', N'U') AS FinanceExpensesTableId;

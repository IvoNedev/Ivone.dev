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

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT
    COL_LENGTH(N'dbo.TodoMeasurementEntries', N'DailyCalories') AS DailyCaloriesColumnBytes,
    COL_LENGTH(N'dbo.TodoRecipes', N'Kind') AS RecipeKindColumnBytes;

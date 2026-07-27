/*
    Relational Todo storage and explicit seed values from:
    todo-backup-2026-07-27.json

    Run against the database configured by DefaultConnection.
    The script is safe to rerun and does not overwrite an existing Todo document
    unless @ReplaceExistingDocument is deliberately changed to 1.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ReplaceExistingDocument bit = 0;
DECLARE @DocumentId tinyint = 1;
DECLARE @TodoRecipesNeedsKindUpgrade bit =
    CASE
        WHEN OBJECT_ID(N'dbo.TodoRecipes', N'U') IS NOT NULL
         AND COL_LENGTH(N'dbo.TodoRecipes', N'Kind') IS NULL
        THEN 1
        ELSE 0
    END;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.TodoDocuments', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.TodoDocuments
        (
            Id tinyint NOT NULL,
            SchemaVersion int NOT NULL,
            UpdatedAtUtc datetimeoffset(7) NOT NULL,
            MeasurementUnit nvarchar(16) NOT NULL,
            MeasurementSimplified bit NOT NULL,
            RowVersion rowversion NOT NULL,
            CONSTRAINT PK_TodoDocuments PRIMARY KEY (Id),
            CONSTRAINT CK_TodoDocuments_SharedId CHECK (Id = 1)
        );

        CREATE TABLE dbo.TodoGroups
        (
            TodoDocumentId tinyint NOT NULL,
            Id nvarchar(160) NOT NULL,
            Name nvarchar(40) NOT NULL,
            Color nvarchar(7) NOT NULL,
            CreatedAtUtc datetimeoffset(7) NOT NULL,
            ManualOrder decimal(18,6) NULL,
            OrderUpdatedAtUtc datetimeoffset(7) NOT NULL,
            CONSTRAINT PK_TodoGroups PRIMARY KEY (TodoDocumentId, Id),
            CONSTRAINT FK_TodoGroups_TodoDocuments FOREIGN KEY (TodoDocumentId)
                REFERENCES dbo.TodoDocuments(Id) ON DELETE CASCADE
        );

        CREATE TABLE dbo.TodoNotes
        (
            TodoDocumentId tinyint NOT NULL,
            Id nvarchar(160) NOT NULL,
            GroupId nvarchar(160) NOT NULL,
            Title nvarchar(180) NOT NULL,
            CreatedAtUtc datetimeoffset(7) NOT NULL,
            UpdatedAtUtc datetimeoffset(7) NOT NULL,
            Pinned bit NOT NULL,
            ManualOrder decimal(18,6) NULL,
            OrderUpdatedAtUtc datetimeoffset(7) NOT NULL,
            LastVisitedAtUtc datetimeoffset(7) NULL,
            CONSTRAINT PK_TodoNotes PRIMARY KEY (TodoDocumentId, Id),
            CONSTRAINT FK_TodoNotes_TodoDocuments FOREIGN KEY (TodoDocumentId)
                REFERENCES dbo.TodoDocuments(Id) ON DELETE CASCADE
        );
        CREATE INDEX IX_TodoNotes_TodoDocumentId_GroupId
            ON dbo.TodoNotes(TodoDocumentId, GroupId);

        CREATE TABLE dbo.TodoNoteItems
        (
            TodoDocumentId tinyint NOT NULL,
            NoteId nvarchar(160) NOT NULL,
            Id nvarchar(160) NOT NULL,
            ParentItemId nvarchar(160) NULL,
            SortOrder int NOT NULL,
            Text nvarchar(max) NOT NULL,
            Status nvarchar(16) NOT NULL,
            Collapsed bit NOT NULL,
            CONSTRAINT PK_TodoNoteItems PRIMARY KEY (TodoDocumentId, NoteId, Id),
            CONSTRAINT FK_TodoNoteItems_TodoNotes FOREIGN KEY (TodoDocumentId, NoteId)
                REFERENCES dbo.TodoNotes(TodoDocumentId, Id) ON DELETE CASCADE
        );
        CREATE INDEX IX_TodoNoteItems_ParentOrder
            ON dbo.TodoNoteItems(TodoDocumentId, NoteId, ParentItemId, SortOrder);

        CREATE TABLE dbo.TodoNoteVisits
        (
            TodoDocumentId tinyint NOT NULL,
            NoteId nvarchar(160) NOT NULL,
            DeviceId nvarchar(160) NOT NULL,
            VisitCount int NOT NULL,
            CONSTRAINT PK_TodoNoteVisits PRIMARY KEY (TodoDocumentId, NoteId, DeviceId),
            CONSTRAINT FK_TodoNoteVisits_TodoNotes FOREIGN KEY (TodoDocumentId, NoteId)
                REFERENCES dbo.TodoNotes(TodoDocumentId, Id) ON DELETE CASCADE
        );

        CREATE TABLE dbo.TodoCalendarEvents
        (
            TodoDocumentId tinyint NOT NULL,
            Id nvarchar(160) NOT NULL,
            Title nvarchar(180) NOT NULL,
            Date date NOT NULL,
            StartMinutes int NOT NULL,
            DurationMinutes int NOT NULL,
            CreatedAtUtc datetimeoffset(7) NOT NULL,
            UpdatedAtUtc datetimeoffset(7) NOT NULL,
            CONSTRAINT PK_TodoCalendarEvents PRIMARY KEY (TodoDocumentId, Id),
            CONSTRAINT FK_TodoCalendarEvents_TodoDocuments FOREIGN KEY (TodoDocumentId)
                REFERENCES dbo.TodoDocuments(Id) ON DELETE CASCADE
        );
        CREATE INDEX IX_TodoCalendarEvents_DateTime
            ON dbo.TodoCalendarEvents(TodoDocumentId, Date, StartMinutes);

        CREATE TABLE dbo.TodoMealEntries
        (
            TodoDocumentId tinyint NOT NULL,
            Id nvarchar(160) NOT NULL,
            Date date NOT NULL,
            StartMinutes int NOT NULL,
            RecipeId nvarchar(160) NOT NULL,
            RecipeTitle nvarchar(180) NOT NULL,
            PortionPercent decimal(7,1) NOT NULL,
            Calories decimal(10,1) NULL,
            ProteinG decimal(10,1) NULL,
            CarbsG decimal(10,1) NULL,
            FatG decimal(10,1) NULL,
            CreatedAtUtc datetimeoffset(7) NOT NULL,
            UpdatedAtUtc datetimeoffset(7) NOT NULL,
            CONSTRAINT PK_TodoMealEntries PRIMARY KEY (TodoDocumentId, Id),
            CONSTRAINT FK_TodoMealEntries_TodoDocuments FOREIGN KEY (TodoDocumentId)
                REFERENCES dbo.TodoDocuments(Id) ON DELETE CASCADE
        );
        CREATE INDEX IX_TodoMealEntries_DateTime
            ON dbo.TodoMealEntries(TodoDocumentId, Date, StartMinutes);

        CREATE TABLE dbo.TodoGoals
        (
            TodoDocumentId tinyint NOT NULL,
            Id nvarchar(160) NOT NULL,
            Title nvarchar(180) NOT NULL,
            Deadline date NOT NULL,
            IsMain bit NOT NULL,
            Completed bit NOT NULL,
            CreatedAtUtc datetimeoffset(7) NOT NULL,
            UpdatedAtUtc datetimeoffset(7) NOT NULL,
            CONSTRAINT PK_TodoGoals PRIMARY KEY (TodoDocumentId, Id),
            CONSTRAINT FK_TodoGoals_TodoDocuments FOREIGN KEY (TodoDocumentId)
                REFERENCES dbo.TodoDocuments(Id) ON DELETE CASCADE
        );

        CREATE TABLE dbo.TodoMeasurementEntries
        (
            TodoDocumentId tinyint NOT NULL,
            Id nvarchar(160) NOT NULL,
            Date date NOT NULL,
            Note nvarchar(500) NOT NULL,
            DailyCalories decimal(10,2) NULL,
            WeightKg decimal(10,2) NULL,
            BodyFatPercent decimal(10,2) NULL,
            NeckCm decimal(10,2) NULL,
            ShouldersCm decimal(10,2) NULL,
            ChestCm decimal(10,2) NULL,
            WaistCm decimal(10,2) NULL,
            HipsCm decimal(10,2) NULL,
            UpperArmRelaxedCm decimal(10,2) NULL,
            UpperArmFlexedCm decimal(10,2) NULL,
            LeftUpperArmCm decimal(10,2) NULL,
            RightUpperArmCm decimal(10,2) NULL,
            LeftForearmCm decimal(10,2) NULL,
            RightForearmCm decimal(10,2) NULL,
            LeftThighCm decimal(10,2) NULL,
            RightThighCm decimal(10,2) NULL,
            LeftCalfCm decimal(10,2) NULL,
            RightCalfCm decimal(10,2) NULL,
            CreatedAtUtc datetimeoffset(7) NOT NULL,
            UpdatedAtUtc datetimeoffset(7) NOT NULL,
            CONSTRAINT PK_TodoMeasurementEntries PRIMARY KEY (TodoDocumentId, Id),
            CONSTRAINT FK_TodoMeasurementEntries_TodoDocuments FOREIGN KEY (TodoDocumentId)
                REFERENCES dbo.TodoDocuments(Id) ON DELETE CASCADE
        );
        CREATE INDEX IX_TodoMeasurementEntries_Date
            ON dbo.TodoMeasurementEntries(TodoDocumentId, Date);

        CREATE TABLE dbo.TodoRecipes
        (
            TodoDocumentId tinyint NOT NULL,
            Id nvarchar(160) NOT NULL,
            Kind nvarchar(16) NOT NULL CONSTRAINT DF_TodoRecipes_Kind DEFAULT N'recipe',
            Title nvarchar(180) NOT NULL,
            Notes nvarchar(4000) NOT NULL,
            MacroText nvarchar(1000) NOT NULL,
            Calories decimal(10,1) NULL,
            ProteinG decimal(10,1) NULL,
            CarbsG decimal(10,1) NULL,
            FatG decimal(10,1) NULL,
            CreatedAtUtc datetimeoffset(7) NOT NULL,
            UpdatedAtUtc datetimeoffset(7) NOT NULL,
            CONSTRAINT PK_TodoRecipes PRIMARY KEY (TodoDocumentId, Id),
            CONSTRAINT FK_TodoRecipes_TodoDocuments FOREIGN KEY (TodoDocumentId)
                REFERENCES dbo.TodoDocuments(Id) ON DELETE CASCADE
        );

        CREATE TABLE dbo.TodoRecipeIngredients
        (
            TodoDocumentId tinyint NOT NULL,
            RecipeId nvarchar(160) NOT NULL,
            SortOrder int NOT NULL,
            Text nvarchar(1000) NOT NULL,
            CONSTRAINT PK_TodoRecipeIngredients PRIMARY KEY (TodoDocumentId, RecipeId, SortOrder),
            CONSTRAINT FK_TodoRecipeIngredients_TodoRecipes FOREIGN KEY (TodoDocumentId, RecipeId)
                REFERENCES dbo.TodoRecipes(TodoDocumentId, Id) ON DELETE CASCADE
        );

        CREATE TABLE dbo.TodoRecipeMethodSteps
        (
            TodoDocumentId tinyint NOT NULL,
            RecipeId nvarchar(160) NOT NULL,
            SortOrder int NOT NULL,
            Text nvarchar(1000) NOT NULL,
            CONSTRAINT PK_TodoRecipeMethodSteps PRIMARY KEY (TodoDocumentId, RecipeId, SortOrder),
            CONSTRAINT FK_TodoRecipeMethodSteps_TodoRecipes FOREIGN KEY (TodoDocumentId, RecipeId)
                REFERENCES dbo.TodoRecipes(TodoDocumentId, Id) ON DELETE CASCADE
        );

        CREATE TABLE dbo.TodoDeletions
        (
            TodoDocumentId tinyint NOT NULL,
            EntityType nvarchar(32) NOT NULL,
            EntityId nvarchar(160) NOT NULL,
            DeletedAtUtc datetimeoffset(7) NOT NULL,
            CONSTRAINT PK_TodoDeletions PRIMARY KEY (TodoDocumentId, EntityType, EntityId),
            CONSTRAINT FK_TodoDeletions_TodoDocuments FOREIGN KEY (TodoDocumentId)
                REFERENCES dbo.TodoDocuments(Id) ON DELETE CASCADE
        );
    END;

    IF @TodoRecipesNeedsKindUpgrade = 1
    BEGIN
        EXEC(N'ALTER TABLE dbo.TodoRecipes
            ADD Kind nvarchar(16) NOT NULL
                CONSTRAINT DF_TodoRecipes_Kind DEFAULT N''recipe'';');
    END;

    IF @ReplaceExistingDocument = 1
        DELETE FROM dbo.TodoDocuments WHERE Id = @DocumentId;

    IF NOT EXISTS (SELECT 1 FROM dbo.TodoDocuments WITH (UPDLOCK, HOLDLOCK) WHERE Id = @DocumentId)
    BEGIN
        INSERT dbo.TodoDocuments
            (Id, SchemaVersion, UpdatedAtUtc, MeasurementUnit, MeasurementSimplified)
        VALUES
            (1, 8, '2026-07-23T15:41:57.955Z', N'metric', 1);

        INSERT dbo.TodoGroups
            (TodoDocumentId, Id, Name, Color, CreatedAtUtc, ManualOrder, OrderUpdatedAtUtc)
        VALUES
            (1,N'calendar',N'Calendar',N'#c74363','2026-07-14T15:00:39.769Z',NULL,'2026-07-14T15:00:39.769Z'),
            (1,N'diy',N'DIY',N'#d18a0c','2026-07-13T21:53:38.070Z',0,'2026-07-18T17:00:29.246Z'),
            (1,N'fitness',N'Fitness',N'#247a4b','2026-07-13T21:53:38.070Z',1,'2026-07-18T17:00:29.246Z'),
            (1,N'group-cdebd73f-8fc8-4084-9d08-575dbd299e84',N'Instagram',N'#8a52cc','2026-07-18T17:00:29.246Z',5,'2026-07-18T17:00:29.246Z'),
            (1,N'hobby',N'Hobby',N'#8a52cc','2026-07-13T21:53:38.070Z',2,'2026-07-18T17:00:29.246Z'),
            (1,N'home',N'Home',N'#225ee8','2026-07-13T21:53:38.070Z',3,'2026-07-18T17:00:29.246Z'),
            (1,N'work',N'Work',N'#f06b3f','2026-07-13T21:53:38.070Z',4,'2026-07-18T17:00:29.246Z');

        INSERT dbo.TodoNotes
            (TodoDocumentId, Id, GroupId, Title, CreatedAtUtc, UpdatedAtUtc, Pinned, ManualOrder, OrderUpdatedAtUtc, LastVisitedAtUtc)
        VALUES
            (1,N'note-0f9151f1-20d9-463b-9f4f-8f0e028eb960',N'work',N'Skills','2026-07-21T15:03:01.948Z','2026-07-21T15:03:15.993Z',0,NULL,'2026-07-21T15:03:01.948Z','2026-07-21T15:03:01.948Z'),
            (1,N'note-2cc5883c-ddad-4f38-9aa6-3ce9de107045',N'diy',N'Physics game ','2026-07-21T12:21:57.974Z','2026-07-21T12:24:39.687Z',0,NULL,'2026-07-21T12:21:57.974Z','2026-07-21T12:22:40.249Z'),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'home',N'Apte4ka','2026-07-22T06:47:20.799Z','2026-07-22T06:48:16.351Z',0,NULL,'2026-07-22T06:47:20.799Z','2026-07-22T06:47:20.799Z'),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'fitness',N'Cycling ','2026-07-22T16:22:58.880Z','2026-07-22T17:52:36.560Z',0,NULL,'2026-07-22T16:22:58.880Z','2026-07-22T16:22:58.880Z'),
            (1,N'note-c651a010-f839-4dc9-b521-893f19f611ad',N'group-cdebd73f-8fc8-4084-9d08-575dbd299e84',N'Content ideas','2026-07-18T17:00:33.139Z','2026-07-18T17:02:57.169Z',0,NULL,'2026-07-18T17:00:33.139Z','2026-07-18T17:00:33.139Z'),
            (1,N'note-dd7b472f-36a2-48f0-ba48-4477a7a09212',N'diy',N'ToDo app','2026-07-16T18:27:49.661Z','2026-07-23T15:41:57.955Z',0,NULL,'2026-07-16T18:27:49.661Z','2026-07-23T15:40:42.918Z');

        INSERT dbo.TodoNoteItems
            (TodoDocumentId, NoteId, Id, ParentItemId, SortOrder, Text, Status, Collapsed)
        VALUES
            (1,N'note-0f9151f1-20d9-463b-9f4f-8f0e028eb960',N'item-cadc0755-8076-4e8c-957e-a84c861c6265',NULL,0,N'Wach rhis https://www.instagram.com/reel/DamD_baRT8H/?igsh=MWE4djVycHBweGRicA==',N'open',0),
            (1,N'note-0f9151f1-20d9-463b-9f4f-8f0e028eb960',N'item-49f6884d-c98a-4fcf-b027-0b1365accf72',NULL,1,N'',N'open',0),
            (1,N'note-2cc5883c-ddad-4f38-9aa6-3ce9de107045',N'item-70259f14-c4e2-49f7-b75b-bd4f7e5e75f4',NULL,0,N'Make it topdown. Focus on the player object, make it move fandomly and change direction based on interaction with other objects. Make a drag to aim kind of thingy that shows an arrow towards where the player object will move when released. Make it charge over few seconds rather than br infinity, instantly available',N'open',0),
            (1,N'note-2cc5883c-ddad-4f38-9aa6-3ce9de107045',N'item-96368e95-43d2-4a11-8f37-86934cfb6dfa',NULL,1,N'',N'open',0),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'item-24854ce2-4a2c-468f-b232-e0941fb133e6',NULL,0,N'Calpol',N'open',0),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'item-74e63c2c-1d5c-4e6e-9574-6ddad82cb07b',NULL,1,N'Termometyr',N'open',0),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'item-2dcd5b77-c3d1-4ce1-bc03-2ffac71ed475',NULL,2,N'Nurofen',N'open',0),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'item-fc019052-1c0c-4479-91d5-c2d44a3c2ee7',NULL,3,N'Analgin',N'open',0),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'item-5deb165d-d89d-417e-8242-4b858de8c48e',NULL,4,N'Degan (povryytane)',N'open',0),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'item-dc8bdc90-a142-4b18-8fb1-34d2ba9d04b0',NULL,5,N'Pqna izgarqne',N'open',0),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'item-23b9b01e-4d8e-49bd-9b8b-69496683ba50',NULL,6,N'Bint',N'open',0),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'item-b2b16db3-c626-4f5c-9581-c57f7a3952ed',NULL,7,N'Lepenki',N'open',0),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'item-81a5b77d-2dbf-4a36-b36d-d8aea6c2bb59',NULL,8,N'',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-c820b44d-d35f-440b-a645-0d2b78736584',NULL,0,N'2l blader',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-35ab188a-3a05-4940-a1a8-84a44a6e3029',NULL,1,N'Electrolite bottle',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-ccda2ba1-7699-441f-b261-22ae39e0d856',NULL,2,N'Frozen bottle',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-5ef2aeea-fceb-485f-8c7b-15c3e20c0d6a',NULL,3,N'Top',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-75de1859-e8f3-447e-96f2-4e26cf554a75',NULL,4,N'Underwear',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-a206f294-bd0e-40a1-9d77-f54a6e941b2f',NULL,5,N'Shorts',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-d3bb4498-fe61-45d8-a9a5-c354f312119a',NULL,6,N'Gloves',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-d40cbf90-3a8a-4cf0-9e82-ba3a39df7406',NULL,7,N'Car keys',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-781ca2ef-c6cc-4d0d-a4d4-5e95cd0ff137',NULL,8,N'Shoes',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-0f56493d-a02c-497b-a8ce-53502b7f5508',NULL,9,N'2nd watch',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-2c9f9588-d2ba-4037-8574-fd276a690cd5',NULL,10,N'Biscuits ',N'open',0),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'item-cfdcc40e-99d5-4bca-8046-92ad3752efe8',NULL,11,N'',N'open',0),
            (1,N'note-c651a010-f839-4dc9-b521-893f19f611ad',N'item-d0c499e5-e436-4d9e-ac91-8ae13d1b4bcb',NULL,0,N'Non-negotiables ',N'open',0),
            (1,N'note-c651a010-f839-4dc9-b521-893f19f611ad',N'item-b6e7d456-0302-44cf-a208-b31789298055',NULL,1,N'Calories in vs cal out',N'open',0),
            (1,N'note-c651a010-f839-4dc9-b521-893f19f611ad',N'item-bdaeefe2-b769-43d6-a2d6-d6e9f35d4f21',NULL,2,N'Carbs during training',N'open',0),
            (1,N'note-c651a010-f839-4dc9-b521-893f19f611ad',N'item-30fe2bb5-3110-4a2f-b053-c2282a0daffd',NULL,3,N'Supplements (creatine)',N'open',0),
            (1,N'note-c651a010-f839-4dc9-b521-893f19f611ad',N'item-23877a6c-d344-425b-b8ac-098ef196320f',NULL,4,N'Electrolytes ',N'open',0),
            (1,N'note-c651a010-f839-4dc9-b521-893f19f611ad',N'item-55bf8545-4123-4183-9c68-67a5332ffdfc',NULL,5,N'',N'open',0),
            (1,N'note-dd7b472f-36a2-48f0-ba48-4477a7a09212',N'item-f6ade6c2-11b0-46f1-b610-4ab2b9c16732',NULL,0,N'Next to calendar put new tile "goals" make it show the first (marked as main) goal on the tile. Inside let me set specific goals + end sate. I.e. "Lose 5kg" with deadline in 3m. And it''s marked as main so i want it on the tile with "90D remaining"',N'open',0),
            (1,N'note-dd7b472f-36a2-48f0-ba48-4477a7a09212',N'item-df06fb67-7cb8-4214-bedf-80ab199caeb0',NULL,1,N'Make enter on title jump to checklist input item ',N'open',0),
            (1,N'note-dd7b472f-36a2-48f0-ba48-4477a7a09212',N'item-d1412ec0-362b-4df5-8d80-32cb04cd215c',NULL,2,N'Make back button go out a step. If im in a category and press back i want to go to the starting todo page. If im in an list i want to go back to the category ',N'open',0),
            (1,N'note-dd7b472f-36a2-48f0-ba48-4477a7a09212',N'item-313dd511-d6e7-4e82-8d58-49503d227e86',NULL,3,N'',N'open',0);

        INSERT dbo.TodoNoteVisits
            (TodoDocumentId, NoteId, DeviceId, VisitCount)
        VALUES
            (1,N'note-0f9151f1-20d9-463b-9f4f-8f0e028eb960',N'device-95e8d301-28df-49d5-93d5-0cbb9db40ca7',1),
            (1,N'note-2cc5883c-ddad-4f38-9aa6-3ce9de107045',N'device-95e8d301-28df-49d5-93d5-0cbb9db40ca7',2),
            (1,N'note-b1bfd9c1-0a28-49d4-be8e-2d5e6439d36f',N'device-95e8d301-28df-49d5-93d5-0cbb9db40ca7',1),
            (1,N'note-b528a90d-f9c8-4262-85ab-4466ebed4e7f',N'device-95e8d301-28df-49d5-93d5-0cbb9db40ca7',1),
            (1,N'note-c651a010-f839-4dc9-b521-893f19f611ad',N'device-95e8d301-28df-49d5-93d5-0cbb9db40ca7',1),
            (1,N'note-dd7b472f-36a2-48f0-ba48-4477a7a09212',N'device-95e8d301-28df-49d5-93d5-0cbb9db40ca7',3);

        INSERT dbo.TodoDeletions
            (TodoDocumentId, EntityType, EntityId, DeletedAtUtc)
        VALUES
            (1,N'note',N'note-e823a280-6bf7-4b13-bf5a-da22a5025e1f','2026-07-22T06:47:19.896Z');

        PRINT 'Created relational Todo storage and imported the phone values.';
    END
    ELSE
    BEGIN
        PRINT 'Todo storage already has data and was left unchanged.';
        PRINT 'Set @ReplaceExistingDocument to 1 only when replacement is intentional.';
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT
    d.SchemaVersion,
    d.UpdatedAtUtc,
    (SELECT COUNT(*) FROM dbo.TodoGroups WHERE TodoDocumentId = d.Id) AS Groups,
    (SELECT COUNT(*) FROM dbo.TodoNotes WHERE TodoDocumentId = d.Id) AS Notes,
    (SELECT COUNT(*) FROM dbo.TodoNoteItems WHERE TodoDocumentId = d.Id) AS Items,
    (SELECT COUNT(*) FROM dbo.TodoRecipes WHERE TodoDocumentId = d.Id) AS Recipes
FROM dbo.TodoDocuments AS d
WHERE d.Id = @DocumentId;

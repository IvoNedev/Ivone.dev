IF OBJECT_ID(N'[FinanceCategories]') IS NULL
BEGIN
    CREATE TABLE [FinanceCategories] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(120) NOT NULL,
        [IsSystem] bit NOT NULL,
        [IsDefault] bit NOT NULL CONSTRAINT [DF_FinanceCategories_IsDefault] DEFAULT CAST(0 AS bit),
        CONSTRAINT [PK_FinanceCategories] PRIMARY KEY ([Id])
    );
END;
GO
IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250221212351_InitialCreate'
)
BEGIN
    CREATE TABLE [MortgageScenarios] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(max) NOT NULL,
        [TotalCost] decimal(18,2) NOT NULL,
        [DepositPercentage] decimal(18,2) NOT NULL,
        [DepositAmount] decimal(18,2) NOT NULL,
        [MortgageAmount] decimal(18,2) NOT NULL,
        [ParkingSpotCost] decimal(18,2) NOT NULL,
        [CommissionRate] decimal(18,2) NOT NULL,
        [CommissionAmount] decimal(18,2) NOT NULL,
        [LawyerFeeRate] decimal(18,2) NOT NULL,
        [LawyerFeeAmount] decimal(18,2) NOT NULL,
        [LoanTermInYears] int NOT NULL,
        [Currency] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_MortgageScenarios] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20250221212351_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250221212351_InitialCreate', N'9.0.2');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE TABLE [RegionStats] (
        [Id] int NOT NULL IDENTITY,
        [StatDate] datetime2 NOT NULL,
        [Region] nvarchar(max) NOT NULL,
        [Price1] int NULL,
        [Price1PerSqm] int NULL,
        [Price2] int NULL,
        [Price2PerSqm] int NULL,
        [Price3] int NULL,
        [Price3PerSqm] int NULL,
        [AvgPerSqm] int NOT NULL,
        CONSTRAINT [PK_RegionStats] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE TABLE [Tests] (
        [Id] int NOT NULL IDENTITY,
        [Title] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_Tests] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE TABLE [Timelines] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(max) NOT NULL,
        [OwnerId] int NOT NULL,
        [CreatedOn] datetime2 NOT NULL,
        CONSTRAINT [PK_Timelines] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] int NOT NULL IDENTITY,
        [Email] nvarchar(max) NOT NULL,
        [IsGoogle] bit NOT NULL,
        [IsFacebook] bit NOT NULL,
        [IsLinkedIn] bit NOT NULL,
        [IsLocal] bit NOT NULL,
        [HasPaid] bit NOT NULL,
        [CreatedOn] datetime2 NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE TABLE [Questions] (
        [Id] int NOT NULL IDENTITY,
        [Text] nvarchar(max) NOT NULL,
        [Explanation] nvarchar(max) NOT NULL,
        [TestId] int NOT NULL,
        CONSTRAINT [PK_Questions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Questions_Tests_TestId] FOREIGN KEY ([TestId]) REFERENCES [Tests] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE TABLE [TimelineEvents] (
        [Id] int NOT NULL IDENTITY,
        [Date] datetime2 NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [Notes] nvarchar(max) NOT NULL,
        [Address] nvarchar(max) NULL,
        [TimelineId] int NOT NULL,
        CONSTRAINT [PK_TimelineEvents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_TimelineEvents_Timelines_TimelineId] FOREIGN KEY ([TimelineId]) REFERENCES [Timelines] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE TABLE [UserTimelines] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [TimelineId] int NOT NULL,
        CONSTRAINT [PK_UserTimelines] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserTimelines_Timelines_TimelineId] FOREIGN KEY ([TimelineId]) REFERENCES [Timelines] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_UserTimelines_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE TABLE [Answers] (
        [Id] int NOT NULL IDENTITY,
        [Text] nvarchar(max) NOT NULL,
        [IsCorrect] bit NOT NULL,
        [QuestionId] int NOT NULL,
        CONSTRAINT [PK_Answers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Answers_Questions_QuestionId] FOREIGN KEY ([QuestionId]) REFERENCES [Questions] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CommissionAmount', N'CommissionRate', N'Currency', N'DepositAmount', N'DepositPercentage', N'LawyerFeeAmount', N'LawyerFeeRate', N'LoanTermInYears', N'MortgageAmount', N'Name', N'ParkingSpotCost', N'TotalCost') AND [object_id] = OBJECT_ID(N'[MortgageScenarios]'))
        SET IDENTITY_INSERT [MortgageScenarios] ON;
    EXEC(N'INSERT INTO [MortgageScenarios] ([Id], [CommissionAmount], [CommissionRate], [Currency], [DepositAmount], [DepositPercentage], [LawyerFeeAmount], [LawyerFeeRate], [LoanTermInYears], [MortgageAmount], [Name], [ParkingSpotCost], [TotalCost])
    VALUES (1, 8550.0, 3.0, N''EUR'', 57000.0, 20.0, 3420.0, 1.2, 30, 228000.0, N''Two Bedroom • City Center'', 20000.0, 285000.0),
    (2, 4125.0, 2.5, N''EUR'', 24750.0, 15.0, 1650.0, 1.0, 25, 140250.0, N''Starter Flat • Sofia South'', 12000.0, 165000.0),
    (3, 8820.0, 2.8, N''EUR'', 78750.0, 25.0, 4095.0, 1.3, 30, 236250.0, N''House + Parking • Suburbs'', 15000.0, 315000.0)');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CommissionAmount', N'CommissionRate', N'Currency', N'DepositAmount', N'DepositPercentage', N'LawyerFeeAmount', N'LawyerFeeRate', N'LoanTermInYears', N'MortgageAmount', N'Name', N'ParkingSpotCost', N'TotalCost') AND [object_id] = OBJECT_ID(N'[MortgageScenarios]'))
        SET IDENTITY_INSERT [MortgageScenarios] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'AvgPerSqm', N'Price1', N'Price1PerSqm', N'Price2', N'Price2PerSqm', N'Price3', N'Price3PerSqm', N'Region', N'StatDate') AND [object_id] = OBJECT_ID(N'[RegionStats]'))
        SET IDENTITY_INSERT [RegionStats] ON;
    EXEC(N'INSERT INTO [RegionStats] ([Id], [AvgPerSqm], [Price1], [Price1PerSqm], [Price2], [Price2PerSqm], [Price3], [Price3PerSqm], [Region], [StatDate])
    VALUES (1, 2790, 310000, 3000, 285000, 2780, 255000, 2600, N''Sofia Center'', ''2025-05-29T00:00:00.0000000''),
    (2, 2200, 235000, 2350, 210000, 2200, 190000, 2050, N''Sofia South'', ''2025-05-29T00:00:00.0000000''),
    (3, 1970, 185000, 2150, 165000, 1950, 150000, 1820, N''Studentski Grad'', ''2025-05-22T00:00:00.0000000'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'AvgPerSqm', N'Price1', N'Price1PerSqm', N'Price2', N'Price2PerSqm', N'Price3', N'Price3PerSqm', N'Region', N'StatDate') AND [object_id] = OBJECT_ID(N'[RegionStats]'))
        SET IDENTITY_INSERT [RegionStats] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Title') AND [object_id] = OBJECT_ID(N'[Tests]'))
        SET IDENTITY_INSERT [Tests] ON;
    EXEC(N'INSERT INTO [Tests] ([Id], [Title])
    VALUES (1, N''Life in the UK • Core Facts''),
    (2, N''Life in the UK • Traditions'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Title') AND [object_id] = OBJECT_ID(N'[Tests]'))
        SET IDENTITY_INSERT [Tests] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CreatedOn', N'Name', N'OwnerId') AND [object_id] = OBJECT_ID(N'[Timelines]'))
        SET IDENTITY_INSERT [Timelines] ON;
    EXEC(N'INSERT INTO [Timelines] ([Id], [CreatedOn], [Name], [OwnerId])
    VALUES (1, ''2024-06-05T00:00:00.0000000Z'', N''Home Purchase Journey'', 1)');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CreatedOn', N'Name', N'OwnerId') AND [object_id] = OBJECT_ID(N'[Timelines]'))
        SET IDENTITY_INSERT [Timelines] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CreatedOn', N'Email', N'HasPaid', N'IsFacebook', N'IsGoogle', N'IsLinkedIn', N'IsLocal') AND [object_id] = OBJECT_ID(N'[Users]'))
        SET IDENTITY_INSERT [Users] ON;
    EXEC(N'INSERT INTO [Users] ([Id], [CreatedOn], [Email], [HasPaid], [IsFacebook], [IsGoogle], [IsLinkedIn], [IsLocal])
    VALUES (1, ''2024-01-15T00:00:00.0000000Z'', N''demo@ivone.dev'', CAST(0 AS bit), CAST(0 AS bit), CAST(0 AS bit), CAST(0 AS bit), CAST(1 AS bit)),
    (2, ''2024-06-01T00:00:00.0000000Z'', N''shared@ivone.dev'', CAST(1 AS bit), CAST(0 AS bit), CAST(1 AS bit), CAST(1 AS bit), CAST(0 AS bit))');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CreatedOn', N'Email', N'HasPaid', N'IsFacebook', N'IsGoogle', N'IsLinkedIn', N'IsLocal') AND [object_id] = OBJECT_ID(N'[Users]'))
        SET IDENTITY_INSERT [Users] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Explanation', N'TestId', N'Text') AND [object_id] = OBJECT_ID(N'[Questions]'))
        SET IDENTITY_INSERT [Questions] ON;
    EXEC(N'INSERT INTO [Questions] ([Id], [Explanation], [TestId], [Text])
    VALUES (1, N''London is the UK capital and seat of government.'', 1, N''What is the capital city of the United Kingdom?''),
    (2, N''All UK citizens aged 18 or over can vote.'', 1, N''What is the minimum age for voting in UK general elections?''),
    (3, N''The daffodil is widely used as the Welsh emblem.'', 1, N''Which flower is the national emblem of Wales?''),
    (4, N''William the Conqueror began building the Tower in the 11th century.'', 2, N''Who ordered the construction of the Tower of London?''),
    (5, N''Bonfire Night, or Guy Fawkes Night, is on 5 November.'', 2, N''When is Bonfire Night celebrated in the UK?''),
    (6, N''The UK uses the pound sterling (GBP).'', 2, N''What is the official currency of the United Kingdom?'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Explanation', N'TestId', N'Text') AND [object_id] = OBJECT_ID(N'[Questions]'))
        SET IDENTITY_INSERT [Questions] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Address', N'Date', N'Notes', N'TimelineId', N'Title') AND [object_id] = OBJECT_ID(N'[TimelineEvents]'))
        SET IDENTITY_INSERT [TimelineEvents] ON;
    EXEC(N'INSERT INTO [TimelineEvents] ([Id], [Address], [Date], [Notes], [TimelineId], [Title])
    VALUES (1, N''Online + site visits'', ''2024-06-10T00:00:00.0000000'', N''Compare average price per sqm across districts.'', 1, N''Research neighborhoods''),
    (2, N''Local bank branch'', ''2024-07-03T00:00:00.0000000'', N''Prepare proof of income and savings statements.'', 1, N''Bank pre-approval meeting''),
    (3, N''Sofia South complex'', ''2024-07-20T00:00:00.0000000'', N''Tour sample apartment and parking layout.'', 1, N''First developer visit'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Address', N'Date', N'Notes', N'TimelineId', N'Title') AND [object_id] = OBJECT_ID(N'[TimelineEvents]'))
        SET IDENTITY_INSERT [TimelineEvents] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'TimelineId', N'UserId') AND [object_id] = OBJECT_ID(N'[UserTimelines]'))
        SET IDENTITY_INSERT [UserTimelines] ON;
    EXEC(N'INSERT INTO [UserTimelines] ([Id], [TimelineId], [UserId])
    VALUES (1, 1, 1),
    (2, 1, 2)');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'TimelineId', N'UserId') AND [object_id] = OBJECT_ID(N'[UserTimelines]'))
        SET IDENTITY_INSERT [UserTimelines] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'IsCorrect', N'QuestionId', N'Text') AND [object_id] = OBJECT_ID(N'[Answers]'))
        SET IDENTITY_INSERT [Answers] ON;
    EXEC(N'INSERT INTO [Answers] ([Id], [IsCorrect], [QuestionId], [Text])
    VALUES (1, CAST(1 AS bit), 1, N''London''),
    (2, CAST(0 AS bit), 1, N''Manchester''),
    (3, CAST(0 AS bit), 1, N''Belfast''),
    (4, CAST(0 AS bit), 1, N''Cardiff''),
    (5, CAST(0 AS bit), 2, N''16''),
    (6, CAST(0 AS bit), 2, N''17''),
    (7, CAST(1 AS bit), 2, N''18''),
    (8, CAST(0 AS bit), 2, N''21''),
    (9, CAST(0 AS bit), 3, N''Rose''),
    (10, CAST(0 AS bit), 3, N''Thistle''),
    (11, CAST(1 AS bit), 3, N''Daffodil''),
    (12, CAST(0 AS bit), 3, N''Shamrock''),
    (13, CAST(1 AS bit), 4, N''William the Conqueror''),
    (14, CAST(0 AS bit), 4, N''Henry VIII''),
    (15, CAST(0 AS bit), 4, N''Elizabeth I''),
    (16, CAST(0 AS bit), 4, N''Queen Victoria''),
    (17, CAST(0 AS bit), 5, N''1 January''),
    (18, CAST(0 AS bit), 5, N''14 February''),
    (19, CAST(1 AS bit), 5, N''5 November''),
    (20, CAST(0 AS bit), 5, N''25 December''),
    (21, CAST(0 AS bit), 6, N''Euro''),
    (22, CAST(0 AS bit), 6, N''US Dollar''),
    (23, CAST(1 AS bit), 6, N''Pound sterling''),
    (24, CAST(0 AS bit), 6, N''Swiss franc'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'IsCorrect', N'QuestionId', N'Text') AND [object_id] = OBJECT_ID(N'[Answers]'))
        SET IDENTITY_INSERT [Answers] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE INDEX [IX_Answers_QuestionId] ON [Answers] ([QuestionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE INDEX [IX_Questions_TestId] ON [Questions] ([TestId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE INDEX [IX_TimelineEvents_TimelineId] ON [TimelineEvents] ([TimelineId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE INDEX [IX_UserTimelines_TimelineId] ON [UserTimelines] ([TimelineId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    CREATE INDEX [IX_UserTimelines_UserId] ON [UserTimelines] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251113161838_AddDomainTables'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251113161838_AddDomainTables', N'9.0.2');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260116150542_AddTimelineEventMetadata'
)
BEGIN
    ALTER TABLE [TimelineEvents] ADD [DatePrecision] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260116150542_AddTimelineEventMetadata'
)
BEGIN
    ALTER TABLE [TimelineEvents] ADD [MediaUrls] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260116150542_AddTimelineEventMetadata'
)
BEGIN
    ALTER TABLE [TimelineEvents] ADD [Url] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260116150542_AddTimelineEventMetadata'
)
BEGIN
    EXEC(N'UPDATE [TimelineEvents] SET [DatePrecision] = NULL, [MediaUrls] = NULL, [Url] = NULL
    WHERE [Id] = 1;
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260116150542_AddTimelineEventMetadata'
)
BEGIN
    EXEC(N'UPDATE [TimelineEvents] SET [DatePrecision] = NULL, [MediaUrls] = NULL, [Url] = NULL
    WHERE [Id] = 2;
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260116150542_AddTimelineEventMetadata'
)
BEGIN
    EXEC(N'UPDATE [TimelineEvents] SET [DatePrecision] = NULL, [MediaUrls] = NULL, [Url] = NULL
    WHERE [Id] = 3;
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260116150542_AddTimelineEventMetadata'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260116150542_AddTimelineEventMetadata', N'9.0.2');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE TABLE [PytDrivers] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(200) NOT NULL,
        [LicenseNumber] nvarchar(64) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_PytDrivers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE TABLE [PytLocations] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(200) NOT NULL,
        [Address] nvarchar(300) NULL,
        [IsActive] bit NOT NULL,
        [IsFavorite] bit NOT NULL,
        CONSTRAINT [PK_PytLocations] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE TABLE [PytUsers] (
        [Id] int NOT NULL IDENTITY,
        [Email] nvarchar(256) NOT NULL,
        [PasswordHash] nvarchar(512) NOT NULL,
        [OrganizationId] int NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PytUsers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE TABLE [PytVehicles] (
        [Id] int NOT NULL IDENTITY,
        [PlateNumber] nvarchar(32) NOT NULL,
        [MakeModel] nvarchar(200) NOT NULL,
        [FuelType] nvarchar(64) NOT NULL,
        [AvgConsumption] decimal(6,2) NULL,
        [LastMileage] int NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_PytVehicles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE TABLE [PytTrips] (
        [Id] int NOT NULL IDENTITY,
        [VehicleId] int NOT NULL,
        [DriverId] int NOT NULL,
        [StartDateTime] datetime2 NOT NULL,
        [EndDateTime] datetime2 NOT NULL,
        [StartLocationId] int NOT NULL,
        [EndLocationId] int NOT NULL,
        [StartMileage] int NOT NULL,
        [EndMileage] int NOT NULL,
        [Purpose] nvarchar(120) NOT NULL,
        [Notes] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedByUserId] int NOT NULL,
        CONSTRAINT [PK_PytTrips] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_PytTrips_Dates] CHECK ([EndDateTime] >= [StartDateTime]),
        CONSTRAINT [CK_PytTrips_Mileage] CHECK ([EndMileage] >= [StartMileage]),
        CONSTRAINT [FK_PytTrips_PytDrivers_DriverId] FOREIGN KEY ([DriverId]) REFERENCES [PytDrivers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_PytTrips_PytLocations_EndLocationId] FOREIGN KEY ([EndLocationId]) REFERENCES [PytLocations] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_PytTrips_PytLocations_StartLocationId] FOREIGN KEY ([StartLocationId]) REFERENCES [PytLocations] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_PytTrips_PytUsers_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [PytUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_PytTrips_PytVehicles_VehicleId] FOREIGN KEY ([VehicleId]) REFERENCES [PytVehicles] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE TABLE [PytUserPreferences] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [LastVehicleId] int NULL,
        [LastDriverId] int NULL,
        [LastStartLocationId] int NULL,
        [LastEndLocationId] int NULL,
        [LastPurpose] nvarchar(120) NULL,
        [TypicalDistanceKm] int NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PytUserPreferences] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PytUserPreferences_PytDrivers_LastDriverId] FOREIGN KEY ([LastDriverId]) REFERENCES [PytDrivers] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_PytUserPreferences_PytLocations_LastEndLocationId] FOREIGN KEY ([LastEndLocationId]) REFERENCES [PytLocations] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_PytUserPreferences_PytLocations_LastStartLocationId] FOREIGN KEY ([LastStartLocationId]) REFERENCES [PytLocations] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_PytUserPreferences_PytUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [PytUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_PytUserPreferences_PytVehicles_LastVehicleId] FOREIGN KEY ([LastVehicleId]) REFERENCES [PytVehicles] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'IsActive', N'LicenseNumber', N'Name') AND [object_id] = OBJECT_ID(N'[PytDrivers]'))
        SET IDENTITY_INSERT [PytDrivers] ON;
    EXEC(N'INSERT INTO [PytDrivers] ([Id], [IsActive], [LicenseNumber], [Name])
    VALUES (1, CAST(1 AS bit), N''B1234567'', N''???? ??????''),
    (2, CAST(1 AS bit), N''B9876543'', N''????? ????????'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'IsActive', N'LicenseNumber', N'Name') AND [object_id] = OBJECT_ID(N'[PytDrivers]'))
        SET IDENTITY_INSERT [PytDrivers] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Address', N'IsActive', N'IsFavorite', N'Name') AND [object_id] = OBJECT_ID(N'[PytLocations]'))
        SET IDENTITY_INSERT [PytLocations] ON;
    EXEC(N'INSERT INTO [PytLocations] ([Id], [Address], [IsActive], [IsFavorite], [Name])
    VALUES (1, N''?????, ???. ???????? 45'', CAST(1 AS bit), CAST(1 AS bit), N''????''),
    (2, N''???????, ??. ?????? ?. ????? 12'', CAST(1 AS bit), CAST(1 AS bit), N''?????? - ???????''),
    (3, N''?????, ??. ???????????? ??? 201'', CAST(1 AS bit), CAST(0 AS bit), N''??????'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Address', N'IsActive', N'IsFavorite', N'Name') AND [object_id] = OBJECT_ID(N'[PytLocations]'))
        SET IDENTITY_INSERT [PytLocations] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CreatedAt', N'Email', N'IsActive', N'OrganizationId', N'PasswordHash') AND [object_id] = OBJECT_ID(N'[PytUsers]'))
        SET IDENTITY_INSERT [PytUsers] ON;
    EXEC(N'INSERT INTO [PytUsers] ([Id], [CreatedAt], [Email], [IsActive], [OrganizationId], [PasswordHash])
    VALUES (1, ''2026-01-01T08:00:00.0000000Z'', N''demo@pyt.local'', CAST(1 AS bit), NULL, N''v1$120000$AQIDBAUGBwgJCgsMDQ4PEA==$Wnhu8jmOpth30jheYWyH/50nGyI5gH8bWEe3HsxRujs='')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CreatedAt', N'Email', N'IsActive', N'OrganizationId', N'PasswordHash') AND [object_id] = OBJECT_ID(N'[PytUsers]'))
        SET IDENTITY_INSERT [PytUsers] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'AvgConsumption', N'FuelType', N'IsActive', N'LastMileage', N'MakeModel', N'PlateNumber') AND [object_id] = OBJECT_ID(N'[PytVehicles]'))
        SET IDENTITY_INSERT [PytVehicles] ON;
    EXEC(N'INSERT INTO [PytVehicles] ([Id], [AvgConsumption], [FuelType], [IsActive], [LastMileage], [MakeModel], [PlateNumber])
    VALUES (1, 6.2, N''Diesel'', CAST(1 AS bit), 124500, N''Skoda Octavia'', N''CA1234AB''),
    (2, 7.8, N''Petrol'', CAST(1 AS bit), 87420, N''Renault Kangoo'', N''CA9876CD'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'AvgConsumption', N'FuelType', N'IsActive', N'LastMileage', N'MakeModel', N'PlateNumber') AND [object_id] = OBJECT_ID(N'[PytVehicles]'))
        SET IDENTITY_INSERT [PytVehicles] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CreatedAt', N'CreatedByUserId', N'DriverId', N'EndDateTime', N'EndLocationId', N'EndMileage', N'Notes', N'Purpose', N'StartDateTime', N'StartLocationId', N'StartMileage', N'VehicleId') AND [object_id] = OBJECT_ID(N'[PytTrips]'))
        SET IDENTITY_INSERT [PytTrips] ON;
    EXEC(N'INSERT INTO [PytTrips] ([Id], [CreatedAt], [CreatedByUserId], [DriverId], [EndDateTime], [EndLocationId], [EndMileage], [Notes], [Purpose], [StartDateTime], [StartLocationId], [StartMileage], [VehicleId])
    VALUES (1, ''2026-02-10T18:05:00.0000000Z'', 1, 1, ''2026-02-10T18:00:00.0000000Z'', 2, 124500, N''???? ????'', N''Office -> Client'', ''2026-02-10T08:30:00.0000000Z'', 1, 124380, 1)');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'CreatedAt', N'CreatedByUserId', N'DriverId', N'EndDateTime', N'EndLocationId', N'EndMileage', N'Notes', N'Purpose', N'StartDateTime', N'StartLocationId', N'StartMileage', N'VehicleId') AND [object_id] = OBJECT_ID(N'[PytTrips]'))
        SET IDENTITY_INSERT [PytTrips] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'LastDriverId', N'LastEndLocationId', N'LastPurpose', N'LastStartLocationId', N'LastVehicleId', N'TypicalDistanceKm', N'UpdatedAt', N'UserId') AND [object_id] = OBJECT_ID(N'[PytUserPreferences]'))
        SET IDENTITY_INSERT [PytUserPreferences] ON;
    EXEC(N'INSERT INTO [PytUserPreferences] ([Id], [LastDriverId], [LastEndLocationId], [LastPurpose], [LastStartLocationId], [LastVehicleId], [TypicalDistanceKm], [UpdatedAt], [UserId])
    VALUES (1, 1, 2, N''Office -> Client'', 2, 1, 120, ''2026-02-10T18:05:00.0000000Z'', 1)');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'LastDriverId', N'LastEndLocationId', N'LastPurpose', N'LastStartLocationId', N'LastVehicleId', N'TypicalDistanceKm', N'UpdatedAt', N'UserId') AND [object_id] = OBJECT_ID(N'[PytUserPreferences]'))
        SET IDENTITY_INSERT [PytUserPreferences] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE INDEX [IX_PytTrips_CreatedByUserId_CreatedAt] ON [PytTrips] ([CreatedByUserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE INDEX [IX_PytTrips_DriverId] ON [PytTrips] ([DriverId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE INDEX [IX_PytTrips_EndLocationId] ON [PytTrips] ([EndLocationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE INDEX [IX_PytTrips_StartLocationId] ON [PytTrips] ([StartLocationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE INDEX [IX_PytTrips_VehicleId_EndDateTime] ON [PytTrips] ([VehicleId], [EndDateTime]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE INDEX [IX_PytUserPreferences_LastDriverId] ON [PytUserPreferences] ([LastDriverId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE INDEX [IX_PytUserPreferences_LastEndLocationId] ON [PytUserPreferences] ([LastEndLocationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE INDEX [IX_PytUserPreferences_LastStartLocationId] ON [PytUserPreferences] ([LastStartLocationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE INDEX [IX_PytUserPreferences_LastVehicleId] ON [PytUserPreferences] ([LastVehicleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PytUserPreferences_UserId] ON [PytUserPreferences] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PytUsers_Email] ON [PytUsers] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PytVehicles_PlateNumber] ON [PytVehicles] ([PlateNumber]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260213080904_AddPytModule'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260213080904_AddPytModule', N'9.0.2');
END;

COMMIT;
GO



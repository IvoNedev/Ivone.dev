IF SCHEMA_ID(N'track') IS NULL
BEGIN
    EXEC(N'CREATE SCHEMA [track]');
END;
GO

IF OBJECT_ID(N'[track].[Templates]', N'U') IS NULL
BEGIN
    CREATE TABLE [track].[Templates] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(120) NOT NULL,
        [Description] nvarchar(480) NULL,
        [Cadence] nvarchar(16) NOT NULL CONSTRAINT [DF_track_Templates_Cadence] DEFAULT N'Daily',
        [IsDefault] bit NOT NULL CONSTRAINT [DF_track_Templates_IsDefault] DEFAULT CAST(0 AS bit),
        [CreatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_track_Templates_CreatedOnUtc] DEFAULT GETUTCDATE(),
        [UpdatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_track_Templates_UpdatedOnUtc] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_track_Templates] PRIMARY KEY ([Id])
    );
END;
GO

IF OBJECT_ID(N'[track].[TemplateItems]', N'U') IS NULL
BEGIN
    CREATE TABLE [track].[TemplateItems] (
        [Id] int NOT NULL IDENTITY,
        [TrackTemplateId] int NOT NULL,
        [Label] nvarchar(160) NOT NULL,
        [Points] int NOT NULL CONSTRAINT [DF_track_TemplateItems_Points] DEFAULT 1,
        [SortOrder] int NOT NULL,
        [TargetKind] nvarchar(16) NOT NULL CONSTRAINT [DF_track_TemplateItems_TargetKind] DEFAULT N'Amount',
        [Unit] nvarchar(16) NULL,
        [BaseTarget] decimal(10,2) NULL,
        [GrowthMode] nvarchar(16) NOT NULL CONSTRAINT [DF_track_TemplateItems_GrowthMode] DEFAULT N'None',
        [GrowthValue] decimal(10,2) NOT NULL CONSTRAINT [DF_track_TemplateItems_GrowthValue] DEFAULT 0,
        CONSTRAINT [PK_track_TemplateItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_track_TemplateItems_Templates_TrackTemplateId] FOREIGN KEY ([TrackTemplateId]) REFERENCES [track].[Templates] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_track_TemplateItems_Points] CHECK ([Points] >= 0)
    );
END;
GO

IF OBJECT_ID(N'[track].[TemplateBands]', N'U') IS NULL
BEGIN
    CREATE TABLE [track].[TemplateBands] (
        [Id] int NOT NULL IDENTITY,
        [TrackTemplateId] int NOT NULL,
        [Label] nvarchar(80) NOT NULL,
        [MinPoints] int NOT NULL,
        [MaxPoints] int NULL,
        [ColorHex] nvarchar(16) NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_track_TemplateBands] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_track_TemplateBands_Templates_TrackTemplateId] FOREIGN KEY ([TrackTemplateId]) REFERENCES [track].[Templates] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_track_TemplateBands_MinPoints] CHECK ([MinPoints] >= 0),
        CONSTRAINT [CK_track_TemplateBands_MaxPoints] CHECK ([MaxPoints] IS NULL OR [MaxPoints] >= [MinPoints])
    );
END;
GO

IF OBJECT_ID(N'[track].[Notes]', N'U') IS NULL
BEGIN
    CREATE TABLE [track].[Notes] (
        [Id] int NOT NULL IDENTITY,
        [TrackTemplateId] int NULL,
        [Title] nvarchar(120) NOT NULL,
        [TemplateNameSnapshot] nvarchar(120) NOT NULL,
        [PeriodType] nvarchar(16) NOT NULL CONSTRAINT [DF_track_Notes_PeriodType] DEFAULT N'Daily',
        [TrackDate] date NOT NULL,
        [CreatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_track_Notes_CreatedOnUtc] DEFAULT GETUTCDATE(),
        [UpdatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_track_Notes_UpdatedOnUtc] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_track_Notes] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_track_Notes_Templates_TrackTemplateId] FOREIGN KEY ([TrackTemplateId]) REFERENCES [track].[Templates] ([Id]) ON DELETE SET NULL
    );
END;
GO

IF OBJECT_ID(N'[track].[NoteItems]', N'U') IS NULL
BEGIN
    CREATE TABLE [track].[NoteItems] (
        [Id] int NOT NULL IDENTITY,
        [TrackNoteId] int NOT NULL,
        [Label] nvarchar(160) NOT NULL,
        [Points] int NOT NULL CONSTRAINT [DF_track_NoteItems_Points] DEFAULT 1,
        [IsChecked] bit NOT NULL CONSTRAINT [DF_track_NoteItems_IsChecked] DEFAULT CAST(0 AS bit),
        [CheckedOnUtc] datetime2 NULL,
        [SortOrder] int NOT NULL,
        [TargetKind] nvarchar(16) NOT NULL CONSTRAINT [DF_track_NoteItems_TargetKind] DEFAULT N'Amount',
        [Unit] nvarchar(16) NULL,
        [TargetValue] decimal(10,2) NULL,
        [ActualValue] decimal(10,2) NULL,
        CONSTRAINT [PK_track_NoteItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_track_NoteItems_Notes_TrackNoteId] FOREIGN KEY ([TrackNoteId]) REFERENCES [track].[Notes] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_track_NoteItems_Points] CHECK ([Points] >= 0)
    );
END;
GO

IF OBJECT_ID(N'[track].[NoteBands]', N'U') IS NULL
BEGIN
    CREATE TABLE [track].[NoteBands] (
        [Id] int NOT NULL IDENTITY,
        [TrackNoteId] int NOT NULL,
        [Label] nvarchar(80) NOT NULL,
        [MinPoints] int NOT NULL,
        [MaxPoints] int NULL,
        [ColorHex] nvarchar(16) NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_track_NoteBands] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_track_NoteBands_Notes_TrackNoteId] FOREIGN KEY ([TrackNoteId]) REFERENCES [track].[Notes] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_track_NoteBands_MinPoints] CHECK ([MinPoints] >= 0),
        CONSTRAINT [CK_track_NoteBands_MaxPoints] CHECK ([MaxPoints] IS NULL OR [MaxPoints] >= [MinPoints])
    );
END;
GO

IF OBJECT_ID(N'[track].[ProfitEntries]', N'U') IS NULL
BEGIN
    CREATE TABLE [track].[ProfitEntries] (
        [Id] int NOT NULL IDENTITY,
        [EntryType] nvarchar(24) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Currency] nvarchar(3) NOT NULL CONSTRAINT [DF_track_ProfitEntries_Currency] DEFAULT N'EUR',
        [Memo] nvarchar(240) NULL,
        [EntryDate] date NOT NULL,
        [CreatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_track_ProfitEntries_CreatedOnUtc] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_track_ProfitEntries] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_track_ProfitEntries_Amount] CHECK ([Amount] > 0),
        CONSTRAINT [CK_track_ProfitEntries_EntryType] CHECK ([EntryType] IN (N'Saved', N'Withdrawn'))
    );
END;
GO

IF OBJECT_ID(N'[track].[Measurements]', N'U') IS NULL
BEGIN
    CREATE TABLE [track].[Measurements] (
        [Id] int NOT NULL IDENTITY,
        [MeasurementDate] date NOT NULL,
        [Weight] decimal(8,2) NULL,
        [Belly] decimal(8,2) NULL,
        [Chest] decimal(8,2) NULL,
        [Arm] decimal(8,2) NULL,
        [Leg] decimal(8,2) NULL,
        [CreatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_track_Measurements_CreatedOnUtc] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_track_Measurements] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_track_Measurements_Weight] CHECK ([Weight] IS NULL OR [Weight] > 0),
        CONSTRAINT [CK_track_Measurements_Belly] CHECK ([Belly] IS NULL OR [Belly] > 0),
        CONSTRAINT [CK_track_Measurements_Chest] CHECK ([Chest] IS NULL OR [Chest] > 0),
        CONSTRAINT [CK_track_Measurements_Arm] CHECK ([Arm] IS NULL OR [Arm] > 0),
        CONSTRAINT [CK_track_Measurements_Leg] CHECK ([Leg] IS NULL OR [Leg] > 0)
    );
END;
GO

IF OBJECT_ID(N'[track].[MotivationLinks]', N'U') IS NULL
BEGIN
    CREATE TABLE [track].[MotivationLinks] (
        [Id] int NOT NULL IDENTITY,
        [Url] nvarchar(1200) NOT NULL,
        [Title] nvarchar(180) NULL,
        [Provider] nvarchar(40) NOT NULL,
        [EmbedUrl] nvarchar(1200) NULL,
        [CreatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_track_MotivationLinks_CreatedOnUtc] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_track_MotivationLinks] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_Templates_Name' AND [object_id] = OBJECT_ID(N'[track].[Templates]'))
    CREATE UNIQUE INDEX [IX_track_Templates_Name] ON [track].[Templates] ([Name]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_Templates_IsDefault' AND [object_id] = OBJECT_ID(N'[track].[Templates]'))
    CREATE INDEX [IX_track_Templates_IsDefault] ON [track].[Templates] ([IsDefault]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_TemplateItems_Template_Sort' AND [object_id] = OBJECT_ID(N'[track].[TemplateItems]'))
    CREATE INDEX [IX_track_TemplateItems_Template_Sort] ON [track].[TemplateItems] ([TrackTemplateId], [SortOrder]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_TemplateBands_Template_Sort' AND [object_id] = OBJECT_ID(N'[track].[TemplateBands]'))
    CREATE INDEX [IX_track_TemplateBands_Template_Sort] ON [track].[TemplateBands] ([TrackTemplateId], [SortOrder]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_Notes_TrackDate' AND [object_id] = OBJECT_ID(N'[track].[Notes]'))
    CREATE INDEX [IX_track_Notes_TrackDate] ON [track].[Notes] ([TrackDate]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_Notes_Template_Date' AND [object_id] = OBJECT_ID(N'[track].[Notes]'))
    CREATE UNIQUE INDEX [IX_track_Notes_Template_Date] ON [track].[Notes] ([TrackTemplateId], [TrackDate]) WHERE [TrackTemplateId] IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_NoteItems_Note_Sort' AND [object_id] = OBJECT_ID(N'[track].[NoteItems]'))
    CREATE INDEX [IX_track_NoteItems_Note_Sort] ON [track].[NoteItems] ([TrackNoteId], [SortOrder]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_NoteBands_Note_Sort' AND [object_id] = OBJECT_ID(N'[track].[NoteBands]'))
    CREATE INDEX [IX_track_NoteBands_Note_Sort] ON [track].[NoteBands] ([TrackNoteId], [SortOrder]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_ProfitEntries_Date_Created' AND [object_id] = OBJECT_ID(N'[track].[ProfitEntries]'))
    CREATE INDEX [IX_track_ProfitEntries_Date_Created] ON [track].[ProfitEntries] ([EntryDate], [CreatedOnUtc]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_ProfitEntries_EntryType' AND [object_id] = OBJECT_ID(N'[track].[ProfitEntries]'))
    CREATE INDEX [IX_track_ProfitEntries_EntryType] ON [track].[ProfitEntries] ([EntryType]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_Measurements_Date_Created' AND [object_id] = OBJECT_ID(N'[track].[Measurements]'))
    CREATE INDEX [IX_track_Measurements_Date_Created] ON [track].[Measurements] ([MeasurementDate], [CreatedOnUtc]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_track_MotivationLinks_CreatedOnUtc' AND [object_id] = OBJECT_ID(N'[track].[MotivationLinks]'))
    CREATE INDEX [IX_track_MotivationLinks_CreatedOnUtc] ON [track].[MotivationLinks] ([CreatedOnUtc]);
GO

-- Daily/Weekly cadence support (safe to run on existing databases) --------------

IF COL_LENGTH(N'[track].[Templates]', N'Cadence') IS NULL
BEGIN
    ALTER TABLE [track].[Templates]
        ADD [Cadence] nvarchar(16) NOT NULL CONSTRAINT [DF_track_Templates_Cadence] DEFAULT N'Daily';
END;
GO

IF COL_LENGTH(N'[track].[Notes]', N'PeriodType') IS NULL
BEGIN
    ALTER TABLE [track].[Notes]
        ADD [PeriodType] nvarchar(16) NOT NULL CONSTRAINT [DF_track_Notes_PeriodType] DEFAULT N'Daily';
END;
GO

-- Progressive targets + actuals (safe to run on existing databases) -------------

IF COL_LENGTH(N'[track].[TemplateItems]', N'TargetKind') IS NULL
    ALTER TABLE [track].[TemplateItems] ADD [TargetKind] nvarchar(16) NOT NULL CONSTRAINT [DF_track_TemplateItems_TargetKind] DEFAULT N'Amount';
GO
IF COL_LENGTH(N'[track].[TemplateItems]', N'Unit') IS NULL
    ALTER TABLE [track].[TemplateItems] ADD [Unit] nvarchar(16) NULL;
GO
IF COL_LENGTH(N'[track].[TemplateItems]', N'BaseTarget') IS NULL
    ALTER TABLE [track].[TemplateItems] ADD [BaseTarget] decimal(10,2) NULL;
GO
IF COL_LENGTH(N'[track].[TemplateItems]', N'GrowthMode') IS NULL
    ALTER TABLE [track].[TemplateItems]
        ADD [GrowthMode] nvarchar(16) NOT NULL CONSTRAINT [DF_track_TemplateItems_GrowthMode] DEFAULT N'None';
GO
IF COL_LENGTH(N'[track].[TemplateItems]', N'GrowthValue') IS NULL
    ALTER TABLE [track].[TemplateItems]
        ADD [GrowthValue] decimal(10,2) NOT NULL CONSTRAINT [DF_track_TemplateItems_GrowthValue] DEFAULT 0;
GO
IF COL_LENGTH(N'[track].[NoteItems]', N'TargetKind') IS NULL
    ALTER TABLE [track].[NoteItems] ADD [TargetKind] nvarchar(16) NOT NULL CONSTRAINT [DF_track_NoteItems_TargetKind] DEFAULT N'Amount';
GO
IF COL_LENGTH(N'[track].[NoteItems]', N'Unit') IS NULL
    ALTER TABLE [track].[NoteItems] ADD [Unit] nvarchar(16) NULL;
GO
IF COL_LENGTH(N'[track].[NoteItems]', N'TargetValue') IS NULL
    ALTER TABLE [track].[NoteItems] ADD [TargetValue] decimal(10,2) NULL;
GO
IF COL_LENGTH(N'[track].[NoteItems]', N'ActualValue') IS NULL
    ALTER TABLE [track].[NoteItems] ADD [ActualValue] decimal(10,2) NULL;
GO

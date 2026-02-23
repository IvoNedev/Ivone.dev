BEGIN TRANSACTION;
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
    VALUES (1, CAST(1 AS bit), N''B1234567'', N''Иван Петров''),
    (2, CAST(1 AS bit), N''B9876543'', N''Мария Николова'')');
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
    VALUES (1, N''София, бул. България 45'', CAST(1 AS bit), CAST(1 AS bit), N''Офис''),
    (2, N''Пловдив, ул. Христо Г. Данов 12'', CAST(1 AS bit), CAST(1 AS bit), N''Клиент - Пловдив''),
    (3, N''София, ул. Околовръстен път 201'', CAST(1 AS bit), CAST(0 AS bit), N''Сервиз'')');
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
    VALUES (1, ''2026-02-10T18:05:00.0000000Z'', 1, 1, ''2026-02-10T18:00:00.0000000Z'', 2, 124500, N''Демо курс'', N''Office -> Client'', ''2026-02-10T08:30:00.0000000Z'', 1, 124380, 1)');
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


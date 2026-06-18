IF SCHEMA_ID(N'fitness') IS NULL
BEGIN
    EXEC(N'CREATE SCHEMA [fitness]');
END;
GO

IF OBJECT_ID(N'[fitness].[Users]', N'U') IS NULL
BEGIN
    CREATE TABLE [fitness].[Users] (
        [Id] int NOT NULL IDENTITY,
        [DeviceLabel] nvarchar(120) NULL,
        [CreatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_fitness_Users_CreatedOnUtc] DEFAULT GETUTCDATE(),
        [UpdatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_fitness_Users_UpdatedOnUtc] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_fitness_Users] PRIMARY KEY ([Id])
    );
END;
GO

IF OBJECT_ID(N'[fitness].[Workouts]', N'U') IS NULL
BEGIN
    CREATE TABLE [fitness].[Workouts] (
        [Id] int NOT NULL IDENTITY,
        [FitnessUserId] int NOT NULL,
        [StartedOnUtc] datetime2 NOT NULL,
        [CompletedOnUtc] datetime2 NULL,
        [Status] nvarchar(24) NOT NULL CONSTRAINT [DF_fitness_Workouts_Status] DEFAULT N'InProgress',
        [WeightUnit] nvarchar(3) NOT NULL CONSTRAINT [DF_fitness_Workouts_WeightUnit] DEFAULT N'kg',
        [CreatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_fitness_Workouts_CreatedOnUtc] DEFAULT GETUTCDATE(),
        [UpdatedOnUtc] datetime2 NOT NULL CONSTRAINT [DF_fitness_Workouts_UpdatedOnUtc] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_fitness_Workouts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_fitness_Workouts_Users_FitnessUserId] FOREIGN KEY ([FitnessUserId]) REFERENCES [fitness].[Users] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_fitness_Workouts_Status] CHECK ([Status] IN (N'InProgress', N'Completed')),
        CONSTRAINT [CK_fitness_Workouts_WeightUnit] CHECK ([WeightUnit] IN (N'kg', N'lb'))
    );
END;
GO

IF OBJECT_ID(N'[fitness].[WorkoutExercises]', N'U') IS NULL
BEGIN
    CREATE TABLE [fitness].[WorkoutExercises] (
        [Id] int NOT NULL IDENTITY,
        [FitnessWorkoutId] int NOT NULL,
        [ExerciseName] nvarchar(160) NOT NULL,
        [ExerciseCategory] nvarchar(80) NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_fitness_WorkoutExercises] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_fitness_WorkoutExercises_Workouts_FitnessWorkoutId] FOREIGN KEY ([FitnessWorkoutId]) REFERENCES [fitness].[Workouts] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF COL_LENGTH(N'fitness.WorkoutExercises', N'ExerciseCategory') IS NULL
BEGIN
    ALTER TABLE [fitness].[WorkoutExercises]
    ADD [ExerciseCategory] nvarchar(80) NULL;
END;
GO

IF OBJECT_ID(N'[fitness].[WorkoutSets]', N'U') IS NULL
BEGIN
    CREATE TABLE [fitness].[WorkoutSets] (
        [Id] int NOT NULL IDENTITY,
        [FitnessWorkoutExerciseId] int NOT NULL,
        [SetNumber] int NOT NULL,
        [Reps] int NOT NULL CONSTRAINT [DF_fitness_WorkoutSets_Reps] DEFAULT 0,
        [MaxKg] decimal(8,2) NOT NULL CONSTRAINT [DF_fitness_WorkoutSets_MaxKg] DEFAULT 0,
        CONSTRAINT [PK_fitness_WorkoutSets] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_fitness_WorkoutSets_WorkoutExercises_FitnessWorkoutExerciseId] FOREIGN KEY ([FitnessWorkoutExerciseId]) REFERENCES [fitness].[WorkoutExercises] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_fitness_WorkoutSets_SetNumber] CHECK ([SetNumber] > 0),
        CONSTRAINT [CK_fitness_WorkoutSets_Reps] CHECK ([Reps] >= 0),
        CONSTRAINT [CK_fitness_WorkoutSets_MaxKg] CHECK ([MaxKg] >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_fitness_Workouts_User_Started' AND [object_id] = OBJECT_ID(N'[fitness].[Workouts]'))
    CREATE INDEX [IX_fitness_Workouts_User_Started] ON [fitness].[Workouts] ([FitnessUserId], [StartedOnUtc]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_fitness_Workouts_User_Completed' AND [object_id] = OBJECT_ID(N'[fitness].[Workouts]'))
    CREATE INDEX [IX_fitness_Workouts_User_Completed] ON [fitness].[Workouts] ([FitnessUserId], [CompletedOnUtc]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_fitness_WorkoutExercises_Workout_Sort' AND [object_id] = OBJECT_ID(N'[fitness].[WorkoutExercises]'))
    CREATE INDEX [IX_fitness_WorkoutExercises_Workout_Sort] ON [fitness].[WorkoutExercises] ([FitnessWorkoutId], [SortOrder]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_fitness_WorkoutSets_Exercise_SetNumber' AND [object_id] = OBJECT_ID(N'[fitness].[WorkoutSets]'))
    CREATE INDEX [IX_fitness_WorkoutSets_Exercise_SetNumber] ON [fitness].[WorkoutSets] ([FitnessWorkoutExerciseId], [SetNumber]);
GO

IF NOT EXISTS (SELECT 1 FROM [fitness].[Users] WHERE [Id] = 1)
BEGIN
    SET IDENTITY_INSERT [fitness].[Users] ON;

    INSERT INTO [fitness].[Users] ([Id], [DeviceLabel])
    VALUES (1, N'Prototype user');

    SET IDENTITY_INSERT [fitness].[Users] OFF;
END;
GO

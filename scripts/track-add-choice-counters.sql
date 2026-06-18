-- Track: Hard / Easy choice counters on daily cards.
-- HardCount = times the user chose the hard path (gym, work, hustle).
-- EasyCount = times the user chose the easy path (scroll, stay in bed, skip).
-- Safe to run more than once.

IF COL_LENGTH(N'[track].[Notes]', N'HardCount') IS NULL
    ALTER TABLE [track].[Notes]
        ADD [HardCount] int NOT NULL CONSTRAINT [DF_track_Notes_HardCount] DEFAULT 0;
GO

IF COL_LENGTH(N'[track].[Notes]', N'EasyCount') IS NULL
    ALTER TABLE [track].[Notes]
        ADD [EasyCount] int NOT NULL CONSTRAINT [DF_track_Notes_EasyCount] DEFAULT 0;
GO

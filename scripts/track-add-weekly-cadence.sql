-- Track: weekly cadence support.
-- Adds a Cadence column to templates (Daily | Weekly) and a PeriodType column to
-- cards (Daily | Weekly). Safe to run more than once. Existing rows default to "Daily",
-- so current daily templates and cards are unchanged.

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

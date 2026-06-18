-- Track: progressive targets ("1% better") + actuals logging.
--
-- TemplateItems gain a measurable target that grows each week the template runs:
--   Unit         e.g. "km", "reps", "min"  (null = plain checkbox item)
--   BaseTarget   starting value, e.g. 2.00
--   GrowthMode   'None' | 'Percent' (compound %/week) | 'Step' (fixed +/week)
--   GrowthValue  the % or step amount per week
--
-- NoteItems gain the baked-in target for that card plus the value you actually logged:
--   Unit, TargetValue (scaled for that week, frozen at creation), ActualValue
--
-- Safe to run more than once. Existing rows stay plain checkboxes (Unit/Target NULL).

IF COL_LENGTH(N'[track].[TemplateItems]', N'TargetKind') IS NULL
    ALTER TABLE [track].[TemplateItems]
        ADD [TargetKind] nvarchar(16) NOT NULL CONSTRAINT [DF_track_TemplateItems_TargetKind] DEFAULT N'Amount';
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
    ALTER TABLE [track].[NoteItems]
        ADD [TargetKind] nvarchar(16) NOT NULL CONSTRAINT [DF_track_NoteItems_TargetKind] DEFAULT N'Amount';
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

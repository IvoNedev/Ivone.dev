# SummativeTargetOrchestrator

Location
- `sonar-api/sonar-api/src/Areas/Reports/Common/Orchestrators/SummativeTargetOrchestrator.cs`

Role in the system
- Consolidates summative target retrieval and selection logic for a specific assessment point.
- Ensures the “latest valid target” per pupil/subject is used in report calculations.

Where it is used
- `sonar-api/sonar-api/src/Areas/Reports/Triangulation/TriangulationHandler.cs`

## Method: CalculateSummativeTargetsForPupilSubjects
Signature
- `Task<Dictionary<(int pupilId, int subjectId), SummativeTargetEntity>> CalculateSummativeTargetsForPupilSubjects(...)`

What it does
- Retrieves summative targets for pupils/subjects at a given assessment point and returns the most recent target per pupil/subject that matches an allowed summative code.

Why it exists
- Reports need to compare actual outcomes to targets, and target data can contain multiple versions. This method standardizes how the “current” target is chosen.

Where it is used
- Triangulation report to compare summative outcomes, test outcomes, and targets.

How it works
- Pulls all targets for the provided pupils, subjects, assessment point, and feature.
- Filters targets to only those with `SummativeCodeId` in `allowedSummativeCodeIds`.
- Orders targets by `CreatedDateTime` descending.
- Builds a dictionary keyed by `(pupilId, subjectId)` and keeps the first (latest) target encountered for each key.

Things to look out for
- The method assumes “latest by CreatedDateTime” is the desired target; if versioning rules change, this should change too.
- If `allowedSummativeCodeIds` is too restrictive, you can silently drop valid targets and skew reports.
- The method is `internal`; to reuse from other areas, consider promoting it or wrapping it.

## Extension ideas (expert-level)
- Add a method to return all targets per pupil/subject for audit or timeline views (not just the latest).
- Add a method that resolves targets by explicit “effective date” when that field becomes available, instead of using creation time.
- Add validation to detect conflicting targets (same timestamp, different codes) and surface warnings for data quality.
- Add a method that merges targets with assessment data to return a “target vs actual” comparison object for report layers.

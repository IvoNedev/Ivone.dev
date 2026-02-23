# SummativeCompletionOrchestrator

Location
- `sonar-api/sonar-api/src/Areas/Reports/Common/Orchestrators/SummativeCompletionOrchestrator.cs`

Role in the system
- Provides a single, reusable entry point for fetching summative assessments for a specific assessment point and filtering them to a subject list.
- Used by report logic that calculates data completion and coverage.

Where it is used
- `sonar-api/sonar-api/src/Areas/Reports/SummativeDataCompletion/SummativeDataCompletionHandler.cs`

## Method: GetSummativeAssessmentsForAssessmentPointAsync
Signature
- `Task<SummativeAssessment[]> GetSummativeAssessmentsForAssessmentPointAsync(...)`

What it does
- Returns summative assessments for the supplied pupils and subjects, scoped to one assessment point and feature.

Why it exists
- Summative completion reports need consistent filtering rules and data shapes. This method centralizes the rules for “what counts” at a point.

Where it is used
- Summative data completion report calculations to determine missing/complete data by pupil and subject.

How it works
- Short-circuits to an empty array if there are no pupils or subjects to avoid unnecessary queries.
- Calls `ISummativeAssessmentDataAccess.GetPointInTimeAssessmentsForPupilsAsync` with the given assessment point and feature.
- Filters the returned assessments to the selected subjects and wraps each in a `SummativeAssessment`.

Things to look out for
- `GetPointInTimeAssessmentsForPupilsAsync` is the authoritative definition for point-in-time data. If its behavior changes, completion calculations change.
- The method filters by `subjectIds` after retrieval; large sets can be costly if the upstream query isn’t already constrained by subject.

## Extension ideas (expert-level)
- Add an overload that accepts a `IReadOnlySet<int>` for subject IDs to avoid repeated `Contains` allocations for large subject lists.
- Add a method that returns grouped assessments by pupil/subject for direct completion calculations without re-grouping in the handler.
- Add optional inclusion flags for out-of-band assessments if completion logic needs to include them explicitly.
- Add lightweight metrics (counts by subject and by pupil) to surface missing data patterns for analytics dashboards.

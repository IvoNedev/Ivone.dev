# StatutoryHeadlineOrchestrator

Location
- `sonar-api/sonar-api/src/Areas/Statutory/StatutoryHeadlineOrchestrator.cs`

Role in the system
- Aggregates statutory headline data for a subject and pupil set, applying year-group-specific statutory logic and optional headline filters.
- Bridges raw statutory data to the labels and ARE expectations required by reports and insights.

Where it is used
- `sonar-api/sonar-api/src/Areas/SummativeAssessments/InsightsProvider.cs`
- `sonar-api/sonar-api/src/Areas/Target/ProjectionPathwayHandler.cs`

## Method: GetStatutoryHeadlineDataForSubjectAsync
Signature
- `Task<IDictionary<StatutoryHeadline, IEnumerable<StatutoryHeadlineData>>> GetStatutoryHeadlineDataForSubjectAsync(...)`

What it does
- Returns a dictionary keyed by `StatutoryHeadline`, each value containing a list of `StatutoryHeadlineData` for the provided pupils and subject.

Why it exists
- Statutory reporting uses a curated set of “headline” outcomes that depend on year group and subject. This method centralizes how those headlines are chosen and how ARE overlays are applied.

Where it is used
- Summative insights and projection pathways to populate statutory outcomes in reports and projections.

How it works
- If there are no pupils, returns an empty read-only dictionary.
- Calculates the highest year group in the cohort to select the full set of relevant statutory columns.
- Adjusts year group by `academicYearOffset` to support historical points-in-time.
- Uses `StatutoryColumnUtilities.GetStatutoryColumns` to derive headline models and filters them if a `filter` is supplied.
- Retrieves statutory headline data and corresponding ARE headline data from `IStatutoryDataAccess`.
- For each headline, maps results to `StatutoryHeadlineData`, including:
  - headline label,
  - result label (either the raw label or a yes/no overlay),
  - ARE expectation code when applicable.

Things to look out for
- The method assumes “max year group” is sufficient to determine headline coverage for mixed cohorts; if future rules vary per-year, this might need per-pupil handling.
- `academicYearOffset` influences which statutory columns are selected; mismatches with assessment points can yield incorrect headline sets.
- If no statutory models exist for the subject/year, the method returns empty data without warning.

## Extension ideas (expert-level)
- Add a method that returns headline metadata only (labels, ordering, types) for UI scaffolding without pupil data.
- Add a method that supports multi-subject requests for dashboard tiles to reduce duplicate round-trips.
- Add data-quality warnings when ARE overlays are missing for headlines that expect them.
- Add an optional “include all pupils” flag that returns explicit null/empty results for pupils missing headline data (to support completeness tracking).

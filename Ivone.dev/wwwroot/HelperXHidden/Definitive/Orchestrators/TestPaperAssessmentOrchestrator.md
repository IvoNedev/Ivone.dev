# TestPaperAssessmentOrchestrator

Location
- `sonar-api/sonar-api/src/Areas/TestScores/TestPaperAssessmentOrchestrator.cs`

Role in the system
- Orchestrates conversion of raw test paper scores into ARE categories for reporting and analysis.
- Handles out-of-band logic and maximum score derivation for test papers.

Where it is used
- `sonar-api/sonar-api/src/Areas/TestScores/LatestTestScoreProvider.cs`
- `sonar-api/sonar-api/src/Areas/Reports/Triangulation/TriangulationHandler.cs`

## Method: CalculateTestScoreAreAssessmentsForPupilSubjects
Signature
- `Task<Dictionary<AssessmentPoint, TestScoreAssessmentResult>> CalculateTestScoreAreAssessmentsForPupilSubjects(...)`

What it does
- Produces a dictionary keyed by `AssessmentPoint`, each containing test paper assessments, calculated ARE categories, and per-pupil/subject maximum scores.

Why it exists
- Test scores are stored as raw numeric results. Reports need to map those scores to ARE categories and include additional context (max score) for correct interpretation.

Where it is used
- Latest test score view models and triangulation reports that combine summative, target, and test data.

How it works
- Loads academic years for the school and filters assessment points to those with a known year.
- Fetches all test paper assessments for the pupil set once.
- For each assessment point:
  - Retrieves the low/high ARE code IDs for the feature and academic year.
  - Filters assessments to the current academic year and term.
  - Retrieves score ARE ranges and validation ranges.
  - For each assessment:
    - Determines pupil band (with academic year offset) and optional out-of-band band.
    - Classifies the score into a standardized ARE category.
    - Determines maximum score using validation ranges.
  - Collects assessment results and max scores keyed by pupil/subject.

Things to look out for
- If `lowCodeId` is null, the method returns empty results for the assessment point.
- Missing ARE ranges result in a conservative “SignificantlyBelow” classification.
- Assessment points are filtered by academic year and term; mismatches between assessment data and assessment points produce empty rows.

## Method: CategorizeAssessmentConsideringBands
Signature
- `StandardisedARECategory CategorizeAssessmentConsideringBands(...)`

What it does
- Classifies a test score into an ARE category, factoring in out-of-band context.

Why it exists
- Out-of-band tests should be categorized relative to the pupil’s expected band. This method encapsulates the business rule for that adjustment.

Where it is used
- Internal helper for `CalculateTestScoreAreAssessmentsForPupilSubjects`.

How it works
- If an out-of-band band is present and differs from the pupil’s band, returns “SignificantlyBelow” or “SignificantlyAbove” accordingly.
- Otherwise, looks up low/high ARE ranges and compares the numeric score to thresholds.
- Returns `Expected` when in-range, `Below` when under low range, and `Above` when at/over high range.

Things to look out for
- Missing ranges default to `SignificantlyBelow`, which can skew aggregated results if ranges are misconfigured.
- Out-of-band logic short-circuits range logic; verify this is desired for all reports.

## Method: DetermineMaximumScore
Signature
- `int DetermineMaximumScore(...)`

What it does
- Determines the maximum valid score for a test paper result based on validation ranges.

Why it exists
- Some reports need to present achieved score relative to the maximum possible score for the relevant band and subject.

Where it is used
- Internal helper for `CalculateTestScoreAreAssessmentsForPupilSubjects`.

How it works
- Resolves a target year group: out-of-band band if present, otherwise the pupil’s year group.
- Looks up validation range end for the subject, academic year, and target year group.
- Falls back to the pupil’s own band if out-of-band data is missing.
- Returns 0 if no validation range exists.

Things to look out for
- A zero maximum score implies missing or incomplete validation data; downstream calculations should treat 0 as “unknown” rather than “zero max.”

## Class: TestScoreAssessmentResult
What it does
- Encapsulates results for one assessment point: raw assessments, derived ARE results, and max scores per pupil/subject.

Why it exists
- Prevents the caller from having to recompute max scores or re-pair derived results with raw assessments.

Things to look out for
- The `MaxScores` dictionary is keyed by `(pupilId, subjectId)`; ensure caller code uses the same key structure.

## Extension ideas (expert-level)
- Add a method that returns “progress” between assessment points for test scores, similar to summative progress reports.
- Add a method that outputs diagnostics: missing ranges, missing validation bands, or out-of-band frequency for a cohort.
- Add a strategy interface for categorization to support alternative categorization rules (e.g., percentile or Z-score).
- Add an overload that accepts a precomputed assessment-point-to-ARE-range map to reduce repeated database calls in batch runs.

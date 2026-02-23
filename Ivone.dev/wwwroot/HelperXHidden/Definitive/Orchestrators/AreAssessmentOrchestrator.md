    # AreAssessmentOrchestrator

Location
- `sonar-api/sonar-api/src/Areas/Reports/Common/Orchestrators/AreAssessmentOrchestrator.cs`

Role in the system
- Orchestrates conversion of summative assessments into ARE (Age Related Expectation) outcomes, scoped to a set of pupils, subjects, and assessment points.
- Centralizes the rules for turning raw summative data into comparable ARE outcomes used by multiple reports.

Key dependencies
- `ISummativeAssessmentDataAccess`: fetches summative assessments for pupils/subjects.
- `IAgeRelatedExpectationDataAccess`: provides ARE code sets and ranges.
- `IAcademicYearDataAccess`: links assessment points to academic years.
- `IEffectiveAssessmentsModeEvaluator`: decides whether effective assessment logic is enabled.
- `SummativeEffectiveAssessmentCalculator`: computes effective assessments by term.
- `SummativeAssessmentAgeRelatedExpectationCalculator`: calculates ARE categories from summative results.
- `AgeRelatedExpectationRangeProvider`: resolves ARE ranges based on codes, bands, and school phase.

Where it is used
- `sonar-api/sonar-api/src/Areas/Reports/ContextualSummaryAndComparison/ContextualSummaryAndComparisonHandler.cs`
- `sonar-api/sonar-api/src/Areas/Reports/Benchmarking/BenchmarkingReportOrchestrator.cs`
- `sonar-api/sonar-api/src/Areas/Reports/PrimaryFlightPath/PrimaryFlightPathHandler.cs`
- `sonar-api/sonar-api/src/Areas/Reports/Triangulation/TriangulationHandler.cs`

## Method: CalculateSummativeAreAssessmentsForPupilSubjects
Signature
- `Task<Dictionary<AssessmentPoint, IEnumerable<SummativeAssessment>>> CalculateSummativeAreAssessmentsForPupilSubjects(...)`

What it does
- Produces a dictionary keyed by `AssessmentPoint` where each value is the computed ARE-annotated summative assessments for the supplied pupils and subjects.

Why it exists
- Multiple reports need consistent ARE calculations across different assessment points. This method keeps the data fetching, academic year linking, and per-point calculation in one place.

Where it is used
- Called by multiple report handlers and orchestrators to avoid duplicating ARE calculation logic.

How it works
- Loads academic years for the school and joins them to the supplied assessment points.
- Pulls all summative assessments for the pupil set once (not per assessment point).
- Iterates over assessment points and delegates to `CalculateSummativeAreAssessmentsForPupilSubjectsInAssessmentPoint` for point-specific logic.
- Builds a dictionary keyed by the original `AssessmentPoint` instances.

Things to look out for
- Assessment points with missing academic year records produce empty data (via the child method).
- Large pupil/subject sets can generate large in-memory collections; calling contexts should be mindful of scope.
- If `assessmentPoints` contains duplicates, the dictionary add will throw.

## Method: CalculateSummativeAreAssessmentsForPupilSubjectsInAssessmentPoint
Signature
- `Task<IEnumerable<SummativeAssessment>> CalculateSummativeAreAssessmentsForPupilSubjectsInAssessmentPoint(...)`

What it does
- Converts raw summative assessments into ARE-calculated `SummativeAssessment` results for a single assessment point.

Why it exists
- The ARE calculation needs to account for assessment point, academic year offsets, and possibly effective assessment logic. This method isolates that per-point logic.

Where it is used
- Called by `CalculateSummativeAreAssessmentsForPupilSubjects` and by handlers that need a single-point calculation.

How it works
- Returns empty if the academic year is not known (cannot resolve bands or ARE ranges).
- If effective assessments are enabled, uses `SummativeEffectiveAssessmentCalculator` to turn historical assessments into effective point-in-time results.
- Otherwise filters raw assessments by `AssessmentPointCode` and wraps them in `SummativeAssessment` with the point.
- Calculates assessment bands based on pupil year groups and academic year offset.
- Retrieves ARE ranges for the relevant bands and school phase.
- Filters summative codes to the set for the active summative code set.
- Runs `SummativeAssessmentAgeRelatedExpectationCalculator.CalculateAgeRelatedExpectations` to annotate each assessment.

Things to look out for
- A missing summative code set returns an empty set of valid summative codes, which can change ARE outcomes.
- Effective assessments mode changes the definition of “the” assessment at a point; reports relying on raw term results should confirm configuration.
- `SummativeAssessmentAgeRelatedExpectationCalculator` expects consistent data shapes; mismatched subjects or missing ranges will result in unexpected classifications.

## Extension ideas (expert-level)
- Add a method that calculates ARE results for a single pupil across multiple assessment points, returning a time series for progress charts. Useful for comparative “journey” reports.
- Add a method that accepts a precomputed `AcademicYearEntity` lookup to avoid repeated DB fetches when multiple orchestrations run in a batch job.
- Add support for alternative ARE schemes (e.g., percentile-based bands) by injecting a strategy interface instead of hard-wiring `SummativeAssessmentAgeRelatedExpectationCalculator`.
- Add a validation layer that logs or flags missing ARE ranges for a band/feature, allowing reports to surface “data gaps” explicitly.
- Add a method that returns diagnostics (counts of assessments per subject/point, missing code sets, range coverage) for troubleshooting report anomalies.

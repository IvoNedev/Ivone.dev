# BenchmarkingReportOrchestrator

Location
- `sonar-api/sonar-api/src/Areas/Reports/Benchmarking/BenchmarkingReportOrchestrator.cs`

Role in the system
- Builds full benchmarking report payloads by combining school data, local authority benchmarks, and national benchmarks.
- Encapsulates how cohorts, subjects, contextual groups, and attendance bands map into report sections.

Where it is used
- `sonar-api/sonar-api/src/Areas/Reports/Benchmarking/BenchmarkingReportHandler.cs`
- `sonar-api/sonar-api/src/Areas/Reports/Benchmarking/BenchmarkingRawDataHandler.cs`

Key dependencies
- `IPupilFilteringDataAccess`: resolves pupil IDs from page filters and loads pupil details.
- `ISubjectDataAccess`: retrieves subjects for the school and feature.
- `ISummativeCodeDataAccess`: resolves summative code sets and codes.
- `IAreAssessmentOrchestrator`: computes summative ARE assessments for benchmark calculations.
- `IAgeRelatedExpectationDataAccess`: fetches ARE code sets/ranges.
- `ISummativeAssessmentDataAccess`: loads raw summative assessments.
- `IAcademicYearDataAccess`: resolves academic years for range calculations.
- `ISchoolDataAccess`: resolves school and local authority IDs.
- `IBenchmarkingDataAccess`: fetches Juniper benchmark datasets.
- `IPupilEthnicityDataAccess`: supplies pupil ethnicity mappings for ethnicity analysis.

## Method: BuildReportAsync
Signature
- `Task<BenchmarkReportViewModel> BuildReportAsync(...)`

What it does
- Builds the complete benchmarking report view model for a given request scope.

Why it exists
- Benchmarking needs coordinated data from assessments, filters, benchmarks, and pupil context. This method is the canonical orchestration entry point.

Where it is used
- Called by `BenchmarkingReportHandler` to populate the API response.

How it works
- Validates that an assessment point filter is applied; otherwise returns an empty report with filters.
- Resolves the target school (request overrides user context).
- Loads pupils in the target cohort and limits them to relevant year groups.
- Builds subject definitions for combined RWM and individual subjects.
- Loads summative codes and calculates summative ARE assessments via `IAreAssessmentOrchestrator`.
- Builds lookup structures for assessments and pupil subject status.
- Loads national and local authority benchmark data and resolves combined subject identity.
- Builds header, KPI summary, year-group summary, combined subject performance, subject breakdown, and ethnicity analysis.
- Returns a fully populated `BenchmarkReportViewModel`.

Things to look out for
- Requires an applied assessment point filter; without it, most data is intentionally absent.
- Combined RWM subject identification depends on benchmark data; if benchmark inputs change, combined subject resolution can fail.
- Benchmark comparisons rely on cohort counts and denominators; any zero denominators result in null percentages.

## Method: BuildRawDataAsync
Signature
- `Task<BenchmarkingRawSchoolDataViewModel> BuildRawDataAsync(...)`

What it does
- Produces a raw-data payload for benchmarking that includes assessments, code sets, ARE ranges, and benchmarks.

Why it exists
- Supports data export and diagnostics for benchmarking, with minimal transformation.

Where it is used
- Called by `BenchmarkingRawDataHandler`.

How it works
- Validates assessment point filter, resolves school, and loads pupils similar to `BuildReportAsync`.
- Loads subject definitions, summative code sets, summative codes, and ARE code sets.
- Loads raw summative assessment entities and wraps them in `SummativeAssessment`.
- Calculates ARE ranges using `AgeRelatedExpectationRangeProvider`.
- Pulls benchmark data and school counts.
- Returns all collected data in `BenchmarkingRawSchoolDataViewModel`.

Things to look out for
- School without a local authority returns empty local authority benchmarks.
- ARE range calculation requires a valid academic year and non-empty assessments.
- Raw payload sizes can be large; callers should paginate or stream if used outside reporting.

## Method: ResolveSchoolId
Signature
- `int ResolveSchoolId(IAuthenticatedUser user, BenchmarkingReportRequest request)`

What it does
- Returns the school ID for the report based on request or current user.

Why it exists
- Allows benchmarking across specific schools while preserving a default user scope.

Where it is used
- `BuildReportAsync`.

How it works
- Uses the first `SchoolIds` entry if provided; otherwise defaults to `user.CurrentSchoolId`.

Things to look out for
- Only the first school ID is used; multi-school requests are not supported here.

## Method: CreateBenchmarkFilterContainer
Signature
- `PageFilterContainer CreateBenchmarkFilterContainer(AssessmentPoint assessmentPoint)`

What it does
- Creates a filter container scoped only to the assessment point.

Why it exists
- Benchmark data access uses filter containers; this is the minimal configuration.

Where it is used
- `BuildReportAsync` and `BuildRawDataAsync`.

How it works
- Builds a `PageFilterContainer` with a single `Core_AssessmentPoint` filter marked as automatic.

Things to look out for
- Only the assessment point is preserved; other filters from the UI are not included.

## Method: BuildHeader
Signature
- `BenchmarkReportHeaderViewModel BuildHeader(...)`

What it does
- Builds header metadata (generation time, latest benchmark date, LA count).

Why it exists
- Provides context to the report on data freshness and benchmark coverage.

Where it is used
- `BuildReportAsync`.

How it works
- Finds the latest modified date across national and local authority data.
- Uses the maximum LA school count as a robust indicator.

Things to look out for
- If both datasets are empty, `BenchmarkHeadlineProcessedDateUtc` defaults to `DateTime.UtcNow`.

## Method: BuildPrimarySubjectDefinitions
Signature
- `BenchmarkSubjectDefinition[] BuildPrimarySubjectDefinitions(SubjectEntity[] subjectEntities)`

What it does
- Defines the subject set (Combined RWM, Reading, Writing, Maths) used in benchmarking.

Why it exists
- Benchmarking expects consistent subject keys and ordering regardless of school subject IDs.

Where it is used
- `BuildReportAsync`, `BuildRawDataAsync`.

How it works
- Resolves subject IDs by `GlobalSubject` and constructs `SubjectViewModel` entries.
- Creates a combined subject using the union of R/W/M subject IDs.

Things to look out for
- If a subject is missing in the school, it falls back to global subject IDs and labels.

## Method: BuildSubjectViewModel
Signature
- `SubjectViewModel BuildSubjectViewModel(...)`

What it does
- Creates a subject view model for report output.

Why it exists
- Normalizes subject label/id/key across school-specific and global subjects.

Where it is used
- `BuildPrimarySubjectDefinitions`.

How it works
- Tries to locate a matching subject entity; falls back to global subject defaults.

Things to look out for
- If subject keys are inconsistent, the fallback uses enum names which may not match UI expectations.

## Method: GetSubjectIds
Signature
- `int[] GetSubjectIds(SubjectEntity[] subjectEntities, GlobalSubject globalSubject)`

What it does
- Returns subject IDs associated with a global subject.

Why it exists
- Multiple subject IDs can map to one global subject in a school configuration.

Where it is used
- `BuildPrimarySubjectDefinitions`.

How it works
- Filters by `GlobalSubjectId` and returns distinct IDs.

Things to look out for
- If `GlobalSubjectId` is not set correctly, the list can be empty.

## Method: GetSummativeCodesAsync
Signature
- `Task<SummativeCodeEntity[]> GetSummativeCodesAsync(...)`

What it does
- Loads summative code sets and corresponding codes for an assessment point.

Why it exists
- Summative codes are needed to interpret assessment outcomes and drive report labels.

Where it is used
- `BuildReportAsync`.

How it works
- Loads the first available code set for the feature/academic year and fetches customized codes.

Things to look out for
- If no code set exists, returns an empty array and downstream calculations will omit codes.

## Method: BuildSummativeCodeViewModels
Signature
- `CodeViewModel[] BuildSummativeCodeViewModels(SummativeCodeEntity[] summativeCodes)`

What it does
- Converts summative codes into report-friendly view models.

Why it exists
- Report rendering uses labels, descriptions, and ordering that come from the code set.

Where it is used
- `BuildReportAsync`, `BuildRawDataAsync`.

How it works
- Orders by `PointsValue` and maps descriptions/labels using extension helpers.

Things to look out for
- Missing `PointsValue` uses `int.MaxValue`, pushing codes to the end.

## Method: GetSummativeAssessmentsAsync
Signature
- `Task<SummativeAssessment[]> GetSummativeAssessmentsAsync(...)`

What it does
- Calculates ARE-annotated summative assessments for benchmarking at a single assessment point.

Why it exists
- Benchmarking needs consistent, point-in-time ARE outcomes.

Where it is used
- `BuildReportAsync`, `BuildRawDataAsync`.

How it works
- Validates pupils/subjects and code sets.
- Loads ARE code sets and uses `IAreAssessmentOrchestrator` for calculation.
- Returns only the assessments for the requested assessment point.

Things to look out for
- Missing code sets or subject IDs result in empty assessments and zeroed metrics.

## Method: BuildAssessmentLookup
Signature
- `Dictionary<(int PupilId, int SubjectId), SummativeAssessment> BuildAssessmentLookup(...)`

What it does
- Creates a quick lookup for assessments by pupil/subject.

Why it exists
- Many downstream calculations need fast access to a pupil’s assessment in a given subject.

Where it is used
- `BuildReportAsync`.

How it works
- Groups by `(PupilId, SubjectId)` and keeps the first assessment per key.

Things to look out for
- If multiple assessments exist for a pupil/subject, only the first is retained.

## Method: BuildSubjectStatusLookup
Signature
- `Dictionary<string, Dictionary<int, PupilSubjectStatus>> BuildSubjectStatusLookup(...)`

What it does
- Builds a per-subject, per-pupil status map indicating assessment presence and “at or above” status.

Why it exists
- Benchmark calculations are driven by counts of pupils with assessments and at-or-above outcomes.

Where it is used
- `BuildReportAsync`.

How it works
- Builds status for non-combined subjects first, then derives combined RWM status from all three.

Things to look out for
- Combined status requires all component subjects; partial data yields `HasAssessment = false`.

## Method: GetAssessmentForSubject
Signature
- `SummativeAssessment? GetAssessmentForSubject(...)`

What it does
- Returns the first assessment matching any subject ID for a pupil.

Why it exists
- Some subjects map to multiple IDs; this helper centralizes “find any matching assessment.”

Where it is used
- `BuildSubjectStatusLookup`.

How it works
- Iterates subject IDs and uses the lookup.

Things to look out for
- Order of subject IDs determines which assessment is selected if multiple exist.

## Method: ResolveCombinedBenchmarkSubjectId
Signature
- `BenchmarkSubjectDefinition[] ResolveCombinedBenchmarkSubjectId(...)`

What it does
- Resolves the global subject ID for the combined RWM subject using benchmark data.

Why it exists
- Combined RWM may not have a direct global subject mapping in school data.

Where it is used
- `BuildReportAsync`.

How it works
- Finds candidate global subject IDs present in benchmark data but not used by known subjects; accepts only if exactly one candidate exists.

Things to look out for
- If zero or multiple candidates are found, combined subject stays unresolved.

## Method: MapBenchmarkRow (national/local authority)
Signature
- `BenchmarkRow? MapBenchmarkRow(JuniperNationalBenchmarkEntity entity)`
- `BenchmarkRow? MapBenchmarkRow(JuniperLocalAuthorityBenchmarkEntity entity)`

What it does
- Normalizes benchmark entities into a common `BenchmarkRow` model.

Why it exists
- Downstream aggregation expects a consistent data shape regardless of source.

Where it is used
- `BuildReportAsync`.

How it works
- Validates required aggregation keys, computes percentage if missing, and returns `BenchmarkRow`.

Things to look out for
- Entities missing global subject or year group IDs are skipped.

## Method: BuildBenchmarkLookup
Signature
- `Dictionary<BenchmarkKey, BenchmarkRow> BuildBenchmarkLookup(IEnumerable<BenchmarkRow> rows)`

What it does
- Builds a lookup map keyed by context group, global subject, and year group.

Why it exists
- Frequent access to benchmark rows is required for summaries and comparisons.

Where it is used
- `BuildReportAsync`.

How it works
- Groups rows by `BenchmarkKey` and selects the first for each key.

Things to look out for
- Multiple rows with the same key are collapsed; only the first survives.

## Method: BuildKpiSummaryRows
Signature
- `KpiSummaryRowViewModel[] BuildKpiSummaryRows(...)`

What it does
- Creates KPI summary rows per subject for the report summary section.

Why it exists
- Provides top-level comparisons across national and LA benchmarks.

Where it is used
- `BuildReportAsync`.

How it works
- Calculates school metrics across benchmark year groups.
- Aggregates benchmark data across year groups and builds comparisons.

Things to look out for
- Denominator of zero yields null percentages and comparisons.

## Method: BuildYearGroupSummaryRows
Signature
- `YearGroupSummaryRowViewModel[] BuildYearGroupSummaryRows(...)`

What it does
- Builds per-year-group summary rows for each subject.

Why it exists
- The report provides year-level benchmarking to identify cohort variation.

Where it is used
- `BuildReportAsync`.

How it works
- Iterates year groups and subjects, computes school metrics, and attaches benchmark comparisons.

Things to look out for
- Missing benchmarks for a year/subject produce null comparisons.

## Method: BuildCombinedSubjectPerformance
Signature
- `CombinedSubjectPerformanceViewModel BuildCombinedSubjectPerformance(...)`

What it does
- Creates the combined subject performance section (e.g., RWM or EYFS all goals).

Why it exists
- Report includes a combined performance chart across multiple subjects.

Where it is used
- `BuildReportAsync`.

How it works
- Chooses year groups and title based on `SchoolPhase`.
- Builds per-subject performance details.

Things to look out for
- For EYFS, year groups are limited to Nursery/Reception only.

## Method: BuildSubjectPerformanceDetails
Signature
- `SubjectPerformanceDetails BuildSubjectPerformanceDetails(...)`

What it does
- Builds performance bars and benchmark lines for a single subject.

Why it exists
- A reusable block for combined and per-subject charts.

Where it is used
- `BuildCombinedSubjectPerformance`.

How it works
- Calculates school totals and benchmark aggregates, then builds per-year bars.

Things to look out for
- If the benchmark global subject ID is missing, benchmark lines are null.

## Method: BuildSubjectBreakdown
Signature
- `SubjectBenchmarkViewModel[] BuildSubjectBreakdown(...)`

What it does
- Creates the per-subject breakdown sections (year group, contextual, attendance, ethnicity).

Why it exists
- Report expects a detailed drilldown for each subject.

Where it is used
- `BuildReportAsync`.

How it works
- Composes year group performance, contextual group analysis, attendance summary, and placeholder ethnicity analysis (later replaced).

Things to look out for
- Ethnicity analysis is injected later by `ApplyEthnicityAnalysis`.

## Method: ApplyEthnicityAnalysis
Signature
- `void ApplyEthnicityAnalysis(...)`

What it does
- Injects ethnicity analysis results into the subject breakdown list.

Why it exists
- Ethnicity analysis is computed separately and added after subject breakdown creation.

Where it is used
- `BuildReportAsync`.

How it works
- Maps analysis by subject key, skipping subjects without keys.

Things to look out for
- Subject keys must align with the analysis dictionary keys.

## Method: BuildAttendanceSummary
Signature
- `AttendanceSummaryViewModel BuildAttendanceSummary(...)`

What it does
- Builds attendance band summaries with benchmark comparisons.

Why it exists
- Attendance is a key contextual lens for benchmarking.

Where it is used
- `BuildSubjectBreakdown`.

How it works
- Computes school percentages per attendance band and uses contextual group IDs to fetch benchmark aggregates.

Things to look out for
- Bands with missing context group IDs yield null comparisons.

## Method: GetAttendanceBandDefinitions
Signature
- `AttendanceBandDefinition[] GetAttendanceBandDefinitions()`

What it does
- Defines attendance band thresholds used for grouping.

Why it exists
- Centralizes thresholds to keep report consistency.

Where it is used
- `BuildAttendanceSummary`.

How it works
- Returns four bands with labels and upper/lower bounds.

Things to look out for
- Text label contains a spelling of “Persistant”; if UI depends on exact label, keep consistent.

## Method: IsPupilInAttendanceBand
Signature
- `bool IsPupilInAttendanceBand(PupilEntity pupil, AttendanceBandDefinition band)`

What it does
- Determines if a pupil’s attendance percentage falls within a band.

Why it exists
- Used for band-based cohort slicing.

Where it is used
- `BuildAttendanceSummary`.

How it works
- Returns false if attendance is null or outside bounds.

Things to look out for
- Null attendance excludes pupil from all bands, reducing denominators.

## Method: GetAttendanceContextGroupId
Signature
- `int? GetAttendanceContextGroupId(AttendanceBandDefinition band)`

What it does
- Maps attendance bands to contextual group IDs used in benchmark data.

Why it exists
- Benchmarks are keyed by contextual group IDs, not by band definitions.

Where it is used
- `BuildAttendanceSummary`.

How it works
- Switches on band order to map to hardcoded IDs.

Things to look out for
- If Juniper IDs change, this mapping must be updated.

## Method: BuildYearGroupPerformance
Signature
- `YearGroupPerformanceViewModel BuildYearGroupPerformance(...)`

What it does
- Builds subject year-group performance with benchmark comparisons.

Why it exists
- Required for the report’s per-subject year group breakdown.

Where it is used
- `BuildSubjectBreakdown`.

How it works
- Calculates whole-school metrics and then per-year metrics with comparisons.

Things to look out for
- Zero denominators yield null cohort counts and percentages.

## Method: BuildContextualGroupAnalysis
Signature
- `ContextualGroupAnalysisViewModel BuildContextualGroupAnalysis(...)`

What it does
- Builds contextual group comparisons (gender, disadvantage, etc.) by year group.

Why it exists
- Benchmarking report highlights attainment gaps across contextual groups.

Where it is used
- `BuildSubjectBreakdown`.

How it works
- Iterates `ContextualGroupValues`, applies inclusion predicates, calculates metrics per year group, and attaches benchmark comparisons.

Things to look out for
- Contextual group definitions are static; changes in `PupilContextualValueCalculationDictionary` can shift cohorts.

## Method: BuildKeyStages
Signature
- `KeyStageGroup[] BuildKeyStages(ContextualGroupRow[] groups)`

What it does
- Builds key stage groupings from contextual group data.

Why it exists
- Report displays key stage aggregates for contextual groups.

Where it is used
- `BuildContextualGroupAnalysis`.

How it works
- Filters group years by defined key stage year group lists.

Things to look out for
- Key stage definitions are hardcoded to primary years.

## Method: BuildLineComparison
Signature
- `BenchmarkComparison? BuildLineComparison(bool includeComparison, decimal? benchmarkPercent, int? benchmarkCohort)`

What it does
- Builds a minimal comparison object for benchmark lines.

Why it exists
- Separate benchmark line logic is used for chart overlays.

Where it is used
- `BuildSubjectPerformanceDetails`.

How it works
- Returns null if comparisons are disabled, otherwise returns the simple comparison model.

Things to look out for
- Unlike `BuildBenchmarkComparison`, no delta is calculated here.

## Method: AggregateBenchmarkData
Signature
- `BenchmarkAggregateData? AggregateBenchmarkData(...)`

What it does
- Aggregates benchmark rows across multiple year groups into a single percentage/cohort.

Why it exists
- KPI summaries and combined performance need a single benchmark figure for multiple years.

Where it is used
- `BuildKpiSummaryRows`, `BuildSubjectPerformanceDetails`, `BuildAttendanceSummary`.

How it works
- Retrieves rows per year group, sums numerators/denominators, and calculates percentage.

Things to look out for
- Returns null if no rows or denominator is zero.

## Method: GetBenchmarkRow
Signature
- `BenchmarkRow? GetBenchmarkRow(...)`

What it does
- Retrieves a single benchmark row from a lookup map.

Why it exists
- Simplifies access to benchmark data by composite key.

Where it is used
- Year group and contextual calculations.

How it works
- Returns null when global subject is missing or key not found.

## Method: CalculateMetrics
Signature
- `MetricTotals CalculateMetrics(...)`

What it does
- Computes numerator/denominator for “at or above” metrics.

Why it exists
- All comparisons are based on counts of assessed pupils and those meeting expectations.

Where it is used
- KPI, year group, contextual, attendance, and combined performance calculations.

How it works
- Iterates pupils, applies predicate, counts only pupils with assessments, and increments numerator for “at or above.”

Things to look out for
- Pupils without assessments are excluded entirely from denominators.

## Records: BenchmarkSubjectDefinition, BenchmarkRow, BenchmarkKey, BenchmarkAggregateData, MetricTotals, PupilSubjectStatus, KeyStageDefinition
What they do
- Internal models used to carry definitions and intermediate values across orchestration steps.

Why they exist
- Avoids passing unwieldy tuples and supports named fields for clarity.

Things to look out for
- `BenchmarkKey` drives lookup uniqueness; any mismatch in subject or year group IDs will break comparisons.

## Method: GetEthnicityAnalysisBySubjectKeyAsync
Signature
- `Task<Dictionary<string, EthnicityAnalysisViewModel>> GetEthnicityAnalysisBySubjectKeyAsync(...)`

What it does
- Builds ethnicity analysis by subject key with school, LA, and national comparisons.

Why it exists
- Ethnicity analysis is complex and requires its own data flow; separating it keeps the main report orchestration readable.

Where it is used
- `BuildReportAsync`.

How it works
- Validates assessment point and pupil cohort, loads pupils and subjects, resolves subject IDs by key.
- Loads summative code sets, codes, ARE code sets, and uses `IAreAssessmentOrchestrator` to calculate assessments.
- Builds per-pupil subject flags for reading/writing/maths and derives year group participation per subject key.
- Loads benchmark data (national and optionally LA) and builds per-ethnicity group comparisons using contextual group mappings.
- Returns analysis keyed by subject key.

Things to look out for
- Denominators are “pupils with assessments,” not total cohort size.
- Combined RWM relies on all three subjects being present for a pupil.
- If subject IDs are missing, the method returns empty analysis.

## Method: GetSubjectPredicates
Signature
- `(Func<PupilSubjectFlags, bool> Denominator, Func<PupilSubjectFlags, bool> Numerator) GetSubjectPredicates(string subjectKey)`

What it does
- Returns predicates for denominator/numerator calculations based on subject key.

Why it exists
- Encapsulates the rules for how combined and single subjects are counted.

Where it is used
- `GetEthnicityAnalysisBySubjectKeyAsync`.

How it works
- Uses subject key to determine which flags indicate assessment presence and “at or above” status.

## Method: CreateEmptyEthnicityAnalysisBySubjectKey
Signature
- `Dictionary<string, EthnicityAnalysisViewModel> CreateEmptyEthnicityAnalysisBySubjectKey()`

What it does
- Creates a placeholder ethnicity analysis structure with empty data rows.

Why it exists
- Prevents nulls in response payloads and keeps UI rendering predictable.

Where it is used
- `GetEthnicityAnalysisBySubjectKeyAsync` on early exits.

## Method: BuildEthnicityCategoryLookup
Signature
- `Dictionary<Ethnicity, int> BuildEthnicityCategoryLookup(...)`

What it does
- Maps ethnicity IDs to category IDs.

Why it exists
- Ethnicity grouping logic is category-based, not individual ethnicity-based.

Where it is used
- Ethnicity analysis flow.

## Method: BuildPupilsByCategory
Signature
- `Dictionary<int, HashSet<int>> BuildPupilsByCategory(...)`

What it does
- Builds pupil ID sets per ethnicity category.

Why it exists
- Allows efficient calculation of cohort membership per group.

Where it is used
- Ethnicity analysis flow.

## Method: BuildContextualValuesByCategory
Signature
- `Dictionary<int, HashSet<PupilContextualValue>> BuildContextualValuesByCategory(...)`

What it does
- Builds contextual value sets per ethnicity category for benchmarking comparisons.

Why it exists
- Benchmarks use contextual group IDs; this maps ethnicity categories to those IDs.

Where it is used
- Ethnicity analysis flow.

## Method: BuildGroupPupilIds
Signature
- `HashSet<int> BuildGroupPupilIds(EthnicityGroupDefinition group, IReadOnlyDictionary<int, HashSet<int>> pupilsByCategory)`

What it does
- Aggregates pupil IDs across multiple ethnicity categories for a single group.

Why it exists
- Ethnicity groups like “White” or “Asian” are composed of multiple categories.

Where it is used
- Ethnicity analysis flow.

## Method: BuildGroupContextualValues
Signature
- `HashSet<PupilContextualValue> BuildGroupContextualValues(...)`

What it does
- Aggregates contextual values across categories for a single group.

Why it exists
- Used to query benchmark data for the entire ethnicity group.

Where it is used
- Ethnicity analysis flow.

## Method: MapEthnicityToContextualValue
Signature
- `PupilContextualValue? MapEthnicityToContextualValue(Ethnicity ethnicity)`

What it does
- Maps ethnicity enum values to contextual value IDs.

Why it exists
- Benchmark data is keyed by `PupilContextualValue` rather than raw ethnicity.

Where it is used
- Ethnicity analysis flow.

Things to look out for
- Mapping assumes contextual IDs are offset by +2000; changes in enum definitions will break this.

## Method: GetSubjectIdsForGlobalSubject
Signature
- `int[] GetSubjectIdsForGlobalSubject(IEnumerable<SubjectEntity> subjects, GlobalSubject globalSubject)`

What it does
- Returns subject IDs matching a global subject using multiple matching strategies.

Why it exists
- Different data sources can store subject relationships inconsistently.

Where it is used
- Ethnicity analysis flow.

Things to look out for
- Looser matching (by name/key) can pull in unintended subjects if naming is inconsistent.

## Method: MapGlobalSubjectIds
Signature
- `GlobalSubject[] MapGlobalSubjectIds(IEnumerable<int> subjectIds)`

What it does
- Converts integer IDs to `GlobalSubject` enums when valid.

Why it exists
- Benchmarks require global subject IDs for comparisons.

Where it is used
- Ethnicity analysis flow.

## Method: BuildBenchmarkMetrics (national/local authority/values)
Signature
- `BenchmarkMetrics BuildBenchmarkMetrics(...)` (three overloads)

What it does
- Aggregates benchmark numerators/denominators and returns a percentage/cohort count.

Why it exists
- Ethnicity analysis comparisons are done over multiple contextual values and year groups.

Where it is used
- `GetEthnicityAnalysisBySubjectKeyAsync`.

Things to look out for
- Empty inputs yield `BenchmarkMetrics.Empty` (null percentage and cohort).

## Method: CalculatePercentage
Signature
- `decimal? CalculatePercentage(int numerator, int denominator)`

What it does
- Calculates a rounded percentage with one decimal place.

Why it exists
- Ensures consistent rounding across the report.

Where it is used
- Ethnicity analysis calculations.

## Method: BuildSchoolMetrics
Signature
- `BenchmarkComparisonMetrics BuildSchoolMetrics(decimal? schoolPercent, int? cohortCount)`

What it does
- Builds a baseline comparison model for school data (no delta/indicators).

Why it exists
- School values appear alongside benchmarks using a shared shape.

Where it is used
- Ethnicity analysis flow.

## Method: BuildBenchmarkComparisonWithIndicator
Signature
- `BenchmarkComparisonMetrics? BuildBenchmarkComparisonWithIndicator(...)`

What it does
- Builds comparison metrics and adds indicator metadata for delta bands.

Why it exists
- Used where the UI needs a “difference indicator” (colour/label).

Where it is used
- Ethnicity analysis flow.

## Method: BuildBenchmarkComparison
Signature
- `BenchmarkComparisonMetrics? BuildBenchmarkComparison(...)`

What it does
- Produces comparison metrics including delta between school and benchmark.

Why it exists
- Centralizes delta calculation and rounding.

Where it is used
- Ethnicity analysis flow.

## Method: BuildDifferenceIndicators
Signature
- `PupilIndicator[] BuildDifferenceIndicators(decimal? delta)`

What it does
- Converts a delta into a list of indicator models.

Why it exists
- Supports UI badges for “significantly below/above” in benchmarking.

Where it is used
- `BuildBenchmarkComparisonWithIndicator`.

## Method: GetDifferenceIndicatorDetails
Signature
- `(string Label, string Description, string Colour, int Order) GetDifferenceIndicatorDetails(decimal delta)`

What it does
- Maps delta ranges to indicator metadata.

Why it exists
- Keeps indicator thresholds and labels in one place.

Where it is used
- `BuildDifferenceIndicators`.

## Method: GetEthnicityGroupKeyStages
Signature
- `EthnicityKeyStageGroup[] GetEthnicityGroupKeyStages(EthnicityGroupRow[] groups)`

What it does
- Builds key stage groupings for ethnicity analysis results.

Why it exists
- Mirrors key stage grouping used elsewhere but for ethnicity rows.

Where it is used
- `GetEthnicityAnalysisBySubjectKeyAsync`, `CreateEmptyEthnicityAnalysisBySubjectKey`.

## Records: EthnicityGroupDefinition, BenchmarkMetrics, PupilSubjectFlags
What they do
- Support ethnicity grouping, benchmark aggregation, and per-pupil subject flags for ethnicity analysis.

Things to look out for
- `PupilSubjectFlags` defines both “has assessment” and “at/above” flags; changing those semantics changes denominators and outcomes.

## Extension ideas (expert-level)
- Add support for secondary phase benchmarking by parameterizing year groups, subject sets, and benchmark keys.
- Introduce caching for benchmark lookups and summative assessments to reduce repeated queries in batch runs.
- Add a method to compute multi-year trend lines for benchmarking across multiple assessment points.
- Add optional inclusion of “All Pupils” vs “Assessed Pupils” denominators to enable completeness-aware comparisons.
- Add a configurable “contextual group pack” to allow schools to define which groups appear in the report.
- Add diagnostics output (counts, missing benchmarks, missing code sets) to help support teams troubleshoot report discrepancies.

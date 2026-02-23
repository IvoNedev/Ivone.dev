# Sonar Learning Plan (System, Domain, Architecture, Data, Operations)

This is a linear, top-down learning path. Each phase contains ordered steps. Each step explicitly states what to learn, why it exists, where to look in code, and the questions to answer before moving on.

Phase 0: System Orientation
1. What this product is (Sonar platform scope)
   - What to learn: The overall product purpose, major services, and how Sonar fits into Juniper’s ecosystem.
   - Why it exists: Without a shared mental model, later details won’t connect to real workflows.
   - Where it lives in the codebase: `sonar-api/HelperX/README.md`, `sonar-api/HelperX/System overview/DomainOverview.md`, `sonar/README.md`.
   - Questions to answer before moving on:
     1) Which major services exist and which are “core” vs “supporting”?
     2) Where do the web frontends live relative to the API?
     3) Which repositories are in scope for daily changes?

2. Who uses it (roles, permissions, personas)
   - What to learn: User roles (teachers, leadership, admins), permissions model, and how those map to API access.
   - Why it exists: Authorization shapes every workflow and data query.
   - Where it lives in the codebase: `sonar-api/HelperX/System overview/DomainOverview.md` (Users/Roles), `sonar-api/sonar-data/Entity/*Role*`, `sonar-api/src/Middleware/RequiresPermissionEndpointFilters.cs`.
   - Questions to answer before moving on:
     1) Which roles are system-level vs school-level?
     2) Where are permissions enforced (filters vs handlers vs DB)?
     3) Which endpoints are machine-to-machine only?

3. What problems it solves in real schools
   - What to learn: How schools use assessments, tracking, reporting, and benchmarking.
   - Why it exists: Business rules are a reflection of school processes; misunderstand those and you break features.
   - Where it lives in the codebase: `sonar-api/HelperX/System overview/EducationDomainOverview.md`, `sonar-api/HelperX/Confluence/*.pdf` (statutory, roll-over, observations, parent reports).
   - Questions to answer before moving on:
     1) Which workflows are daily teacher tasks vs leadership reporting tasks?
     2) Which workflows are statutory/regulated vs internal? 

4. High-level mental model of the system
   - What to learn: The request flow between frontends and API and the worker/queue pattern.
   - Why it exists: Nearly all changes must respect the system boundary and async processing model.
   - Where it lives in the codebase: `sonar/README.md` (request flow), `sonar-api/HelperX/System overview/DomainOverview.md` (architecture summary), `sonar-api/src/Infrastructure/Queue/QueueRegistration.cs`.
   - Questions to answer before moving on:
     1) Which operations are synchronous vs queued?
     2) Which services own HTML-to-PDF generation?

5. What not to worry about yet
   - What to learn: Identify legacy/edge areas to defer until later phases.
   - Why it exists: This reduces early overload while keeping correctness.
   - Where it lives in the codebase: `sonar-api/src/AreasLegacy/*`, `sonar-api/HelperX/System overview/DomainOverview.md` (legacy vs new).
   - Questions to answer before moving on:
     1) Which legacy areas can be postponed without breaking user stories?

Phase 1: Education Domain Fundamentals
1. UK school structures: years, terms, key stages, cohorts
   - What to learn: Academic year/term structure, year groups, key stages, cohorts.
   - Why it exists: These are the primary axes of all data partitioning.
   - Where it lives in the codebase: `sonar-api/HelperX/System overview/EducationDomainOverview.md`, `sonar-utilities/src/AssessmentPoint.cs`, `sonar-utilities/src/NationalCurriculumYear.cs`.
   - Questions to answer before moving on:
     1) How does Sonar encode terms (including end-of-year projections)?
     2) How are year groups stored and used in filters?

2. Assessments: formative vs summative vs statutory vs test scores
   - What to learn: Differences in data shape and purpose; where they are persisted.
   - Why it exists: Data model and calculations differ across assessment types.
   - Where it lives in the codebase: `sonar-api/HelperX/System overview/EducationDomainOverview.md`, `sonar-data/Entity/SummativeAssessmentEntity.cs`, `sonar-data/Entity/FormativeObjectiveAssessmentEntity.cs`, `sonar-data/Entity/StatutoryAssessmentEntity.cs`, `sonar-api/src/Areas/TestScores/*`.
   - Questions to answer before moving on:
     1) Which reports depend on formative data vs summative data?
     2) Which assessment types are statutory and carry compliance obligations?

3. Progress and attainment in practice
   - What to learn: How progress is derived across assessment points and how attainment is represented.
   - Why it exists: Progress tracking underpins the reporting features.
   - Where it lives in the codebase: `sonar-utilities/src/AssessmentPoint.cs`, `sonar-api/src/Areas/Reports/*`, `sonar-api/src/Areas/Reports/Common/Orchestrators/*`.
   - Questions to answer before moving on:
     1) Which orchestrators compare points across terms?
     2) Which reports use band/ARE logic?

4. Reporting: teacher vs leadership usage
   - What to learn: Different reporting surfaces and how they are used day-to-day.
   - Why it exists: UI and PDF outputs have different constraints and expectations.
   - Where it lives in the codebase: `sonar/reports-web/src/app/report/*`, `sonar/reports-web/src/app/component/*`, `sonar-api/src/Areas/Reports/*`, `sonar-api/HelperX/Confluence/Juniper-Parent Reports-031125-094529.pdf`.
   - Questions to answer before moving on:
     1) Which reports are classroom-facing vs leadership-facing?
     2) Which reports are PDF-first?

5. Legal, safeguarding, and data sensitivity considerations
   - What to learn: Child data sensitivity, statutory data handling, and traceability.
   - Why it exists: These shape security requirements and auditability.
   - Where it lives in the codebase: `sonar-api/HelperX/Confluence/Juniper-Sonar Data Subject Access Request (DSAR)-031125-094850.pdf`, `sonar-api/HelperX/Confluence/Juniper-Statutory Data - Eligibility Rules-031125-094541.pdf`.
   - Questions to answer before moving on:
     1) Which data flows are sensitive and require auditing?
     2) Which data must be retained vs can be deleted?

Phase 2: Product & Business Logic
1. Core product features and workflows
   - What to learn: Core flows (assessments, observations, reporting, benchmarking, statutory outcomes).
   - Why it exists: These features define the business-critical paths.
   - Where it lives in the codebase: `sonar-api/HelperX/System overview/DomainOverview.md` (business flows), `sonar-api/src/Areas/*`.
   - Questions to answer before moving on:
     1) Which flows require queue processing?
     2) Which flows are read-heavy vs write-heavy?

2. End-to-end user journeys
   - What to learn: A full walkthrough from UI to API to DB for major workflows.
   - Why it exists: Ensures you can trace feature behavior end-to-end.
   - Where it lives in the codebase: `sonar/reports-web/src/app/report/*`, `sonar/sonar-web/src/*`, `sonar-api/src/Areas/*`.
   - Questions to answer before moving on:
     1) Which APIs serve which UI pages?
     2) Where are the key filter parameters defined and parsed?

3. Critical business rules
   - What to learn: Non-negotiable rules for assessments, statutory logic, and progression.
   - Why it exists: Changing these causes real-world reporting errors.
   - Where it lives in the codebase: `sonar-api/src/Areas/Statutory/HeadlineCalculators/*`, `sonar-api/src/Areas/Reports/*`, `sonar-utilities/src/FeatureKey.cs`.
   - Questions to answer before moving on:
     1) Where are statutory rules encoded and configured?
     2) Which rules are defined in code vs SQL functions?

4. Non-obvious constraints from education reality
   - What to learn: Data entry timing, term boundaries, cohort anomalies, end-of-year projections.
   - Why it exists: Real-world academic calendars and data entry are messy.
   - Where it lives in the codebase: `sonar-utilities/src/AssessmentPoint.cs`, `sonar-api/HelperX/Confluence/Juniper-Calculate Pupil Year Group-031125-094841.pdf`.
   - Questions to answer before moving on:
     1) How does Sonar handle out-of-sequence assessment points?
     2) How are cohorts and year groups recalculated?

5. Where business logic lives vs where it should not live
   - What to learn: Clear separation between API handlers, stored procedures, and UI calculations.
   - Why it exists: Avoids logic duplication and inconsistent calculations.
   - Where it lives in the codebase: `sonar-api/src/Areas/*`, `sonar-api/src/StoredProcedures/*`, `sonar/reports-web/src/app/helpers/*`.
   - Questions to answer before moving on:
     1) Which calculations are duplicated in UI vs API?
     2) Where are legacy SQL functions still authoritative?

Phase 3: High-Level Architecture
1. System architecture diagram (described in words)
   - What to learn: The module/service boundaries and how data flows between them.
   - Why it exists: Architectural changes must respect these boundaries.
   - Where it lives in the codebase: `sonar-api/HelperX/System overview/DomainOverview.md`, `sonar/README.md`.
   - Questions to answer before moving on:
     1) Which services are deployed independently?
     2) Where does PDF generation occur and how is it invoked?

2. Frontend vs backend responsibilities
   - What to learn: Which computations happen in the UI vs in API/services.
   - Why it exists: Avoid pushing business rules into the wrong layer.
   - Where it lives in the codebase: `sonar/reports-web/src/*`, `sonar/sonar-web/src/*`, `sonar-api/src/Areas/*`.
   - Questions to answer before moving on:
     1) Which endpoints are designed purely for UI rendering?
     2) Which UI helpers are domain-critical and should move server-side?

3. Services, modules, or bounded contexts
   - What to learn: Areas/modules and their ownership of domain concepts.
   - Why it exists: Faster navigation and safer modifications.
   - Where it lives in the codebase: `sonar-api/src/Areas/*`, `sonar-api/src/AreasLegacy/*`.
   - Questions to answer before moving on:
     1) Which contexts are coupled through shared tables or stored procedures?

4. External dependencies and integrations
   - What to learn: Identity providers, Wonde, queues, storage, telemetry.
   - Why it exists: Integration failures often look like core system bugs.
   - Where it lives in the codebase: `sonar-api/src/ExternalApis/*`, `sonar-api/HelperX/System overview/DomainOverview.md`, `sonar-api/src/Infrastructure/*`.
   - Questions to answer before moving on:
     1) Which integrations are mandatory for dev vs optional?
     2) Which integrations are security-sensitive?

5. Trust boundaries and data flow
   - What to learn: How data moves across services, where trust is enforced.
   - Why it exists: Prevents authorization and privacy mistakes.
   - Where it lives in the codebase: `sonar-api/src/Middleware/*`, `sonar-api/src/Program.cs`, `sonar-api/src/Infrastructure/Queue/*`.
   - Questions to answer before moving on:
     1) Which endpoints require machine keys?
     2) Where are JWT claims interpreted?

Phase 4: Codebase Map
1. Repository layout (all repos in scope)
   - What to learn: How sonar-api, sonar, and sonar-multischool are organized.
   - Why it exists: The system is multi-repo and you must know where to change what.
   - Where it lives in the codebase: `sonar-api/HelperX/README.md`, `sonar/README.md`, `sonar-multischool/README.md`.
   - Questions to answer before moving on:
     1) Which repo hosts each user-facing UI?
     2) Which repo hosts PDF and reporting UI?

2. Purpose of each major folder/module
   - What to learn: The role of `Areas`, `AreasLegacy`, `Infrastructure`, `StoredProcedures`, and worker projects.
   - Why it exists: Avoids editing the wrong layer.
   - Where it lives in the codebase: `sonar-api/HelperX/System overview/DomainOverview.md`, `sonar-api/src/*`.
   - Questions to answer before moving on:
     1) Which areas are safe to extend vs legacy to avoid?

3. Naming conventions and patterns
   - What to learn: API routes, handler naming, entity naming, report IDs.
   - Why it exists: Conventions guide navigation and reduce errors.
   - Where it lives in the codebase: `sonar-api/src/Areas/*`, `sonar-api/sonar-data/Entity/*`, `sonar/reports-web/src/app/report/*`.
   - Questions to answer before moving on:
     1) How do report IDs map to pages and parameters?

4. Shared libraries and utilities
   - What to learn: Which projects provide shared models and helper functions.
   - Why it exists: Consistency across services and UIs.
   - Where it lives in the codebase: `sonar-core/*`, `sonar-data/*`, `sonar-utilities/*`, `sonar-queue/*`.
   - Questions to answer before moving on:
     1) Which shared library is authoritative for assessment point logic?

5. Anti-patterns or legacy areas to treat carefully
   - What to learn: Red flags and known debt areas.
   - Why it exists: Avoid regressions and broken flows.
   - Where it lives in the codebase: `sonar-api/src/AreasLegacy/*`, `sonar-api/HelperX/System overview/DomainOverview.md` (risks/gaps).
   - Questions to answer before moving on:
     1) Which legacy endpoints are still used by UI?

Phase 5: Data Model & Persistence
1. Core entities and relationships
   - What to learn: School, pupil, assessment, observation, subject, term, year, role.
   - Why it exists: All queries and reports are built from these.
   - Where it lives in the codebase: `sonar-api/sonar-data/Entity/*`, `sonar-api/HelperX/System overview/DomainOverview.md`.
   - Questions to answer before moving on:
     1) Which entities are write-heavy vs read-heavy?

2. Database schema and migrations
   - What to learn: DbUp scripts, schema organization, and migration flow.
   - Why it exists: Schema changes are high risk.
   - Where it lives in the codebase: `sonar-dbup/src/Program.cs`, `sonar-dbup/src/Scripts/*`, `sonar-api/HelperX/SQL/*`.
   - Questions to answer before moving on:
     1) How are schema changes reviewed and deployed?

3. How education concepts map to tables/objects
   - What to learn: Mapping from domain terms to schema and entities.
   - Why it exists: Ensures you can trace logic to storage.
   - Where it lives in the codebase: `sonar-api/HelperX/System overview/EducationDomainOverview.md`, `sonar-api/sonar-data/Entity/*`.
   - Questions to answer before moving on:
     1) Which concept is stored in code vs derived on the fly?

4. Data lifecycle (creation → mutation → reporting)
   - What to learn: End-to-end data flow for assessments and observations.
   - Why it exists: Prevents data consistency issues.
   - Where it lives in the codebase: `sonar-api/src/Areas/Assessment/*`, `sonar-api/src/Areas/Observation/*`, `sonar-api/src/Areas/Reports/*`.
   - Questions to answer before moving on:
     1) Which workflows enqueue jobs to process data before reporting?

5. Performance and scaling considerations
   - What to learn: Read-only vs read-write contexts, stored procedure use, caching.
   - Why it exists: Reporting is read-heavy and sensitive to performance regressions.
   - Where it lives in the codebase: `sonar-data/SonarDbContext.cs`, `sonar-api/src/Infrastructure/Cache/*`, `sonar-api/src/StoredProcedures/*`.
   - Questions to answer before moving on:
     1) Which report endpoints depend on stored procedures?

Phase 6: Frontend / UI Layer
1. UI architecture and framework choices
   - What to learn: Frontend stack in `sonar` and `sonar-multischool` repos.
   - Why it exists: You must know which UI hosts which workflows.
   - Where it lives in the codebase: `sonar/sonar-web/*`, `sonar/reports-web/*`, `sonar-multischool/sonar-ms-web/*`.
   - Questions to answer before moving on:
     1) Which UI hosts the reporting screens?

2. State management approach
   - What to learn: How UI state, filters, and report params are managed.
   - Why it exists: UI state shapes requests and reporting output.
   - Where it lives in the codebase: `sonar/reports-web/src/app/hooks/*`, `sonar/reports-web/src/app/helpers/reportData/*`.
   - Questions to answer before moving on:
     1) Where are report parameters parsed and normalized?

3. How screens map to domain concepts
   - What to learn: Which screens correspond to domain areas (assessment, observation, reporting).
   - Why it exists: UI changes must follow domain assumptions.
   - Where it lives in the codebase: `sonar/reports-web/src/app/report/*`, `sonar/sonar-web/src/app/components/pages/*`.
   - Questions to answer before moving on:
     1) Which screens correspond to statutory reporting?

4. Accessibility and education-specific UX constraints
   - What to learn: PDF/print constraints and teacher workflow considerations.
   - Why it exists: Reports must be legible and printable.
   - Where it lives in the codebase: `sonar/reports-web/public/DownloadPDFStyles.css`, `sonar/reports-web/src/app/component/common/DownloadButton.tsx`.
   - Questions to answer before moving on:
     1) How does PDF generation differ from screen rendering?

5. Where frontend logic must stop
   - What to learn: What must be server-authoritative vs client-only.
   - Why it exists: Prevents inconsistency and regulatory mistakes.
   - Where it lives in the codebase: `sonar/reports-web/src/app/helpers/*`, `sonar-api/src/Areas/*`.
   - Questions to answer before moving on:
     1) Which computations should be removed from the UI?

Phase 7: Backend / API Layer
1. API design philosophy
   - What to learn: Minimal APIs, endpoint filters, and area-based routing.
   - Why it exists: This shapes how you add and secure endpoints.
   - Where it lives in the codebase: `sonar-api/src/Program.cs`, `sonar-api/src/RoutesRegistration.cs`, `sonar-api/src/Middleware/*`.
   - Questions to answer before moving on:
     1) How are endpoints registered and grouped?

2. Authentication and authorization
   - What to learn: Auth0/FusionAuth configuration and permission enforcement.
   - Why it exists: Access to child data is tightly controlled.
   - Where it lives in the codebase: `sonar-api/src/AuthProviderRegistration.cs`, `sonar-api/src/Middleware/*`, `sonar-api/src/appsettings.json`.
   - Questions to answer before moving on:
     1) How does the API determine the current school context?

3. Validation and invariants
   - What to learn: Where validation happens (handlers vs stored procedures).
   - Why it exists: Bad data leads to incorrect reporting outcomes.
   - Where it lives in the codebase: `sonar-api/src/Areas/*`, `sonar-api/src/StoredProcedures/*`.
   - Questions to answer before moving on:
     1) Which validation is duplicated across layers?

4. Error handling patterns
   - What to learn: How errors are surfaced and logged.
   - Why it exists: Troubleshooting requires knowing error pathways.
   - Where it lives in the codebase: `sonar-api/src/Program.cs`, `sonar-api/src/Infrastructure/Telemetry/*`.
   - Questions to answer before moving on:
     1) Is there a consistent problem-details pattern?

5. Background jobs, batch processing, reporting pipelines
   - What to learn: Queue runner, queue processor, Wonde runner, document generation.
   - Why it exists: Many operations are asynchronous and time-consuming.
   - Where it lives in the codebase: `sonar-queue/*`, `sonar-queue-processor/src/Program.cs`, `sonar-queue-runner/src/Program.cs`, `sonar-document-generation/*`.
   - Questions to answer before moving on:
     1) Which jobs are scheduled vs triggered on demand?

Phase 8: Security, Privacy, and Compliance
1. User roles and permissions model
   - What to learn: Permissions, roles, and access checks for sensitive data.
   - Why it exists: UK education data must be access-controlled.
   - Where it lives in the codebase: `sonar-data/Entity/*Role*`, `sonar-api/src/Middleware/RequiresPermissionEndpointFilters.cs`.
   - Questions to answer before moving on:
     1) Which roles can access statutory data?

2. Data protection concerns (children’s data)
   - What to learn: Data minimization and DSAR obligations.
   - Why it exists: Compliance and safeguarding.
   - Where it lives in the codebase: `sonar-api/HelperX/Confluence/Juniper-Sonar Data Subject Access Request (DSAR)-031125-094850.pdf`.
   - Questions to answer before moving on:
     1) Which endpoints are likely to be DSAR-relevant?

3. Auditability and traceability
   - What to learn: Which tables store creation metadata and what is missing.
   - Why it exists: Regulatory and support requirements.
   - Where it lives in the codebase: `sonar-api/HelperX/Readmes/STD-1288-assessment-audit-visibility.md`, `sonar-data/Entity/*Assessment*`.
   - Questions to answer before moving on:
     1) Which data is not fully auditable today?

4. Threat model at a practical level
   - What to learn: Trust boundaries, machine keys, and service-to-service endpoints.
   - Why it exists: Prevents accidental exposure of private data.
   - Where it lives in the codebase: `sonar-api/src/appsettings.json`, `sonar-api/src/Middleware/*`.
   - Questions to answer before moving on:
     1) Where are machine keys validated?

Phase 9: Testing Strategy
1. Unit vs integration vs end-to-end testing
   - What to learn: Test coverage by layer and by repo.
   - Why it exists: Changes should be validated at the right level.
   - Where it lives in the codebase: `sonar-api/sonar-api-tests-*`, `sonar/automated-tests/e2e/*`.
   - Questions to answer before moving on:
     1) Which reports have E2E coverage?

2. What is critical to test and why
   - What to learn: High-risk calculations and statutory outcomes.
   - Why it exists: These are business-critical outputs.
   - Where it lives in the codebase: `sonar-api/src/Areas/Statutory/*`, `sonar-api/src/Areas/Reports/*`.
   - Questions to answer before moving on:
     1) Which statutory calculations have regression tests?

3. Gaps or risks in current coverage
   - What to learn: Known weak spots in test coverage.
   - Why it exists: Guides where to add tests when changing logic.
   - Where it lives in the codebase: `sonar-api/HelperX/PRReviews/*`, `sonar-api/HelperX/Bugs/*`.
   - Questions to answer before moving on:
     1) Which bug reports point to missing tests?

4. How education edge cases are tested
   - What to learn: Edge cases around cohorts, term boundaries, or special assessments.
   - Why it exists: UK education systems have special cases that can break calculations.
   - Where it lives in the codebase: `sonar-api/sonar-api-tests/data/*`, `sonar/automated-tests/e2e/Reports/*`.
   - Questions to answer before moving on:
     1) Which edge cases are not currently covered?

Phase 10: Deployment & Operations
1. Environments (dev, test, prod)
   - What to learn: Environment structure and per-env configuration.
   - Why it exists: Correct config is required for auth, queue, and storage.
   - Where it lives in the codebase: `sonar-api/HelperX/Confluence/Juniper-Environment Structure-031125-094816.pdf`, `sonar-api/infrastructure/helm-*/*`.
   - Questions to answer before moving on:
     1) Which configs differ across AWS vs Azure?

2. CI/CD pipeline
   - What to learn: Build/deploy scripts and Helm-based deployment.
   - Why it exists: Safe releases depend on pipeline knowledge.
   - Where it lives in the codebase: `sonar/build/*`, `sonar/infrastructure/helm-*/*`, `sonar-api/infrastructure/helm-*/*`.
   - Questions to answer before moving on:
     1) Which projects are deployed together vs independently?

3. Configuration and secrets
   - What to learn: Config sources and required secrets.
   - Why it exists: Local and prod environments fail without correct secrets.
   - Where it lives in the codebase: `sonar-api/src/appsettings.json`, `sonar/.devcontainer/*`, `sonar/README.md`.
   - Questions to answer before moving on:
     1) Which secrets are pulled from 1Password vs env vars?

4. Monitoring, logging, and alerting
   - What to learn: Telemetry setup and log flow.
   - Why it exists: Troubleshooting production issues requires this.
   - Where it lives in the codebase: `sonar-api/src/Infrastructure/Telemetry/*`, `sonar-api/src/Program.cs`.
   - Questions to answer before moving on:
     1) Where are traces and metrics exported?

5. Failure modes and recovery
   - What to learn: Queue failures, DB outages, PDF generation failures.
   - Why it exists: Recovery depends on knowing the weak links.
   - Where it lives in the codebase: `sonar-api/HelperX/Confluence/Juniper-Sonar - Technical - Taking the environment offline-031125-094832.pdf`, `sonar-api/sonar-document-generation/*`.
   - Questions to answer before moving on:
     1) Which services can fail independently without full outage?

Phase 11: Extension & Change
1. How to safely add new education features
   - What to learn: Adding feature keys, endpoints, reports, and UI surfaces.
   - Why it exists: New education features often ripple across reports and data.
   - Where it lives in the codebase: `sonar-utilities/src/FeatureKey.cs`, `sonar-api/src/Areas/Reports/*`, `sonar/reports-web/src/app/report/*`.
   - Questions to answer before moving on:
     1) Which components must be updated for a new report?

2. Where changes are most dangerous
   - What to learn: High-risk areas (statutory calculations, assessment models, data prep).
   - Why it exists: These changes can invalidate reporting outputs.
   - Where it lives in the codebase: `sonar-api/src/Areas/Statutory/*`, `sonar-api/src/Areas/Assessment/*`, `sonar-queue/src/AnalysisDataPreparation/*`.
   - Questions to answer before moving on:
     1) Which calculations are externally audited or regulated?

3. Common mistakes new developers make
   - What to learn: Typical pitfalls (duplicate logic, wrong assessment type, wrong phase).
   - Why it exists: Reduces regressions from misunderstandings.
   - Where it lives in the codebase: `sonar-api/HelperX/Readmes/*`, `sonar-api/HelperX/Bugs/*`.
   - Questions to answer before moving on:
     1) Which mistakes have already caused production incidents?

4. How to reason about impact before coding
   - What to learn: Dependency tracing across services and UI layers.
   - Why it exists: Ensures safe, predictable changes.
   - Where it lives in the codebase: `sonar-api/HelperX/System overview/DomainOverview.md`, `sonar/README.md`.
   - Questions to answer before moving on:
     1) Which reports or screens depend on the data you plan to change?
     2) Which background jobs need to be re-run after schema or logic changes?

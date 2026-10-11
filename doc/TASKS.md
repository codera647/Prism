# Prism - Dependency-Ordered Backlog

> Current campaign research / Gemini / UI extension: [Prism 0.3 specification and framework mapping](RELEASE_0_3.md). Earlier sections below remain historical baseline records.


> Current 0.2 desktop/browser scope and verification: [release record](RELEASE_0_2.md), [deployment architecture](DEPLOYMENT.md). Earlier local-only implementation sections below describe the 0.1 baseline; open human/quality gates remain open.

Updated: 2026-10-10 (Asia/Karachi). The local app is implemented. **Implemented locally** means a mechanical capability with linked evidence; it does not complete missing human/real-data prerequisites or framework stage signoff. Full completion-evidence requirements below are retained.

Source stages: framework PDF pp. 20-21; P00-P20 coverage: [PLAN.md](PLAN.md). Acceptance targets: [PRD.md](PRD.md). Owners are roles pending actual assignment.

Each task needs a linked evidence artifact before completion. Dependencies mean the named input/decision must exist; a failed feasibility result can legitimately stop or change dependent implementation. Conditional generation/provider tasks may be marked deferred with an ADR, never falsely passed.

The user selected Trailforge v0.1.0a1. [TRAILFORGE_INTEGRATION.md](TRAILFORGE_INTEGRATION.md) specifies generic product Harness, separate Develop coding agents, neutral SQLite, sequential tasks and explicit UNKNOWN handling. TF tasks below extend this backlog; [BUILD_ORDER.md](BUILD_ORDER.md) gives their dependency-safe execution positions.

## S0 - Discovery

### T01 Observe the real strategist workflow

- Owner: PO. Dependencies: none. Status: Planned.
- Work: observe/reconstruct representative organizing, searching, summary, correction, and difficult cases; separate lookup time from judgment time.
- Done evidence: user-validated current-state workflow, bottleneck notes, examples of costly errors, frequency and review expectations. Hypothetical workflow alone does not complete this task.

### T02 Ratify scope, autonomy, and ownership

- Owner: PO. Dependencies: T01. Status: In progress; local evidence only.
- Work: validate PRD MVP/non-goals, action matrix, supported language, role assignments, initial pilot envelope, and critical unknowns.
- Local evidence (2026-10-10): Local implementation/fixtures provide partial mechanics; representative permitted data, human ratification or operating ownership required by the original Done evidence remains missing. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: recorded scope/owner decisions and open-question owners; no campaign execution capability authorized by implication.

### T03 Measure the conventional baseline

- Owner: PO/ML. Dependencies: T01/T04 and access to permitted examples. Status: Planned.
- Work: run manual tags/keyword gallery, reference selection, and human summary tasks; propose/ratify outcome and countermetrics.
- Done evidence: measured time/relevance/review effort and task definitions; proposed PRD targets accepted or amended, not fabricated baseline numbers.

### T04 Audit source permission and context

- Owner: SEC/PO. Dependencies: T02. Status: Planned.
- Work: identify image/copy source, permission, sensitive content, language/category distribution, external provider constraints, retention/residency expectations.
- Done evidence: dataset/source manifest, explicit allowed uses, provider-processing disposition, and missing-data register. Unresolved rights block real-data external processing.

## S1 - Feasibility

### T05 Freeze representative reference cases

- Owner: ML. Dependencies: T03/T04. Status: In progress; local evidence only.
- Work: prepare development and two held-out collections, group near duplicates by campaign/template, label search/extraction/grouping cases and hard/no-match slices.
- Local evidence (2026-10-10): Local implementation/fixtures provide partial mechanics; representative permitted data, human ratification or operating ownership required by the original Done evidence remains missing. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: hashed versioned split manifest, relevance/source-span labels, annotator/dispute record, frozen test policy; use minimum starting sizes in PLAN or document justified revision.

### T06 Run E01 visual search baseline

- Owner: ML. Dependencies: T05. Status: In progress; local evidence only.
- Work: evaluate pretrained CLIP against manual/keyword search using supported queries, sparse/no-match cases, cold/warm profiles.
- Local evidence (2026-10-10): Local implementation/fixtures provide partial mechanics; representative permitted data, human ratification or operating ownership required by the original Done evidence remains missing. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: actual P@5/recall@5/no-match results and resource/latency measurements by slice, with pinned encoder/preprocessing/hardware. Record failure if target misses.

### T07 Run E02 visual grouping experiment

- Owner: ML. Dependencies: T05/T06 embeddings. Status: In progress; local evidence only.
- Work: compare manual grouping and threshold-based cosine clustering; tune only on development split; allow singletons.
- Local evidence (2026-10-10): Local implementation/fixtures provide partial mechanics; representative permitted data, human ratification or operating ownership required by the original Done evidence remains missing. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: adjudicated group usefulness, singleton rate, template imbalance, threshold sensitivity, reproducible configuration. Do not invent fixed named clusters.

### T08 Run E03 hook/offer extraction experiment

- Owner: ML. Dependencies: T05; T04 for provider use. Status: In progress; local evidence only.
- Work: compare supplied copy/rules, optional OCR, and bounded extractor; preserve exact source spans and amounts; measure missing/unsupported slices.
- Local evidence (2026-10-10): Local implementation/fixtures provide partial mechanics; representative permitted data, human ratification or operating ownership required by the original Done evidence remains missing. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: held-out macro-F1, exact-value/source-span errors, unknown/dispute rate, provider/local cost, selected fallback.

### T09 Run E04 grounded report experiment

- Owner: ML/PO. Dependencies: T07/T08; allowed provider/local generator configuration. Status: In progress; local evidence only.
- Work: compare exact aggregates/template report to one bounded generator; examine supported claims and three distinct actionable experiments.
- Local evidence (2026-10-10): Source-linked template reports are implemented; generator comparison, human actionability and review-time measurement remain open. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: adjudicated claim support/actionability, count/reference integrity, review time, latency/resource delta. If generation adds no value, document template-only disposition.

### T10 Run E05 and close feasibility choices

- Owner: ML/ENG. Dependencies: T06/T08/T09. Status: In progress; local evidence only.
- Work: compare CLIP-only with lexical/tag rank fusion; summarize E01-E05, hardware capacity, and conditional components.
- Local evidence (2026-10-10): Local implementation/fixtures provide partial mechanics; representative permitted data, human ratification or operating ownership required by the original Done evidence remains missing. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: measured comparative report, supported scope, selected approach or bounded next experiment, updated ADRs. S1 exits on defensible decisions, not forced success.

## S2 - Blueprint

### T11 Finalize contracts and responsibility boundaries

- Owner: ENG. Dependencies: T02/T04/T10. Status: Implemented locally.
- Work: turn ARCHITECTURE schemas/API/ports into implementable contracts; walk one request and its failure across trust boundaries.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: typed/schema examples for valid/invalid/partial cases; inward dependency graph; exact idempotency/revision/coverage semantics.

### T12 Ratify evaluation and stage gates

- Owner: PO/ML. Dependencies: T03/T10/T11. Status: Planned.
- Work: freeze acceptance values and supported populations, no-match rules, generation disposition, and blocking critical failures.
- Done evidence: versioned evaluation/acceptance contract linked to PRD; a failed critical check cannot be averaged away.

### T13 Finalize security and data lifecycle

- Owner: SEC/ENG. Dependencies: T04/T11. Status: In progress; local evidence only.
- Work: adopt scoped access, decoding limits, provider/secret policies, retention/deletion/tombstones, and restore semantics.
- Local evidence (2026-10-10): Local implementation/fixtures provide partial mechanics; representative permitted data, human ratification or operating ownership required by the original Done evidence remains missing. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: accepted threat/data-flow plan, enforcement ownership, concrete fixture list and proposed deployment constraints.

### T14 Set resources, human capacity, and operating ownership

- Owner: OPS/PO. Dependencies: T10/T12/T13/TF04. Status: In progress; local evidence only.
- Work: choose measured concurrency/deadlines, owner-set paid cap where applicable, reservation semantics, review capacity, SLO/RPO/RTO, runbook owners.
- Local evidence (2026-10-10): Local implementation/fixtures provide partial mechanics; representative permitted data, human ratification or operating ownership required by the original Done evidence remains missing. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: actual named ownership/availability and limits; no paid/hosted job can proceed without configured allowance/policy.

### T15 Pin stack and reproducible setup

- Owner: ENG/OPS. Dependencies: T11-T14. Status: Implemented locally.
- Work: finalize app ADR-10 with compatibility/load/privacy evidence and selected Trailforge pin; define one execution host, neutral SQLite plus product store, model/artifact/runtime/UI setup. Do not use legacy Review PostgresRunStore for generic Goals.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: clean reproducible fixture setup without production secrets, lockfiles/artifact hashes/config examples, no unnecessary services. S2 exit recorded.

## S3 - First end-to-end slice

### T16 Implement domain records and invariants

- Owner: ENG. Dependencies: T15/TF03. Status: Implemented locally.
- Work: product jobs/intents/run links/status/coverage/revisions/evidence/errors/real-cost reservations/tombstones and independent WorkflowRunner port. Native harness task records remain authoritative in Trailforge, not duplicated as an independently advancing product engine.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: meaningful invalid-state and stale-revision checks; schema examples match contract; core dependencies stay inward.

### T17 Implement identity and scoped reads/writes

- Owner: ENG/SEC. Dependencies: T16. Status: Implemented locally.
- Work: authenticated principal, collection ownership, scoped repositories/API/artifact proxy, isolated fixture principal.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: unauthorized reads/mutations across all resource types denied before retrieval/context; no hosted debug bypass.

### T18 Implement bounded upload and copy mapping

- Owner: ENG. Dependencies: T16/T17. Status: Implemented locally.
- Work: safe decode, staging, normalization/thumbnail, CSV preview validation, exact duplicate/variant policy.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: corrupt/oversized/path/ambiguous-mapping fixtures, per-file outcomes, same-image/different-copy variants, durable artifact references.

### T19 Implement durable admission and job runner

- Owner: ENG. Dependencies: T18. Status: Implemented locally.
- Work: durable product work admission/wakeups and explicit TrailforgeWorkflow composition around Goal/Task; reuse neutral local ownership/CAS/attempts/cancel rather than writing a second engine. Persist Goal reconstruction/config identity and coordinate host deadlines/idempotency.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: accepted intent survives restart; payload conflicts denied; linked run advances under current scope; raw harness/partial product state distinguished. Cross-store bridge and unknown recovery are completed by TF05/TF06 before model integration.

### T20 Implement encoder and versioned derived records

- Owner: ML/ENG. Dependencies: T19/TF05/T21/TF06; selected T06 encoder. Status: Implemented locally.
- Work: bounded image batching and query encoding, compatible cache reuse, manifest/normalization/dimension checks.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: known fixture retrieval, lineage, mismatch rejection, cold/warm timing, asset failures with explicit coverage.

### T21 Implement resource admission and usage reconciliation

- Owner: ENG/OPS. Dependencies: T19/T14/TF05. Status: Implemented locally.
- Work: separate actual monetary/resource admission from retained same-file Trailforge units; enforce provider limits/deadline, record uncertain cost, monitor finite cumulative kernel caps.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: concurrent actual-cost admission respects cap; kernel units remain consumed through UNKNOWN/cancel; reopening cannot reset ledger; adapters cannot claim monetary_guarantee from declared units.

### T22 Implement supported copy analysis

- Owner: ML/ENG. Dependencies: T19/T21; selected T08 path. Status: Implemented locally.
- Work: separate user/OCR copy, rules/extractor, source spans, unknown/disputed labels, local/provider policy checks.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: source-value/tag regression, unsupported/missing-copy behavior; provider unavailable preserves visual capability.

### T23 Implement groups, tags, and exact aggregates

- Owner: ML/ENG. Dependencies: T20/T22. Status: Implemented locally.
- Work: versioned visual groups/representatives, overlapping messaging tags, deterministic denominators, partial snapshot publication.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: fixture membership/count correctness, singleton behavior, variant vs unique-image counts, no mixed revisions.

### T24 Implement scoped natural-language search

- Owner: ML/ENG. Dependencies: T17/T20/T23. Status: Implemented locally; framework gate open.
- Work: collection-local query ranking, selected filters/fusion, currentness/no-match/limited states.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: demo query on relevant permitted fixtures, held-out relevance regression, deleted/unauthorized exclusion before ranking, timeout behavior.

### T25 Implement board and ad detail

- Owner: UX/ENG. Dependencies: T18/T19/T23/T24. Status: Implemented locally.
- Work: upload/status/board/search/detail, source copy, group/tag evidence, full-image inspection, responsive keyboard interaction.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: pending/partial/stale/failed/ready distinctions, image aspect preservation, missing-copy handling, keyboard flow.

### T26 Implement bounded report context

- Owner: ML/ENG. Dependencies: T21/T23. Status: Implemented locally.
- Work: current permitted aggregate/evidence bundle, representative/minority sampling, context/output limits and coverage.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: bounded payload, correct IDs/spans/denominators, inaccessible/stale inputs absent, visible omitted coverage.

### T27 Implement report/experiment draft path

- Owner: ML/ENG. Dependencies: T26; T09 generation disposition. Status: Implemented locally.
- Work: template baseline and conditionally selected generator returning claims and three distinct experiment payloads.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: validated schema, observations vs hypotheses, one main variable per experiment, unsupported performance claims absent. If generator deferred, explicitly label limited template capabilities.

### T28 Implement validation, review, and fallbacks

- Owner: ENG/ML/UX. Dependencies: T25/T27. Status: Implemented locally.
- Work: reference/authorization/currentness/count checks, finite repair, partial report, draft/review actions and source inspection.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: fabricated references/counts denied; invalid generation falls back; unsupported third experiment remains a gap; reviewed version binding works.

### T29 Implement correction, revisions, and deletion

- Owner: ENG/SEC. Dependencies: T17/T23/T28. Status: Implemented locally.
- Work: optimistic copy/tag/group corrections, stale analysis marking, tombstone/fence/invalidation/purge workflow.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: concurrent edit conflict, source provenance, delete during analysis, no late resurrection, reference-aware blob cleanup, current UI state.

### T30 Implement trace and operator diagnosis

- Owner: ENG/OPS. Dependencies: T19-T29 and TF07. Status: Implemented locally.
- Work: correlate product job/native run/receipt/goal identities, emit Trailforge's exact allowlisted six-field events explicitly, and keep separate redacted duration/cost/source-reference telemetry. Alert on holds, expiring leases, caps, bridge/orphan and purge failures.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: reconstruct one successful and failed job; alert exercised; no private payloads/secrets in normal diagnostics.

### T31 Demonstrate slice recovery and developer replay

- Owner: ENG/ML. Dependencies: T16-T30. Status: Implemented locally.
- Work: run entire permitted fixture workflow; kill worker after acceptance; replay task claims; cancel/edit/delete while active; seed a diagnosable fault.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: useful board/search/report-or-gap, durable status, fenced commits, no duplicate authoritative output, bounded resource use; unfamiliar contributor can inspect evidence. Record S3 exit.

## S4 - Supervised pilot

### T32 Run held-out quality evaluation

- Owner: ML. Dependencies: T31/T12. Status: Planned.
- Work: frozen retrieval/grouping/extraction/report suite, hard/language/style slices, multiple trials for stochastic outputs.
- Done evidence: actual PRD metric results, confidence/uncertainty limits, adjudicated failures, no test-set tuning. Missed criteria stay open.

### T33 Measure user usefulness and baseline delta

- Owner: UX/PO. Dependencies: T31/T32. Status: Planned.
- Work: representative users find references, inspect patterns, notice seeded wrong claims, and compare to manual workflow.
- Done evidence: measured task/review time and useful-reference quality; target time saving does not worsen correctness/error detection.

### T34 Exercise sustainable human review

- Owner: PO. Dependencies: T28/T33. Status: Planned.
- Work: measure review arrivals/time/rework, assign queue owner, inspect source support and concrete experiment payloads.
- Done evidence: reviewer capacity supports declared pilot; timeout/stale version cannot mark reviewed; no campaign action performed.

### T35 Run load, fault, privacy, and economics exercises

- Owner: OPS/SEC/ENG. Dependencies: T31/T32/T34. Status: Planned.
- Work: 30/100-ad workloads on declared hardware, concurrency/backpressure, provider/DB/artifact outages, budget and threat fixtures, total unit cost.
- Done evidence: actual SLO/resource/failure results and redaction checks; bounded recovery; critical failed cases resolved before S5.

## S5 - Controlled release

### T36 Protect CI and release manifest

- Owner: ENG/OPS. Dependencies: T32-T35 and TF08. Status: In progress; local evidence only.
- Work: code/model/prompt/index/policy regression gates, artifacts/lockfiles, schema compatibility and bad-change fixtures.
- Local evidence (2026-10-10): Contract-test CI definition and wheel are created; protected branch/release administration and full production acceptance remain open. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: intentionally bad change blocked; evaluator checks cannot be weakened by generated component; candidate manifest complete.

### T37 Exercise restore, deletion, and rollback

- Owner: OPS/SEC. Dependencies: T29/T35/T36. Status: In progress; local evidence only.
- Work: backup/restore records+artifacts, rebuild derived state, replay tombstones, rollback compatible manifest and config.
- Local evidence (2026-10-10): Local restore tests preserve deletion and execution unit floors and clear sessions; hosted/operator rollback exercise remains open. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: measured RPO/RTO, deleted content inaccessible after restore, invalidated embeddings not mixed, downgrade runbook works.

### T38 Complete operating and release review

- Owner: PO/OPS/SEC. Dependencies: T34-T37. Status: Planned.
- Work: ratify provider/retention policy, named support/operator owners, runbooks, pilot results, release scope/autonomy and open risks.
- Done evidence: concrete review packet and recorded scope-specific owner decision. Planning pack alone is not approval.

### T39 Perform authorized private release

- Owner: OPS. Dependencies: T38 and explicit deployment authority/configured resources. Status: Planned.
- Work: deploy reviewed manifest to agreed private environment, smoke-check scoped flows/alerts, observe and roll back on blocking regression.
- Done evidence: deployed version/identity, access checks, monitoring and supported scope; no public sharing or paid-resource expansion by implication.

## S6 - Operation and improvement

### T40 Monitor and exercise an incident

- Owner: OPS/SEC. Dependencies: T39. Status: Planned.
- Work: observe actual queue/quality/cost/deletion health; simulate stuck job/provider issue/unsupported claim with owner escalation.
- Done evidence: alert-to-runbook response and recovery within declared limits; sensitive diagnostic access recorded.

### T41 Adjudicate feedback and investigate drift

- Owner: ML/PO. Dependencies: T39/T40. Status: Planned.
- Work: classify corrections/disputes, preserve permission/provenance, compare new style/language slices, separate bad labels from actual regression.
- Done evidence: curated candidate cases and investigation record; no raw feedback changes active policy/model or crosses workspace scope.

### T42 Promote and roll back one controlled improvement

- Owner: ML/PO/OPS. Dependencies: T36/T37/T41. Status: Planned.
- Work: version a bounded prompt/ranking/taxonomy/model candidate, evaluate held-out/failure/resource gates, obtain owner decision and exercise rollback.
- Done evidence: linked comparative result, manifest/promotion record, observed deployment or shadow outcome, compatible rollback. Online training remains deferred unless separately justified.

## Trailforge adoption tasks

### TF01 Pin and verify the selected harness

- Owner: ENG. Dependencies: none. Status: Implemented locally. Stage: S1.
- Work: install a verified v0.1.0a1 distribution in an isolated development environment, pin tag commit/digests, inspect actual package APIs/protocols, and record dependencies. The study reference checkout is not a product installation.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: selected bytes/version/source identity and reproducible setup; no assumed PyPI package, main-branch compatibility, or unneeded optional extras.

### TF02 Demonstrate a product-neutral host contract

- Owner: ENG/ML. Dependencies: TF01. Status: Implemented locally. Stage: S1.
- Work: compose Goal/Task plus host tool/model-shaped callback and typed verifier on synthetic permitted inputs; pause/resume, scope denial, size bounds, finite tasks, UNKNOWN, retained units and terminal replay. Run feasibility adapters through this bounded host when appropriate.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: actual selected-package smoke results and inspectable authority; model JSON cannot mint PASS; no live-provider/model-quality claim. Current six source-import study checks are supporting limited evidence only.

### TF03 Set up the user's coding agents with Develop

- Owner: ENG/PO. Dependencies: TF01/TF02/T15. Status: In progress; local evidence only. Stage: S2.
- Work: connect the user's actual coding/model/tool callbacks to PLAN/RESEARCH/BUILD/DEBUG/VERIFY, HEALTH built in; configure separate developer authority, bounded staged candidate allowlist, nonoverlapping host-controlled protected checks, and one round initially. Select real execution isolation if untrusted checks are used.
- Local evidence (2026-10-10): Develop command adapter and controlled-command handoff tests pass; actual user commands and independently owned protected checks are not supplied. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: inspectable milestone continuity/handoff, BUILD-only writes, DEBUG read-only diagnosis, changed criteria/candidate denial, budgets/time bounds, actual protected-check ownership. No automatic merge/deploy or isolation relabeling.

### TF04 Specify Prism product Goals, checks, and adapter manifests

- Owner: ENG/ML/SEC. Dependencies: TF02/T11/T12/T13. Status: Implemented locally. Stage: S2.
- Work: finalize separate collection-analysis/report Goal factories, scope/revision/code/model/prompt/policy identities, registered effects, batches/byte caps, required host predicates, partial-coverage semantics and downstream FAIL gating.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: valid/invalid manifests and full request/failure walk; <=128 ordered tasks including checks; no raw images/secrets in Goal JSON; verifiers cannot mutate candidates or confer customer permission.

### TF05 Implement recoverable product-to-harness linkage

- Owner: ENG/OPS. Dependencies: TF04/T17/T19. Status: Implemented locally. Stage: S3.
- Work: serialized start/link/reconciliation of accepted work intents, persistent neutral SQLite, orphan suppression, staged results, currentness/access/tombstone checks and idempotent product commit. Use host records as product truth and kernel records as execution truth.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: crashes before/after intent, start, linkage and output commit recover without duplicate dispatch/publishing or accepted-job loss; no assumed cross-store transaction or generic PostgreSQL backend.

### TF06 Implement host uncertainty and deadline recovery

- Owner: ENG/OPS. Dependencies: TF05/T21. Status: Implemented locally. Stage: S3.
- Work: inspect/retry/cancel policy for WAITING_HUMAN/UNKNOWN, bounded provider/process timeouts below lease, whole-job deadline, preserved usage/attempts, current scope checks, operator-visible reasons and no model resolution authority.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: response loss/expired lease/invalid output/budget exhaustion remains uncertain until explicit authorized resolution; late callbacks and terminal replay cannot publish stale/deleted inputs.

### TF07 Validate integrated host verifiers and source receipts

- Owner: ML/SEC/ENG. Dependencies: TF06/T28/T29. Status: Implemented locally. Stage: S3.
- Work: finalize independent coverage/count/tag/source/report checks, source-artifact revalidation, currentness bridge, partial output and unsupported-claim fixtures. Exercise payload/task/artifact caps and actual staged-write effects.
- Local evidence (2026-10-10): [IMPLEMENTATION.md](IMPLEMENTATION.md), 28 automated tests, installed harness checks and real-CLIP synthetic smoke as applicable. Full original acceptance/prerequisite signoff remains distinct.
- Done evidence: true VerifiedResult tied to Goal; false references/counts and verdict-shaped JSON denied; expected gaps not confused with unknowable effects; receipt integrity not claimed as semantic correctness.

### TF08 Validate harness adoption, agent handoff, and compatibility

- Owner: ENG/OPS/SEC. Dependencies: TF03/T31/T35. Status: In progress; local evidence only. Stage: S5.
- Work: applicable installed-package conformance on the target host, neutral process recovery and combined backup/restore, adapter/version/old-run compatibility, meaningful Develop acceptance. If untrusted execution is used, exercise the actual selected Linux boundary and preserve separate runner receipts.
- Local evidence (2026-10-10): Pinned installed metadata, six installed checks, process-death recovery and combined restore tests pass; actual user-agent handoff, all target-host conformance and hosted acceptance remain open. See [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Done evidence: nonempty actual relevant suite results, no unsupported optional Postgres/distributed/Windows-isolation claims; old-run reconstruction and changed-contract/new-run behavior; application acceptance independently recorded. Upstream CI/source smoke is not Prism's release gate.

## Completion record format

For each task update: status, actual owner, start/completion date, affected contract/decision, evidence artifact location, actual metrics/result, limitations, and next dependency. Do not check off a task because the next developer was given a build prompt.

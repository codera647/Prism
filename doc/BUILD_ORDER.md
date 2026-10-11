# Prism - Step-by-Step Build Order

> Current 0.5 account system: [complete system design and rollout](SYSTEM_DESIGN.md), [implementation and activation gates](RELEASE_0_5.md). Green/gray dashboard and backend code are implemented; Google accounts require D1/OAuth configuration. Earlier sections are historical baselines.

> Current campaign research / Gemini / UI extension: [Prism 0.3 specification and framework mapping](RELEASE_0_3.md). Earlier sections below remain historical baseline records.


> Current 0.2 desktop/browser scope and verification: [release record](RELEASE_0_2.md), [deployment architecture](DEPLOYMENT.md). Earlier local-only implementation sections below describe the 0.1 baseline; open human/quality gates remain open.

> Implementation update (2026-10-10): the local Prism 0.1.0 app is built with real CLIP and pinned Trailforge. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for implemented contracts, evidence and remaining gates. Earlier proposals below remain framework/reference requirements; they do not imply that missing real-data, pilot or hosted-release evidence exists.

Updated: 2026-10-09 (Asia/Karachi). Status: execution order tailored to user-selected Trailforge; product and agent integration remain planned.

This is the practical reading guide to [PLAN.md](PLAN.md) and [TASKS.md](TASKS.md). Follow the steps in order. Each step produces something you can inspect and a check that tells you whether to proceed. Keep actual task status and evidence in TASKS/MEMORY.

The sequence is: understand the work -> prepare examples -> test the AI approach -> settle the blueprint -> build one working application -> verify it with people -> release the agreed scope -> improve it.

Harness split: generic Harness/Goal/Task runs Prism's finite analysis/report profiles; Develop runs the user's bounded coding milestones. [TRAILFORGE_INTEGRATION.md](TRAILFORGE_INTEGRATION.md) explains exact released features, host duties, and limitations. Eight TF tasks extend the original 42 tasks; the sequence below covers all 50.

## 1. Define the first useful version

Tasks: T01, T02. Framework stage: S0.

Observe how a marketer currently collects, organizes, searches, and explains ads. Confirm the first version: upload images and copy, browse similar visuals, search by description, read supported patterns, and review three creative experiment suggestions. Confirm who owns product decisions and review.

Result: agreed user workflow and a narrow first-version scope in [PRD.md](PRD.md).

Proceed when: the intended user recognizes the problem and the expected output is clear.

## 2. Prepare permitted examples and a manual baseline

Tasks, in order: T04, T03, T05. Framework stages: S0/S1.

Start with a representative collection of 30-100 images and their copy. Record where the examples came from and allowed processing. Organize/search them manually and measure the work. Prepare additional held-out collections for checking quality later; keep similar campaign/template variants together when splitting.

Result: image/copy manifests, labeled examples, a manual comparison, and separate development/test sets.

Proceed when: source permission is understood and useful/correct matches can be judged. Synthetic fixtures can demonstrate mechanics while real-data evidence remains open.

## 3. Test visual search and grouping in a small experiment

Tasks, in order: TF01, TF02, T06, T07. Framework stage: S1.

Generate CLIP fingerprints for the examples. Try the demo search, broader descriptions, and descriptions with no matching ads. Group similar images and inspect whether the groups are useful. Compare with the manual/keyword baseline and measure runtime on available hardware.

First pin/verify the selected release and demonstrate a finite synthetic Goal with a typed host check, pause/resume and UNKNOWN behavior. Then put bounded feasibility work behind the host adapter pattern. Keep harness smoke and actual CLIP relevance evidence separate.

Result: an inspectable list of search matches, tentative groups, and recorded quality/speed results.

Proceed when: the selected visual approach has defensible usefulness, or a specific failed assumption and next experiment are recorded.

## 4. Test hooks and offers separately

Task: T08. Framework stage: S1.

Read supplied copy and identify opening hooks, offers, and calls to action. Start with exact rules for obvious values. Evaluate a structured extractor for ambiguous wording and OCR only where words inside images are needed. Preserve the phrase that supports each tag.

Result: ads with source-linked messaging tags and measured extraction errors.

Proceed when: missing/unknown text stays explicit and offer amounts can be checked against the source.

## 5. Test summaries and three experiment suggestions

Tasks: T09, T10. Framework stage: S1.

Compute actual pattern counts. Produce a simple template summary, then compare a grounded generator if allowed. Give it selected examples and verified counts. Check whether three different suggestions are useful, supported, and clearly presented as hypotheses. Evaluate combining visual search with copy/tag search.

Result: a sample report, comparison evidence, and selected or explicitly deferred AI components.

Proceed when: factual claims are supported and added model complexity has a measured reason. Insufficient evidence produces a named partial result.

## 6. Finalize the application blueprint and acceptance checks

Tasks, in order: T11, T12, T13, TF04, T14. Framework stage: S2.

Specify stored records, API inputs/outputs, permissions, job states, revisions, deletion, provider handling, budgets, review capacity, and failure behavior. Ratify quality targets against the baseline. Assign actual owners to the roles in the documents.

Specify collection/report Goal factories, adapter identities/effects, mandatory checks, bytes/batches, raw-state mapping, neutral SQLite vs product-store authority, cross-store reconciliation and separate actual-cost limits.

Result: implementable contracts and recorded decisions in [ARCHITECTURE.md](ARCHITECTURE.md), [DECISION.md](DECISION.md), [GUARDRAILS.md](GUARDRAILS.md), and [SECURITY.md](SECURITY.md).

Proceed when: one request and its failure can be followed through the whole design, with open gates clearly identified.

## 7. Choose the compatible stack and create the development setup

Tasks, in order: T15, TF03. Framework stage: S2.

Use the experiment evidence to select the actual frontend, API/worker runtime, primary database, private artifact storage, and model runtime. Pin dependencies and model artifacts. Set up a reproducible local run with safe fixture data and example configuration.

Then compose the user's actual Develop phase callbacks with separate developer authority, one planned round, narrow candidate files, protected checks, and verified handoff. Generic product runtime remains SQLite even if the application chooses PostgreSQL. Linux checks and trusted Windows callbacks have different guarantees.

Result: a runnable project foundation, dependency locks, setup instructions, and a confirmed stack ADR.

Proceed when: a clean environment can run the example without production secrets. Exact versions and hosting are still open before this step.

## 8. Build records, ownership, and access control

Tasks: T16, T17. Framework stage: S3.

Implement collections, ads/copy revisions, jobs, evidence, resource records, and deletion markers. Add authenticated identity and collection ownership to API, database, search, and image access.

Result: an owner can create/read their collection, with valid domain states and scoped access.

Proceed when: another principal cannot read or change those resources, including indirect evidence and image requests.

## 9. Build image upload and copy association

Task: T18. Framework stage: S3.

Add file selection/drag-and-drop, safe image decoding, private storage, thumbnails, and manual/CSV copy mapping. Show valid/rejected/duplicate items individually. Keep identical images with different copy as distinct ad variants under the agreed policy.

Result: uploaded images and their correct wording survive a page refresh.

Proceed when: bad files and ambiguous mappings produce clear errors, and accepted inputs have durable references.

## 10. Build recoverable background jobs and resource limits

Tasks, in order: T19, TF05, T21, TF06. Framework stage: S3.

Run long analysis outside the web request through TrailforgeWorkflow. Save a recoverable host intent, link/start the exact neutral Goal under host serialization, and reconcile cross-store crashes. Reuse kernel local leases/CAS/checkpoints; add actual-cost admission and supervised deadlines. UNKNOWN requires explicit host inspection/resolution with retained attempts/units; no automatic reissue or authority reset.

Result: durable processing status that resumes after interruption and obeys configured limits.

Proceed when: a restart preserves accepted work, repeated requests do not create duplicate authoritative outputs, and concurrent jobs cannot bypass quotas.

## 11. Connect the validated visual encoder

Task: T20. Framework stage: S3.

Move the chosen visual experiment into the worker through the encoder interface. Store compatible versioned fingerprints, reuse unchanged inputs where valid, and expose per-asset success/failure.

Result: each ready image has a fingerprint tied to its exact image/model/preprocessing version.

Proceed when: incompatible versions are rejected and failures appear in coverage.

## 12. Connect copy analysis, visual groups, and exact counts

Tasks: T22, T23. Framework stage: S3.

Implement the selected copy/OCR path. Create visual-group snapshots and overlapping hook/offer tags. Compute counts in code and identify whether a count refers to ad variants or unique images.

Result: a versioned organized collection with source-linked tags, representatives, and trustworthy denominators.

Proceed when: missing copy remains a gap, singletons are allowed, and one snapshot does not mix incompatible revisions.

## 13. Build collection-local natural-language search

Task: T24. Framework stage: S3.

Connect the search phrase to the chosen ranking path. Add filters and clear no-match/limited states. Check permission and deletion before selecting candidates.

Result: the demo query retrieves relevant uploaded creatives when present.

Proceed when: known relevant queries work, absent examples are handled honestly, and unauthorized/deleted ads never enter results.

## 14. Build the visual board and ad detail screens

Task: T25. Framework stage: S3.

Display grouped/all-ad views, search, filters, progress, thumbnails, full-image inspection, original copy, and tag evidence. Make partial/stale/failed states understandable and the main flow usable with a keyboard and small screens.

Result: a user can upload, browse, search, and inspect their actual examples.

Proceed when: the interface displays actual backend results and users can distinguish available results from gaps.

## 15. Build the evidence-backed report and review flow

Tasks: T26, T27, T28. Framework stage: S3.

Select bounded current evidence and exact aggregates. Draft supported pattern claims and three distinct experiment proposals. Validate IDs, permissions, versions, numbers, and schema. Show sources, draft status, limitations, review actions, and a useful fallback when generation fails.

Result: a report whose observations can be inspected against source ads, plus concrete experiment hypotheses.

Proceed when: invalid claims are rejected, insufficient support produces a partial result, and reviewing one version does not review a changed version.

## 16. Add correction, reanalysis, and deletion

Task: T29. Framework stage: S3.

Allow copy/tag/group corrections with revision checks. Mark older analysis stale. Remove deleted inputs from active board/search/evidence immediately, cancel related work, and complete physical purge under the agreed policy.

Result: the collection stays current as the owner changes it.

Proceed when: conflicting edits are visible and a late task cannot republish deleted or older content.

## 17. Add job diagnostics and usage visibility

Tasks, in order: TF07, T30. Framework stage: S3.

Complete trace linkage for inputs, versions, task results, validation, durations, and resources. Provide controlled operator diagnosis and alerts without logging private payloads. Emit essential diagnostic hooks as components are built; this step integrates the whole trace.

First validate integrated typed predicates and source receipts with current/deleted/stale/payload-bound fixtures. Correlate product job, harness run/Goal and receipts. Use exact six-field Trailforge event projections plus separate redacted host timing/cost metrics.

Result: an operator can explain why one job succeeded or failed and what resources it used.

Proceed when: both cases can be reconstructed and key alerts/redaction have been exercised.

## 18. Demonstrate the complete local workflow and recovery

Task: T31. Framework stage: S3.

Run upload -> process -> group/tag -> search -> inspect -> report/review -> correct/delete. Interrupt a worker, retry a request, cancel a run, and simulate a provider failure. Check surviving state, currentness, and bounded resource use.

Result: the first end-to-end version works on declared inputs and handles its essential failure cases.

Proceed when: the required slice evidence is recorded. This is the first complete local-demo checkpoint.

## 19. Run a supervised pilot and fix measured failures

Tasks: T32, T33, T34, T35. Framework stage: S4.

Run frozen held-out evaluation and real-user comparison. Measure search/extraction/group/report quality, time saved, review effort, 30/100-ad performance, privacy/recovery behavior, and total cost. Fix failed checks and rerun affected evidence before advancing.

Result: measured usefulness and operating limits for the intended population.

Proceed when: ratified critical targets pass and reviewer/operator capacity supports the agreed scope.

## 20. Prepare and perform the agreed private release

Tasks, in order: TF08, T36, T37, T38, T39. Framework stage: S5.

Protect release checks and bind code/model/config/data versions. Exercise backup restore, deletion replay, and rollback. Review the concrete release evidence with accountable owners, then deploy within the authorized environment/resources and verify scoped access and monitoring.

Run applicable installed harness conformance and old-run/Develop compatibility first; keep model/product quality separate. Back up neutral authority with product links/artifacts. Release begins with one persistent execution host; generic horizontal/distributed authority is a separate future design.

Result: a supported private release with recovery and rollback evidence.

Proceed when: critical gates, ownership, policies, and deployment authority are satisfied. Public sharing or expanded provider spending requires its own scope.

## 21. Monitor, adjudicate feedback, and improve one change at a time

Tasks: T40, T41, T42. Framework stage: S6.

Monitor failures, delays, quality, review workload, and cost. Preserve correction provenance, investigate drift, evaluate a versioned improvement, and promote/roll back through the same release path.

Result: accountable improvements supported by new evidence.

Proceed when: each change has comparative evaluation and a compatible rollback; raw feedback never silently changes policy or permissions.

## Exact dependency-safe task sequence

```text
T01 -> T02 -> T04 -> T03 -> T05 -> TF01 -> TF02 -> T06 -> T07 -> T08
-> T09 -> T10 -> T11 -> T12 -> T13 -> TF04 -> T14 -> T15 -> TF03
-> T16 -> T17 -> T18 -> T19 -> TF05 -> T21 -> TF06 -> T20 -> T22
-> T23 -> T24 -> T25 -> T26 -> T27 -> T28 -> T29 -> TF07 -> T30
-> T31 -> T32 -> T33 -> T34 -> T35 -> TF08 -> T36 -> T37 -> T38
-> T39 -> T40 -> T41 -> T42
```

This is one safe sequential schedule. Some independent work can overlap, but every task still needs the prerequisites specified in TASKS. The swapped positions of T04/T03 and T21/T20 are intentional: permission precedes a real-data baseline, and resource controls precede integrated model processing.

## How to use this order

Work on one step at a time. Read its linked tasks and detailed contracts, produce the result, record actual checks, and move forward when the completion conditions are met. Reopen a prior design decision if an experiment disproves its assumption. A written plan or synthetic demonstration does not complete a real-data/user/release gate.

Suggested evidence organization, created only when that work starts: `output/evidence/step-XX/` with a short result record, input/config identities, measured outcomes, failures, and limitations. Existing TASKS remains the detailed source of task status. Use [BUILD_PROMPT.md](BUILD_PROMPT.md) when handing a dependency-ready step to a coding assistant.

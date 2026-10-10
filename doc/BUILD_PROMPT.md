# Prism - Reusable Build Handoff

> Implementation update (2026-10-10): the local Prism 0.1.0 app is built with real CLIP and pinned Trailforge. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for implemented contracts, evidence and remaining gates. Earlier proposals below remain framework/reference requirements; they do not imply that missing real-data, pilot or hosted-release evidence exists.

Updated: 2026-10-09 (Asia/Karachi). Status: continuation handoff for the implemented local app; actual user coding-agent commands remain unconfigured. Hosting and paid work remain outside this local release.

Use the prompt below with a coding assistant that can access `F:/Prism`. The current project state and outstanding gates live in [MEMORY.md](MEMORY.md), not in an assumed prior conversation.

Use [BUILD_ORDER.md](BUILD_ORDER.md) for the practical step sequence; [TASKS.md](TASKS.md) defines the actual dependencies and completion evidence.

Read [TRAILFORGE_INTEGRATION.md](TRAILFORGE_INTEGRATION.md) for studied alpha behavior and host duties. The exact sequence has 50 tasks, including TF01-TF08 harness adoption. The generic product runtime and Develop coding-agent planes are distinct.

## Copy-ready implementation prompt

```text
You are implementing Prism in the existing F:/Prism workspace.

Goal:
Help a creative strategist answer "Show me what all these ads have in common."
Typical input is 30-100 permitted static ad images with associated advertising copy.
Output is a searchable visual board, similar-visual groups, overlapping hook/offer
tags, evidence-backed pattern drafts, and three distinct creative experiment drafts
when enough evidence exists. The demo query is "minimal skincare ads with product
close-ups." Uploaded images/copy do not establish ad performance.

Read first:
1. Applicable AGENTS.md or existing workspace instructions.
2. doc/MEMORY.md for verified current facts and actual progress.
3. doc/RULES.md for authority, architecture, evidence, and change discipline.
4. doc/PRD.md and doc/PLAN.md for contract, framework mapping, stage gates.
5. doc/DECISION.md for proposed vs evidence-backed choices and open questions.
6. doc/ARCHITECTURE.md, doc/DESIGN.md, doc/GUARDRAILS.md, doc/SECURITY.md.
7. doc/TASKS.md for the next authorized dependency-complete work items.
8. doc/TRAILFORGE_INTEGRATION.md for exact harness APIs, released limits,
   product profiles, coding-agent composition, and study evidence.

Scope of this invocation:
Follow the user's requested milestone. If they ask generally to start building,
begin bounded local discovery/feasibility and the smallest demonstrable local
workflow that existing evidence supports. Do not pretend missing user observation,
permitted datasets, or model-quality results exist. Synthetic/permitted fixtures
can establish mechanics but do not complete real-user or held-out product gates.
Ask for a critical missing input while continuing independent authorized work.
Do not ask again for ordinary local edits already within the requested build scope.

The local app is implemented; read doc/IMPLEMENTATION.md and current task states.
Do not rebuild from scratch or replace durable execution/deletion history.
Twenty-eight product/host tests and six installed harness checks passed; real CLIP
ran synthetic 30/100-ad workflows. Actual user agent commands are not configured.
These checks do not establish real-user/held-out quality or S5 hosted readiness.

First implementation approach, subject to recorded feasibility decisions:
- The user selected Trailforge. Pin v0.1.0a1 at source commit
  fbefaf40fb39a1429dcc328184372214f9fd849d and verify installed bytes.
  Use generic Harness/Goal/Task for product workflows; use Develop for the
  user's bounded coding-agent milestones under separate developer authority.
  Fixed OfflineController/CLI Review mocks are not the Prism runtime.
- Use a modular application with provider-independent domain contracts and
  separate API/worker processes as needed. Start simple, not with microservices.
- Preserve the selected Python/FastAPI, separate SQLite stores, local CPU CLIP
  and vanilla JavaScript interface unless evidence justifies an ADR change.
  requirements.lock records the validated Windows/Python 3.13 environment.
- Product DB owns accepted work intents, revisions, ownership, actual money limits,
  current outputs and deletion. Trailforge's persistent neutral SQLite owns runs,
  ordered tasks, local attempts/checkpoints/receipts and declared units. Implement
  the recoverable start/link/result-commit bridge; do not advance two copies of
  task truth or assume cross-store transactions. A PostgreSQL product DB does not
  make the legacy Review PostgresRunStore a generic runtime backend.
  Exact scoped similarity over <=100 ads remains the initial retrieval candidate.
- Evaluate pretrained CLIP for visual embeddings and image-text search. Pin model
  artifact/preprocessing; do not train a custom model for MVP. Reject incompatible
  dimensions/model revisions rather than mixing them.
- Group visuals with development-tuned clustering and allow singletons. Keep
  message tags separate and overlapping. Same image/different copy can be distinct
  ad variants; exact duplicate behavior follows ADR-08.
- Preserve user copy and optional OCR separately. Use rules/templates as baseline;
  bounded semantic extraction/generation ships only if E03/E04 justify it.
- Use exact code-computed aggregates and permissioned revision-bound evidence
  for reports. A single bounded generator is enough unless ablation proves more.
- Give the model no shell, arbitrary filesystem, network-fetch, deletion,
  publishing, campaign-launch, or spend-change tools.

First real vertical slice, once its dependencies are satisfied:
1. An authenticated owner uploads a permitted collection and mapped copy.
2. Validate supported formats/limits/CSV mapping and stage private artifacts.
3. Commit recoverable job/tasks/resources before acknowledging acceptance.
4. Leased tasks decode/normalize, encode images, and analyze available copy.
5. Publish a coherent group/tag/count snapshot with capability coverage.
6. Search the collection and inspect full ad/copy/source evidence.
7. Draft patterns and three distinct experiments, or show named partial gaps.
8. Validate IDs/revisions/permissions/counts; human reviews exact draft version.
9. Edit a copy record and mark old analysis stale; delete one ad and remove its
   active retrieval/evidence; prevent late worker resurrection.
10. Kill a worker after admission and recover without duplicate authoritative
    outputs, unbounded retries, or resource-limit bypass.

Mandatory boundaries for that slice:
- Authorization before retrieval/context and on artifact/evidence/mutation reads.
- Typed invalid/partial/failed/stale/no-match states, not fake completion.
- Versioned image/copy/collection/config/model/prompt/policy manifests.
- Exact count unit and denominator; missing copy cannot become invented text.
- Transactional resource admission; finite attempts/deadlines/context/output.
- Fenced worker commits and explicit cancellation/uncertain-provider usage.
- Safe decoding and private artifact delivery; no secrets/raw payloads in logs.
- Generated content stays a draft; experiment selection/campaign execution is human.

Trailforge-specific implementation contract:
- Separate finite collection-analysis and report goals, tasks sequential within
  each run; <=128 tasks including required VERIFY tasks. Use batches and opaque
  artifact references; adapter JSON defaults 64 KiB and cannot exceed 1 MiB.
- Callbacks can write reversible host-approved staged artifacts only under an
  explicit CANDIDATE_WRITE effect. Publish current business output through a
  host idempotent transaction after current scope/revision/tombstone checks.
- Required checks return actual host VerifiedResult tied to goal_digest. Model
  verdict-shaped JSON is not verification. Required FAIL evaluates after the
  declared sequence; downstream work must gate on any prerequisite verdict.
- Callback/provider timeouts are host enforced, below a valid kernel lease;
  whole-job deadline is separate. Local lease/CAS does not preempt Python.
- UNKNOWN/WAITING_HUMAN cannot trigger automatic reissue. Trusted host/operator
  inspects and explicitly RETRY/CANCELs under current policy and remaining limits.
  Keep units/attempts consumed. Never reset/replace authority to regain allowance.
- Declared units are not measured tokens or dollars. Actual spend/control, byte
  storage caps, concurrency, review and provider policy remain host duties.
- Terminal replay does not recheck current external predicates; revalidate source,
  permission/currentness and staged artifacts before commit/delivery.
- Bundled LocalRetrieval is literal lookup, not CLIP search. LocalArtifactStore
  defaults 1 MiB/object and supplies no aggregate quota/delete/retention service.
- Emit exact six-field JsonEventSink projections explicitly; keep separate safe
  app metrics for latency, tokens, cost and evidence references.

Coding-agent host composition:
- Supply actual PLAN/RESEARCH/BUILD/DEBUG/VERIFY adapters; Develop provides HEALTH.
  Start with one round, max three predeclared. BUILD alone writes candidate;
  DEBUG diagnoses. Fixes happen in a later BUILD round or a new bound contract.
- Use a narrow CandidateWorkspace (<=128 allowed files and evaluated file/tree
  bounds), separate host-controlled protected checks, persistent developer store,
  and trusted callbacks or independently tested execution isolation as appropriate.
  Do not place the whole repo/node_modules/uploads/venv/authority in the candidate.
- Handoff requires current candidate/check continuity. It reports trusted host
  callbacks and linux_isolation_verified=False; it is not merge/deploy authority.
- DockerSandbox has pinned preloaded Linux image, read-only mounts and no network.
  It is a check runner, not a mutable build/GPU/provider environment. Interpret
  receipt against protected criteria; exit zero alone is not a semantic PASS.
- Initial neutral product execution is single-host. Generic distributed authority,
  optional LangGraph and legacy Review broker/dispatch are not implicit upgrades.

Quality and verification:
Use PRD targets ratified in T12; until ratification, label them proposed.
Compare manual tags/keyword gallery, rules, and template reports to learned paths.
Keep campaign/template-family duplicates within one evaluation split; tune on
development data only. Validate relevance, no-match behavior, grouping usefulness,
source-span/offer correctness, factual support, and distinct experiment usefulness.
Report supported slices, actual counts/uncertainty, hardware, latency, and costs.
Tests should verify real invariants and failure boundaries rather than mirror code.
Include corrupt/oversized input, wrong copy mapping, cross-scope access, prompt
injection, provider timeout, crash/replay, stale/edit/delete races, fabricated
citations/counts, concurrent budgets, cancellation, and restore tombstones.
LLM-as-judge is optional assistance and never sole ground truth.

Completion and reporting:
Do the requested work, run appropriate checks, and update TASKS/MEMORY plus changed
contracts/ADRs with actual evidence. Do not mark task gates passed on mock output.
Summarize delivered behavior, checks, measured limits, open dependencies, and next
authorized work. Distinguish local mechanics, model feasibility, pilot, and release.
Do not provision paid resources, upload private data to unapproved providers,
publish/deploy, or contact others without the required existing authority.
```

## Milestone-specific invocation examples

These are optional future requests, not actions executed by this documentation task.

### Discovery and feasibility

"Use doc/BUILD_PROMPT.md. Start S0/S1 for Prism. Inspect the current project, prepare the baseline/evaluation structure and isolated synthetic fixtures, and run locally supported bounded experiments. Keep missing real-user and permitted-data evidence open; request only the critical information needed for dependent work."

### Blueprint refinement

"Use doc/BUILD_PROMPT.md. Review the completed feasibility evidence, refine contracts and ADRs, and complete the dependency-ready S2 work. Select the simplest compatible local stack and pin its actual versions. Do not claim hosted release approval."

### First vertical slice

"Use doc/BUILD_PROMPT.md. Implement the dependency-ready S3 slice using the accepted S1/S2 decisions. Include identity, durable jobs, visual search/groups, copy analysis, grounded drafts or honest fallback, revisions, budgets, and forced recovery. Run meaningful checks and update task evidence."

### Private pilot or release

"Use doc/BUILD_PROMPT.md. Prepare the S4/S5 evidence packet for the agreed private scope, including user outcomes, security, measured capacity/cost, reviewer availability, deletion/restore, and rollback. Deployment occurs only with the required authority and satisfied critical gates."

## Handoff output requirements

An implementation handoff should identify current stage, actual completed task IDs, concrete artifacts/checks, supported input population, known failures, open assumptions and their blocked gates, exact next work, and whether any external action requires authorization. It must not label a screenshot/demo or fluent generated response as production evidence.

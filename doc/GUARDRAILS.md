# Prism - Autonomy, Output Integrity, and Failure Controls

Date: 2026-10-08 (Asia/Karachi). Status: proposed policies to implement and evaluate. No guardrail has been demonstrated yet.

Framework references: five moves pp. 4-5, seven failure modes pp. 8-9, A0-A4 pp. 9-10, P04-P09/P12/P16/P19/P20 pp. 14-19. Related: [SECURITY.md](SECURITY.md), [ARCHITECTURE.md](ARCHITECTURE.md), [PLAN.md](PLAN.md).

## 1. Per-action autonomy

The initial feasibility setting is A0: a person owns the workflow and examines outputs. The target product levels below are earned through the corresponding implementation gate, not assumed because an action is reversible.

| Action | Target level | Eligibility and human responsibility |
|---|---|---|
| Accept an upload and associate supplied copy | A4 scoped automatic | Authenticated owner, validated input/mapping, durable accepted-work record, resource limits. |
| Encode/group images and propose tags | A4 scoped automatic | Authorized current revisions and validated supported population; tentative/correctable outputs. |
| Search permitted collection | A4 scoped automatic | Permission filter before retrieval, current compatible embeddings, visible limited/no-match state. |
| Compute counts and validate evidence | A4 scoped automatic | Exact deterministic operations with verified denominators/revision references. |
| Draft patterns and experiments | A2 human reviews output | Sufficient permitted evidence; schema and factual checks; draft status until review. |
| Correct copy/tags/group names | A0 human owns change | Explicit authenticated mutation, expected revision, audit/provenance; no global learning effect. |
| Choose or run a creative experiment | A1 system prepares, human decides | Concrete evidence-backed suggestions; no ad-platform execution tool exists. |
| Promote model/prompt/policy/threshold update | A1 owner decision | Held-out evidence, version manifest, resource/security checks, rollback path. |
| Retry internal transient work | A4 scoped automatic | Same authorized job, shared attempt/deadline/resource limits, current lease/revision. |
| Resolve Trailforge UNKNOWN | Trusted host/operator decision; model has no authority | Inspect attempt/effects; explicit bounded RETRY/CANCEL under current policy; retain units/attempts. |
| Delete collection | Human-triggered operation with scoped automation | Owner instruction invokes tombstone/purge; no model can request deletion. |
| Public export, campaign launch, spend changes | Not applicable / absent | Requires new product scope, authority, integration, and release evidence. |

A3 exception-led handling is not the initial report mode. Consider it only after eligible report classes have representative audited evidence, staffed exception capacity, and an authorized promotion decision. No model self-rating or averaged score grants authority.

## 2. Factual-output policy

1. All factual collection claims cite permitted ad revisions or code-computed aggregates.
2. Exact counts/amounts/percentages come from code. A generated number is verified against an aggregate or rejected.
3. Every count identifies unit (ad variant vs unique image), eligible set, numerator/denominator, and missing/failed coverage.
4. A cited ad must actually support the claim. Reference validation is necessary but semantic support also needs evaluation/human review.
5. User copy is evidence of what an ad says, not independent proof that its product claim is true.
6. Similarity scores are ranking signals, not performance, truth, or calibrated confidence.
7. Do not infer winning ads, conversion rates, effectiveness, sales uplift, competitor intent, medical efficacy, or market prevalence from uploaded visuals/copy alone.
8. Separate observation from hypothesis. Experiments are proposals with a measurable outcome, not guaranteed improvements.
9. Complete reports have three distinct experiments. Missing support yields a partial report with reasons; do not fill a quota by invention.
10. Context is collection-local and revision-bound. A model cannot fetch more sources, execute commands, alter policy, or expand its scope.

Generated output is an untrusted proposal. Reject schema violations, unknown IDs, inaccessible evidence, stale versions, impossible counts, incorrect offer units, or fabricated performance statements. One bounded repair may use validation errors and the same approved evidence; it consumes the original job's attempt/resource allowance. If still invalid, fall back to exact aggregates/templates and mark generated content unavailable.

## 3. Resource and execution defaults

These are initial configurable limits, not performance claims. Ratify/profile them in S1/S2. Store configuration version in each run. PRD contains authoritative input limits.

| Resource | Proposed default | Limit behavior |
|---|---|---|
| Files / image size | 1-100 per batch; 10 MiB/file; 40 megapixels | Reject named invalid inputs before work acceptance. |
| Originals per collection | 1 GiB | Admission error; preserve existing collection. |
| Copy / query | 10,000 / 500 characters | Reject over-limit user input; do not silently truncate. |
| Active pilot collections | 5 | Stop new admission until owner/config changes limit. |
| Concurrent analysis jobs | 2 | Durable queue; bounded queue age and visible status. |
| Worker image batch | At most 16, reduce for measured device memory | Bounded batch; report asset failures when necessary. |
| Accepted run deadline | 10 minutes from admission | Includes queueing/retries/provider wait; terminal partial/failed if exceeded. |
| Embedding batch attempt | 60 seconds, within run deadline | Bounded cancellation/failure; lower batch size only within same allowance. |
| Trailforge callback lease | Proposed 90 seconds, library maximum 300 | Exceeds enforced callback timeout; fences late commit but does not preempt Python. |
| OCR attempt per image | 30 seconds, within run deadline | Missing text capability visible; visual work may continue. |
| Provider generation attempt | 45 seconds, within run deadline | Circuit-break/fallback; uncertain usage reconciled. |
| Search request | 5 seconds | Typed timeout/limited result, no fabricated matches. |
| Transient task attempts | At most 3 total including first attempt | Backoff with jitter; no resetting limit via fallback. |
| Generation/repair | At most 2 provider calls total per report | Fall back after failed repair; obey shared budget/deadline. |
| Report evidence | At most 20 selected ads, 12,000 input tokens | Representative/coverage-aware selection; explicit omissions. |
| Generated response | At most 2,000 output tokens and schema size cap | Reject/partial if incomplete; no uncontrolled continuation loop. |
| Paid usage | Owner-configured reservation and hard cap | No configured allowance means paid admission unavailable. |

Permanent errors (unsupported format, denied access, invalid copy mapping) are not retried. Model/provider timeouts may incur usage without a returned result; retain uncertainty and reconcile. Quotas and reservations are transactional business state, not observability totals.

Harness-specific rules: finite sequential runs have <=128 tasks and typed required VERIFY results. Default adapter payload bound is 64 KiB, maximum 1 MiB; pass artifact references/batches. Exceptions, invalid output, expired attempts and unknown checks hold WAITING_HUMAN. Even PURE work is not automatically reissued. A host may apply an authorized validated recovery policy, but must inspect/record explicit disposition; unestablished provider effects require operator review. Declared units are cumulative/retained and separate from actual cost. Never replace stores or change constructor caps to regain allowance.

Required FAIL is evaluated after the declared sequence; downstream adapters gate work requiring passed prerequisites. Terminal replay needs host currentness/access/artifact checks before delivery or business commit. In Develop, BUILD alone writes candidates; DEBUG diagnoses. Handoff/Docker execution receipts are distinct from semantic PASS and product approval. See [TRAILFORGE_INTEGRATION.md](TRAILFORGE_INTEGRATION.md).

## 4. Failure register

Owner roles match PLAN. Fixtures listed below are planned, not passed. "Effect" describes possible partial work that recovery must account for.

| ID / initiating fault | Detection and possible harm | Degraded result / recovery | Owner / fixture / residual effect |
|---|---|---|---|
| F01 Unsupported convincing claim (hallucination) | Unknown citation, count mismatch, claim audit; user trusts invented pattern | Reject generated content; exact aggregates/templates; inspect actual source support | ML; fabricated-count/nonexistent-citation fixture; invalid draft may already have been generated, never accepted automatically |
| F02 Input/model drift | Slice relevance/tag usefulness drops after new styles/languages/config | Mark unsupported slice; investigate, evaluate candidate, downgrade/rollback | ML; changed-style/language fixture; existing reports stay revisioned, not silently rewritten |
| F03 Tool/provider timeout | Deadline/timeout; stalled work and uncertain billable usage | Finite retries, circuit breaker, partial text/report; board survives when ready | ENG/OPS; OCR/generator timeout; provider may have processed input, reconcile usage |
| F04 Poisoned feedback | Conflicting/untrusted corrections or suspicious feedback provenance | Collection-local annotation only; adjudication before evaluation/promotion | ML; malicious feedback fixture; original policy/model unchanged |
| F05 Orchestration deadlock/incomplete aggregation | Oldest-task/lease/deadline alert; job waits forever or hides failed tasks | Lease recovery/fencing; terminal partial/failed; explicit missing capability | ENG; crash/unresolved-task fixture; completed asset outputs retained |
| F06 Human bottleneck | Review arrivals > available minutes; drafts accumulate | Queue/limit new reports; board/search available; do not auto-review on timeout | PO; burst-review fixture; concrete unreviewed drafts remain drafts |
| F07 Almost-right output | Source exists but meaning/amount/denominator subtly wrong; persuasive UI hides mistake | Known-error fixtures, source-span/amount checks, human claim review and sampled audit | ML/PO; wrong-offer/small-denominator fixture; semantic residual risk recorded |
| F08 Duplicate admission/output | Same key/payload repeated; duplicate work/cost/counts | Stable scoped work identity, conflict on changed payload, unique task output commit | ENG; repeated-upload/job fixture; uncertain provider attempt may still cost, not exactly-once promise |
| F09 Permission/secret breach | Cross-scope reference/artifact request, credential in output/log | Deny before retrieval; quarantine invalid output; incident procedure | SEC; cross-workspace/injection fixture; previously exposed data requires accountable incident handling |
| F10 Corrupt/missing input | Decoder error, missing/ambiguous copy, unsupported language | Named asset/copy gap; retain valid images; no invented text | ENG/ML; corrupt/missing-copy fixture; accepted subset uses explicit denominator |
| F11 Stale context/deletion race | Revision changed or tombstone added during run | Block stale publication; mark old report stale; rebuild current snapshot | ENG; edit/delete-during-generation fixture; historical evidence may be invalidated for access |
| F12 Resource exhaustion | Reservation/capacity denied, memory/disk limit, run deadline | Refuse admission or partial terminal result; bounded smaller batch if allowed | OPS; concurrent-budget/low-memory fixture; in-flight usage remains reserved until reconciliation |
| F13 Lost accepted work/storage outage | DB/artifact commit boundary crash; acknowledged job cannot recover | Accept only after durable record/artifact refs; polling recovery, staged-orphan cleanup | ENG/OPS; before/after-commit restart fixture; unaccepted staged blob may remain temporarily |
| F14 Cancellation after partial effects | Cancel/delete while worker/provider is active | Stop new dispatch; fenced commits; tombstone active access; purge/reconcile | ENG/SEC; cancel-during-call fixture; remote processing may not be retractable |

## 5. Coverage, uncertainty, and fallback

Visual-ready, text-ready, and report-ready are different capabilities. Asset/copy failures must not block unrelated useful browsing, but a required failed capability prevents that requested full result being labeled complete.

Tentative group labels and suggested tags are editable. Unknown hooks/offers, unsupported language, sparse collections, irrelevant queries, and disputed OCR remain explicit. Initial no-match thresholds are tuned on development data and evaluated on held-out queries; do not fabricate a universal threshold or correctness percentage.

Fallback order: retain valid inputs -> show ready board and partial search -> show exact aggregates/templates -> show unavailable generation with retry option. Each fallback must preserve scope, revision, deadline, and budget. Slower processing does not guarantee correctness.

## 6. Review, approvals, and change control

A reviewer sees exact draft version, source ads, coverage, limitations, and experiment payload. Reviewing one version does not review a changed version. If acceptance/approval records are introduced, bind principal, collection/input revision, payload hash, action, decision time, and expiry. Changed payload/input or expired approval invalidates execution eligibility; timeout never approves.

No campaign action exists in MVP, so a complex external-action approval service is unnecessary. Report review/correction and release approval remain concrete product functions. Reviewer capacity is estimated/measured in PLAN; priority and owner are explicit rather than a decorative queue.

Policy/model/prompt/config changes require a versioned proposal, relevant held-out/failure evidence, owner decision, and compatible rollback. User feedback never changes policy or expands automation directly.

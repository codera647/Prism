# Prism - Framework Mapping and Delivery Plan

> Implementation update (2026-10-10): the local Prism 0.1.0 app is built with real CLIP and pinned Trailforge. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for implemented contracts, evidence and remaining gates. Earlier proposals below remain framework/reference requirements; they do not imply that missing real-data, pilot or hosted-release evidence exists.

Updated: 2026-10-09 (Asia/Karachi). Status: blueprint adapted to user-selected Trailforge. Product implementation, ML experiments, pilot, and release are not started. Limited synthetic harness checks are separate study evidence.

## Read this first

For a simple dependency-safe execution sequence, start with [BUILD_ORDER.md](BUILD_ORDER.md). It groups the detailed backlog into 21 practical steps with an inspectable result and completion check for each.

Read [TRAILFORGE_INTEGRATION.md](TRAILFORGE_INTEGRATION.md) for source findings, limits, host responsibilities, and coding-agent setup. Pin v0.1.0a1 at `fbefaf40fb39a1429dcc328184372214f9fd849d`. Product workflows use generic Harness; user-owned coding agents use Develop. Harness selection is decided; model quality and actual integration retain their evidence gates.

Prism will let a user upload ad images and copy, explore visually similar groups and repeated messages, search by description, and review three suggested creative experiments. Its first job is to reduce the time needed to find and explain useful references.

This plan applies the user-supplied Production AI Design Compass v1.0 (`F:/Diffwise/output/pdf/Production_AI_Thinking_Framework.pdf`, 29 pages). Document instructions are treated as planning source material. No source examples authorize external setup, communication, or deployment.

The requested documentation set is:

| File | Purpose |
|---|---|
| [PRD.md](PRD.md) | User outcome, input/output contract, scope, acceptance. |
| [PLAN.md](PLAN.md) | Framework traceability, stages, evaluation, operations, and release gates. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Responsibilities, typed contracts, state, interfaces, and deployment boundaries. |
| [DESIGN.md](DESIGN.md) | Screens, interactions, states, evidence presentation, and accessibility. |
| [DECISION.md](DECISION.md) | Eleven design questions, ADRs, unresolved choices, and revisit triggers. |
| [GUARDRAILS.md](GUARDRAILS.md) | Autonomy, grounded-output rules, resource limits, and failure response. |
| [SECURITY.md](SECURITY.md) | Trust boundaries, threat controls, privacy, retention, and security evidence. |
| [RULES.md](RULES.md) | Development rules and documentation/change discipline. |
| [TASKS.md](TASKS.md) | Sequenced work items with dependencies and completion evidence. |
| [BUILD_PROMPT.md](BUILD_PROMPT.md) | Reusable implementation handoff aligned with this plan. |
| [MEMORY.md](MEMORY.md) | Current facts, assumptions, evidence, and continuation state. |
| [TRAILFORGE_INTEGRATION.md](TRAILFORGE_INTEGRATION.md) | Harness capability map, profiles, authority/commit bridge, agent setup, and study evidence. |

## 1. Five working artifacts

The framework's five artifacts are represented across these files; extra services or documents are not implied.

| Framework artifact, PDF p. 3 | Prism mapping | Primary location |
|---|---|---|
| Product contract | Authorized ad collection -> searchable board, cited patterns, three experiment drafts or explicit gaps | PRD |
| Workflow and decision map | Upload -> validate -> derive -> group/tag -> search -> aggregate -> draft -> verify -> review | ARCHITECTURE, GUARDRAILS |
| System blueprint | Small domain core, versioned records, replaceable model/storage adapters, API and durable worker | ARCHITECTURE, DECISION, SECURITY |
| Evidence and readiness plan | Manual baseline, held-out retrieval/extraction/grouping cases, fault/security exercises, stage gates | This file, TASKS |
| Delivery and operations plan | S0-S6 milestones, resource admission, supervised pilot, rollback, ownership | This file, TASKS, MEMORY |

## 2. Five design moves

| Move, PDF pp. 4-5 | Prism action | Artifact and gate |
|---|---|---|
| Observe real work | Watch a strategist organize and search a permitted collection; include hard cases | S0 notes and baseline; user recognizes the workflow |
| Define triggering input and owed output | Versioned images/copy -> durable job and evidence-backed board/report | PRD and ARCHITECTURE examples; valid/invalid/partial behavior agreed |
| Assign responsibility | Code owns permission/state/counts; CLIP owns similarity; OCR/extractor reads text; one bounded generator drafts; human chooses experiments | Responsibility table; no fixed rule depends on free-form generation |
| Allocate autonomy by action | Reversible internal work A4 after validation; draft reports A2; campaign choices A1 | GUARDRAILS matrix; permission checks match action |
| Walk through failure | Break uploads, inference, leases, evidence validation, provider calls, deletion, and budgets | Failure register and named fixture per case; useful degraded outcome |

## 3. Framework section traceability

| Framework section | PDF pages | Prism location |
|---|---|---|
| 01. Start with the decision | 3-4 | PRD outcome/baseline; DECISION alternatives |
| 02. Five design moves | 4-5 | Section 2 above; workflow and action matrix |
| 03. Eleven questions | 6-7 | DECISION Q1-Q11 |
| 04. Failure catalog | 8-9 | GUARDRAILS F01-F14 and SECURITY threats |
| 05. Human involvement | 9-10 | GUARDRAILS A0-A4 policy; S4 capacity |
| 06. Architecture/data model | 10-12 | ARCHITECTURE contracts, state, events, ports |
| 07. P00-P20 | 12-19 | Section 5 below |
| 08. Staged delivery | 20-21 | Section 4 below |
| 09. Module inventory/dependencies | 22-23 | ARCHITECTURE 22-entry disposition table |
| 10. Stack decisions | 24 | DECISION ADRs and SECURITY config contract |
| 11. Product examples | 25-26 | Applied as analogies, not Prism performance evidence |
| 12. Pre-build review | 26-27 | Section 8 below and staged backlog |
| Appendix A | 27-28 | Source lineage retained; no PR-review-specific requirements copied |
| Appendix B | 29 | RULES status vocabulary and MEMORY evidence distinction |

## 4. Delivery stages and exit gates

Durations are deliberately omitted until the team and data availability are known. Order is dependency-driven. Security, permission, evaluation, and cost apply from the first experiment.

| Stage | Deliverable | Exit evidence | Gate dependencies |
|---|---|---|---|
| S0 Discovery | Validated workflow, manual baseline, permitted data plan, scope | Representative users/domain owner confirm value; targets and critical assumptions recorded | T01-T04 |
| S1 Feasibility | Bounded CLIP search/grouping and text-analysis experiments | Frozen reference cases; comparisons to simple baselines; measured latency/cost; supported language/data slices | T05-T10; no unsupported provider uploads |
| S2 Blueprint | Refined contracts, state, failure policies, ADRs, owner/cost decisions | A request and its failure can be traced through every boundary; open gates and applicability explicit | T11-T15; this documentation is an initial draft, not an exit pass |
| S3 Vertical slice | One collection finishes, can be searched, explained, corrected, and recovered | Durable admission, identity, lineage, exact counts, verified evidence, budget and forced restart checks | T16-T31; generation is conditional on S1 evidence |
| S4 Supervised pilot | Representative 30-100-ad collections used with human review | Quality by slice, usefulness/time comparison, reviewer capacity, load/fault results, measured economics | T32-T35 |
| S5 Controlled release | Private hosted scope with operational controls | Ratified targets pass; security/deletion/restore/rollback evidence; named operator and support; protected CI | T36-T39 |
| S6 Operation/improvement | Monitored service and adjudicated improvement loop | Drift/incident exercises, versioned reevaluation and promotion, sustainable cost and human workload | T40-T42 |

Harness work augments these stage dependencies: S1 includes TF01/TF02 release pinning and Goal smoke contracts; S2 includes TF03 coding-agent setup and TF04 final product profiles; S3 includes TF05 intent/run/output bridge, TF06 UNKNOWN/deadline recovery, TF07 host predicates; S5 includes TF08 applicable conformance, old-run compatibility, and Develop handoff evidence. These eight tasks are integrated into the build order; original T01-T42 gates remain.

First vertical slice: an authenticated owner uploads 30 permitted English skincare ads with associated copy, receives durable status, sees visual groups and messaging tags, runs the demo query, opens supporting examples, reviews a pattern report and three experiment drafts, edits one copy record, and sees stale results marked. Kill a worker after acceptance and prove recovery without duplicate outputs. Smaller fixture collections are permitted for development, with limited-analysis behavior.

## 5. Complete P00-P20 applicability map

Owners below are accountable roles to assign, not claims of accepted staffing: PO = project/product owner; ENG = application engineer; ML = ML/evaluation owner; UX = design owner; SEC = security/privacy owner; OPS = deployment/operator owner. One person may hold several roles. Specific human assignments and availability are S0/S2 requirements.

| ID / concern | Disposition and Prism decision | Owner | Planning artifact | Implementation evidence / stage |
|---|---|---|---|---|
| P00 Cognitive/product design | Applicable: reference-finding and pattern explanation; no performance prediction | PO | PRD | Observed workflow, manual baseline, ratified outcome/countermetrics; S0 |
| P01 System architecture | Applicable: modular application, API + durable worker, replaceable adapters | ENG | ARCHITECTURE; ADR-01/02 | End-to-end/failure trace and inward dependency check; S2/S3 |
| P02 Frontend/channels | Applicable: upload, board, search, evidence, draft review, correction | UX | DESIGN | Users distinguish pending/partial/stale/failed/ready states; keyboard flow; S3/S4 |
| P03 Backend/API | Applicable: scoped authorization, typed API, durable acceptance | ENG | ARCHITECTURE; SECURITY | Invalid/cross-scope requests denied; duplicate admission defined; restart survives; S3 |
| P04 Orchestration | Applicable: Trailforge finite sequential tasks, local leases/CAS, explicit UNKNOWN, host supervisor | ENG | ARCHITECTURE; integration study | Pause/resume/hold/cancel and cross-store recovery; TF02/TF05/TF06, S3 |
| P05 Modeling/reasoning | Applicable: pretrained CLIP, OCR as needed, rules/extractor, conditional generator | ML | ADR-04/05; evaluation plan | Held-out quality/resource results beat declared baselines; malformed output handled; S1/S4 |
| P06 Memory/context | Applicable: collection-local, revision-bound retrieval; conversation history deferred | ML | ARCHITECTURE state; ADR-06 | Permission filtering before retrieval; stale/deleted evidence excluded; S3/S4 |
| P07 Tools/sandboxing | Applicable: constrained decoding/OCR/model calls; arbitrary tools omitted | SEC | SECURITY; GUARDRAILS | Decoder resource/egress isolation; no shell or arbitrary fetch exposed to model; S3/S5 |
| P08 Multi-agent collaboration | Deferred/not applicable to MVP: single pipeline and one bounded generator | ML | ADR-07 | Disposition retained; new roles require ablation on quality/cost/latency; S2, revisit S6 |
| P09 Evaluation | Applicable: retrieval, grouping, extraction, grounding, workflow quality | ML | Section 6; PRD targets | Held-out and failure slices, disputes and human review; S1/S4/S5 |
| P10 Observability | Applicable: work IDs, versions, step outcomes, gaps, resource usage | OPS | ARCHITECTURE event schema | Reconstruct successful and failed runs; exercise alerts and redaction; S3/S5 |
| P11 Security | Applicable: private content, workspace boundaries, untrusted copy/output | SEC | SECURITY | Cross-scope/artifact/injection/malformed-image tests; S3/S5 |
| P12 Reliability | Applicable: persistent neutral SQLite, recoverable host intents, bounded explicit retries | ENG | GUARDRAILS; ARCHITECTURE | Crash/lease/provider/intent-link/output-commit exercises; TF05-TF07, S3/S4 |
| P13 Infrastructure | Applicable: one persistent execution host, product DB/private artifacts; Linux checks separate | OPS | ADR-03/10/13; study | Local capacity, authority/product/artifact restore, isolation where needed; TF08, S4/S5 |
| P14 Data engineering | Applicable: decode/normalize/dedupe/copy mapping/revision lineage | ENG | ARCHITECTURE; ADR-08 | Corrupt/duplicate/revised/deleted inputs and index rebuild; S1/S3 |
| P15 Governance | Applicable: permitted data use, retention, explanations, ownership | PO + SEC | SECURITY; PRD | Owners accept policy; deletion/dispute/provider handling exercised; S0/S5 |
| P16 Economics | Applicable: unit = useful analyzed collection and ready search | OPS | ADR-09; section 7 | Measured resource cost; concurrent reservation cannot exceed caps; S1/S4/S5 |
| P17 Developer experience | Applicable: fixtures, typed ports, Develop coding milestones/protected checks | ENG | RULES; BUILD_PROMPT; study | Setup, actual phase adapters, continuity/handoff, failure diagnosis; TF03/TF08, S3/S5 |
| P18 CI/CD for AI | Applicable: code/model/prompt/index/policy release manifest | ENG + OPS | Section 8; RULES | Deliberately bad change blocked; compatible rollback rehearsed; S5 |
| P19 Human operations | Applicable: report review/corrections and release decisions; campaign approvals absent | PO | GUARDRAILS; DESIGN | Reviewable evidence, queue capacity, no timeout approval; S4/S5 |
| P20 Continuous learning | Applicable as controlled feedback; online adaptation deferred | ML | ADR-11; section 9 | Drift simulated, adjudicated change evaluated/promoted/rolled back; S6 |

## 6. Evidence and evaluation plan

### Reference data and splits

S1 needs at least three permitted collections spanning product close-ups, customer/testimonial designs, discounts, lifestyle images, dense text, duplicates, missing copy, ambiguous layouts, and difficult/no-match queries. A practical starting point is one development collection and two held-out collections, each 30-100 ads. This is a proposed dataset requirement; no dataset is currently present.

Split by campaign/brand/template family, keeping near duplicates in one split. Tune grouping thresholds, query prompts, text rules, and retrieval weights only on development data. Freeze the test set and labels before comparisons; record content hashes, permission provenance, annotator identities, disputes, and adjudication. Small-sample results get numerator/denominator and uncertainty reporting, not a claim of universal reliability.

Start with at least 30 supported search queries plus 10 no-match/ambiguous/adversarial queries; each has query intent and graded relevance labels within its permitted collection. Label hook/offer categories and source spans on at least 60 ads across the three collections. Human checks assess visual group usefulness and individual summary claims, not only whether a citation exists.

### Bounded experiment matrix

| Experiment | Compare | Decision evidence |
|---|---|---|
| E01 Visual retrieval | Manual tags/keyword search vs CLIP image-query similarity | P@5/recall@5, no-match behavior, p50/p95, CPU/GPU memory/time, user usefulness |
| E02 Visual grouping | Manual groups vs agglomerative cosine clustering; small fixed-k baseline if useful | Human usefulness, singleton rate, template imbalance, sensitivity to thresholds |
| E03 Messaging | Manual labels + deterministic rules vs bounded structured extractor; OCR only if needed | Macro-F1, offer-value exactness, source-span correctness, unknown rate, latency/cost |
| E04 Report/experiments | Exact aggregate + template report vs one grounded generator | Claim support, distinctness/actionability, omission rate, review time, resource usage |
| E05 Retrieval combination | CLIP-only vs permission-filtered lexical/tag plus semantic ranking | Improvement on exact offer/brand queries without degrading visual queries |

CLIP image/text encoding and pretrained use are documented in the [official CLIP repository](https://github.com/openai/CLIP). It is a candidate for similarity, not a correctness oracle. Clustering candidate behavior must be checked against the installed version of [scikit-learn AgglomerativeClustering](https://scikit-learn.org/stable/modules/generated/sklearn.cluster.AgglomerativeClustering.html). No custom training is planned for MVP.

Acceptance values are centralized in PRD section 7. Do not invent a successful benchmark. E01-E05 produce versioned result artifacts; generation ships only if E04 justifies its added value. Otherwise deliver the board, exact aggregates, templates, and explicitly limited experiment drafts.

### Required fault and adversarial fixtures

Corrupt and oversized image; duplicate image with different copy; ambiguous CSV mapping; long and unsupported-language copy; prompt injection embedded in text; CLIP/OCR/generator outage; low disk; database failure before/after acceptance; worker crash/expired lease; duplicate job request; concurrent copy edit; deletion while analysis runs; stale evidence IDs; fabricated offer count; nonexistent citation; budget exhaustion and simultaneous admissions; unauthorized image/copy/search request.

Each fixture records expected status, surviving state, bounded effects, recovery owner, actual result, and residual uncertainty. Critical permission, evidence-integrity, and budget failures block release regardless of average quality.

## 7. Economics, capacity, and operations

Provisional pilot envelope: at most five active collections and two concurrent analysis jobs; <=100 ads each. Raise only after measured load. These are admission defaults, not claims of system capacity.

Cost per useful collection = preprocessing/OCR + model inference + generation + allocated storage/bandwidth/infrastructure + operator/reviewer time. Search cost includes query encoding and retrieval. Record device, runtime, duration, tokens where applicable, usage estimate vs actual, and priced assumptions. The owner must set currency limits before hosted or paid-provider work; no budget has been granted by this documentation request.

Use retained declared units in one shared neutral SQLite authority plus separate Prism actual monetary/resource admission. Kernel units do not measure tokens/dollars or refund/reset on completion/cancellation; finite cumulative caps need explicit monitored lifecycle policy. Host/provider attempts and fallbacks share job deadline and actual-cost allowance. Missing paid budget denies admission. UNKNOWN requires host inspection and explicit permitted retry/cancel; actual provider reconciliation cannot erase kernel units or ambiguity.

Proposed SLOs: PRD latency targets; 99% of admitted jobs reach a terminal visible status within their declared deadline during pilot; no accepted-job loss in the declared restart test. Availability percentage remains open until hosting design and measurement window exist. Proposed pilot backup targets: RPO 24 hours, RTO 4 hours; ratify and test before release.

Human capacity: expected reviews = collections/day x review fraction + corrections/rework. Start pilot at five reports/day, 100% review, budget 10 minutes/report -> at least 50 minutes/day plus rework. This estimate is unmeasured. Record actual review time and named availability in S4. If capacity is exceeded, queue/limit new reports, preserve the board/search, and retain draft status.

Required runbooks: recover stuck/failed job; provider outage; budget exhaustion; revision/index rebuild; revoke compromised credentials; data deletion; restore; rollback; unsupported-claim incident. Alert on lease expiry, oldest queued job, provider errors, evidence validation failures, budget pressure, and deletion backlog. Route alerts to the named operator; telemetry excludes raw images/copy by default.

## 8. Pre-build and release gates

Pass 1 (product): contract and scope are drafted here; observed workflow, permitted dataset, user validation, and target ratification are OPEN.

Pass 2 (feasibility/boundaries): contracts and candidate ADRs are drafted; E01-E05, data audit, hardware capacity, and provider choice are OPEN.

Pass 3 (production): all P00-P20 dispositions are recorded; actual owners, measured costs, exercised failures, and deployment evidence are OPEN.

The current pack supports bounded discovery and feasibility work. It is not product-owner signoff or production readiness. No readiness average can conceal a failed critical gate.

Before S5 release require: all applicable PRD acceptance checks; frozen held-out evaluation; permissions and prompt-injection evidence; durable restart and cancellation evidence; concurrent resource-admission test; retention/delete and backup-restore evidence; measured reviewer capacity; named owners; protected CI and reproducible manifest; compatible rollback; scope-specific owner acceptance.

Manifest binds code commit, dependencies/runtime, CLIP artifact hash, preprocessing/tokenizer, OCR/extractor, taxonomy, clustering/ranking configuration, prompt/provider, schema/index, and policy versions. Rollback restores a compatible combination and regenerates derived data when needed; old deleted inputs must not be resurrected from a prior index or backup.

The manifest also pins Trailforge release/commit/protocol, adapter implementation/config hashes, and Goal reconstruction inputs. Product DB and neutral SQLite do not share a transaction: require TF05 link/commit crash evidence and revalidation of terminal outcomes. Back up authority consistently with product truth/artifacts; never restore/reset spent units to regain allowance. Kernel checks, installed conformance, semantic product quality, and deployment acceptance are distinct gates.

## 9. Improvement and completion

Collect correction provenance and pilot outcomes. Adjudicate labels before adding them to evaluation; never let raw feedback rewrite policy, change permissions, or train a model automatically. Investigate drift by language/category/style slice. Update a versioned candidate, rerun relevant held-out/failure gates, promote with owner decision, and retain downgrade/rollback.

Documentation creation is complete when the thirteen-file pack exists, links/framework coverage and the full task order are checked, and no completed implementation claims appear. Product completion occurs only when declared scope has matching acceptance evidence. Track actual work in TASKS and MEMORY.

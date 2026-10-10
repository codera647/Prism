# Prism - Decisions, Alternatives, and Uncertainty

> Current 0.2 desktop/browser scope and verification: [release record](RELEASE_0_2.md), [deployment architecture](DEPLOYMENT.md). Earlier local-only implementation sections below describe the 0.1 baseline; open human/quality gates remain open.

> Implementation update (2026-10-10): the local Prism 0.1.0 app is built with real CLIP and pinned Trailforge. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for implemented contracts, evidence and remaining gates. Earlier proposals below remain framework/reference requirements; they do not imply that missing real-data, pilot or hosted-release evidence exists.

Updated: 2026-10-09 (Asia/Karachi). Status: user-selected Trailforge is decided; product quality/capacity/integration remains unvalidated. Limited source checks are in [TRAILFORGE_INTEGRATION.md](TRAILFORGE_INTEGRATION.md), not product evidence.

## 1. Decision vocabulary and ownership

Decided means a recorded design choice under stated assumptions. Evidence-backed requires a linked experiment or demonstrated behavior. Open means unresolved with a next step and blocked gate. Deferred/not applicable means intentionally omitted with rationale. Proposed means awaiting the appropriate owner decision; a documentation author cannot fabricate approval.

Owners are roles, not confirmed appointments. PO = project owner; ENG = application engineer; ML = model/evaluation owner; SEC = security/privacy owner; OPS = operator. A single developer may hold multiple roles after explicit assignment.

Source: Production AI Design Compass v1.0, PDF pp. 6-7 and 24. This record does not select technology versions, create accounts, approve data processing, or authorize paid/hosted work.

## 2. The eleven architecture questions applied

| Question | Prism answer / proposed decision | Evidence still needed | Record |
|---|---|---|---|
| Q1 Costly limitation | Strategists spend time organizing ads and locating examples; target faster useful reference selection | Observe real workflow and measure manual baseline; PO | PRD; T01-T03 |
| Q2 Existing competent worker | A strategist sorts by composition, reads hooks/offers, selects representative examples, and proposes variations | Interviews/observation; no expert study completed; PO | PRD workflow; T01 |
| Q3 Exact traveling contract | Versioned AdAsset/CopyRecord -> durable AnalysisJob -> board/search/report with coverage and evidence | Typed implementation and invalid/partial fixtures; ENG | ARCHITECTURE; T11/T16 |
| Q4 Mature needs | Identity, privacy, provenance, recovery, limits, evaluations, corrections, operations, rollback | Baseline comparison plus fault/load evidence; ENG | ADR-01/02/09/10 |
| Q5 Missing context | User copy, OCR text, category hints, selected representatives, current collection revisions; no ad performance data | Data audit and context-value ablation; ML | ADR-05/06; T04/T09 |
| Q6 State kinds | Authoritative records, revisioned derived features, events, artifacts, disposable working context | Delete/edit/restore semantics verified; ENG | ARCHITECTURE; ADR-03/08 |
| Q7 Reconstruction/cost | Bind outputs to input/model/prompt/config/policy, evidence, steps, and resource records | Successful and failed trace reconstruction; OPS | Event contract; T30 |
| Q8 Autonomy | Search/derivation scoped automatic; generated drafts reviewed; human chooses campaigns | Eligible-case evaluation and reviewer capacity; PO | GUARDRAILS; T34 |
| Q9 Failure | Partial asset failures explicit, provider outage degrades to board/templates, retries bounded, stale outputs blocked | Fault register exercised; ENG | GUARDRAILS; T31/T35 |
| Q10 Storage | Primary relational truth + private image artifacts; exact similarity at <=100 ads before specialized vector service | Transaction/restore and representative workload benchmarks; ENG/OPS | ADR-03 |
| Q11 Interfaces | Image encoder, OCR/extractor, clustering, retriever, generator, record/artifact stores, job runner | Capability/error contracts and dependency checks; ENG | ARCHITECTURE; T11/T15 |

## 3. Architecture decision records

Original records were created on 2026-10-08 and adapted to Trailforge on 2026-10-09; ADR-13 was added during that adaptation. Evidence fields distinguish limited harness study checks from required product/integration work.

### ADR-01 - Application boundaries

- Question: how should Prism code and processes be organized?
- Context: 30-100 ads/collection, unconfirmed small pilot, one repository, no demonstrated independent team scaling.
- Alternatives: one synchronous process; modular application with API and worker; microservices.
- Proposed choice: modular application with independent API/worker processes and one web frontend. Core contracts remain provider-free.
- Reason: long processing needs isolation and restartability, while shared transactions and a small team favor one codebase.
- Downside: shared release cadence; worker resource contention needs limits.
- Owner: ENG. Status: proposed.
- Evidence: T11/T15 boundaries and T31 restart/dependency checks.
- Revisit: measured resource contention, independent ownership, or stronger isolation requirements. Separate services only if these change the tradeoff.

### ADR-02 - Workflow execution

- Question: ordinary pipeline or workflow platform?
- Alternatives: synchronous request; database-backed durable staged worker; graph/durable workflow engine.
- Selected mechanism: Trailforge v0.1.0a1 generic Harness through Prism WorkflowRunner. Product DB holds recoverable intents/run links; neutral task checkpoints/local attempts/units live in persistent SQLite. Collection analysis and report use separate finite goals.
- Reason: the user selected this harness; reuse bounded execution/checks/recovery and implement host identity/data/current-output integration.
- Downside: sequential tasks per run, local authority, explicit UNKNOWN resolution, cumulative retained units, and cross-store linkage/commit recovery. Generic distributed PostgreSQL is unavailable in this release.
- Owner: ENG. Status: harness selection decided; integration planned.
- Evidence: six limited source checks passed; TF01/TF02/TF05/TF06/TF07/T31 require real integration evidence.
- Revisit: release upgrade or measured distributed/capacity need; do not substitute the legacy Review PostgreSQL store for a neutral backend.

### ADR-03 - Storage and retrieval index

- Question: which data arrangement fits this workload?
- Alternatives: all files + local metadata; relational DB with artifact files; relational DB + private object storage; dedicated vector service.
- Proposed choice: relational product records/private artifacts plus Trailforge's neutral SQLite authority. Exact scoped similarity remains the initial retrieval approach. A PostgreSQL product DB does not provide generic PostgreSQL harness execution.
- Reason: images are large artifacts; collection-local retrieval is small. A specialized vector database has no demonstrated benefit yet.
- Downside: artifact/product/harness stores are not one transaction. TF05 implements durable intents/run-link reconciliation, idempotent current-output commits, orphan cleanup, and tombstones. LocalArtifactStore has no delete/retention/aggregate-quota service.
- Owner: ENG/OPS. Status: proposed.
- Evidence: scoped retrieval benchmark; artifact/record recovery; backup restore and deletion replay.
- Revisit: corpora beyond the evaluated envelope, query latency/memory misses, concurrent-load failure, or isolation needs. Benchmark an index before adding it.

### ADR-04 - Visual representation and grouping

- Question: how to find and group similar visuals?
- Alternatives: manual tags/keywords; basic image descriptors; pretrained CLIP; custom fine-tuning.
- Proposed choice: evaluate pretrained CLIP image/text embeddings; cosine similarity; agglomerative clustering using average linkage and a development-tuned distance threshold. Do not use Ward linkage with cosine distance. Permit singletons and user correction.
- Reason: it matches the user's image/text retrieval concept without a custom training project. A threshold avoids inventing a universal cluster count.
- Downside: domain/language bias, text-heavy templates, small collections, and aesthetic subtleties may reduce usefulness. Similarity is not a calibrated probability.
- Owner: ML. Status: proposed, E01/E02 required.
- Evidence: campaign-separated held-out retrieval, grouping usefulness, and hardware cost. Pin model artifact, preprocessing, and installed clustering-library behavior.
- Revisit: supported-domain errors or throughput targets missed. Evaluate a different encoder/algorithm before custom training.
- Sources: [CLIP](https://github.com/openai/CLIP); [AgglomerativeClustering](https://scikit-learn.org/stable/modules/generated/sklearn.cluster.AgglomerativeClustering.html). These describe capabilities, not Prism results.

### ADR-05 - Copy, OCR, and generation

- Question: which parts need language models?
- Alternatives: user copy + rules + templates; OCR + rules; structured extractor; one grounded generator; all-image full-corpus prompt.
- Proposed choice: preserve user copy and separately sourced OCR. Use rules for exact amounts/obvious offers, compare a bounded extractor for semantic hook categories, and add one grounded report generator only if E03/E04 demonstrate value. Counts and evidence checks stay in code.
- Reason: extraction and free-form drafting have different failure contracts. Missing text does not justify fabricated offers.
- Downside: more provenance fields and explicit disagreement handling; generated meaning still requires human evaluation.
- Owner: ML/SEC. Status: conditional proposal.
- Evidence: source-span/exact-value checks, held-out tagging, report usefulness vs templates, provider/privacy review.
- Revisit: templates perform equally well, OCR errors dominate, generation adds cost without usefulness, or provider policy conflicts. Hosted provider/model/version remain open.

### ADR-06 - Context and search combination

- Local implementation disposition (2026-10-10): exact current-collection CLIP cosine retrieval with a provisional 0.23 floor and 0.08 normalized lexical bonus, not a claim that E05 rank-fusion superiority has been measured. Long queries use complete token chunks. Reports use exact aggregates and source-linked templates; no paid generator or E04 comparative win is claimed. Revisit on frozen permitted data before quality promotion.


- Question: what context may reports and search use?
- Alternatives: full collection prompts; collection-local selected evidence; persistent chat/history; web retrieval.
- Proposed choice: current authorized collection snapshot, exact aggregates, representative ad evidence, and explicitly supplied category hints. Search begins CLIP-only; add lexical/tag ranking via rank fusion only after E05. A lexical result list and semantic list may have different scores; do not blend raw incomparable scores.
- Reason: keeps context bounded, permissioned, and revisioned. Product needs uploaded examples, not web browsing.
- Downside: representative selection can omit minority styles; coverage and sampling must be visible.
- Owner: ML. Status: proposed.
- Evidence: retrieval/context ablation, minority-style slice, stale/deletion tests.
- Revisit: an authorized new source improves validated relevance. Persistent chat and external retrieval require new contracts.

### ADR-07 - Specialized agents

- Question: are multiple agents needed?
- Alternatives: ordinary staged processors; one tool-using agent; specialist agents with aggregation.
- Proposed choice: conventional pipeline and at most one bounded generator. OCR, embedding, and text processing may run as independent tasks; those tasks are not independent reasoning agents.
- Reason: no evidence that role collaboration improves this product. Avoid multiplied budgets, disagreements, and incomplete-coverage complexity.
- Owner: ML. Status: deferred/not applicable to MVP.
- Evidence: the single-path E01-E04 baseline first.
- Revisit: measurable distinct specialist benefit in an ablation with total quality/cost/latency and failure aggregation included.

### ADR-08 - Duplicates, revisions, and corrections

- Question: how should changes affect truth and counts?
- Alternatives: overwrite existing records; immutable input revisions with current pointers; dedupe everything by image hash.
- Proposed choice: new revisions for edits and reanalysis. Same image+same copy/source identity is an exact duplicate within a collection; report/skip by default. Same image with different copy is a distinct ad variant sharing an image blob. Count accepted ad variants, and also report unique-image counts.
- Reason: offers/hooks can differ on an identical visual; previous results must remain explainable.
- Downside: more state/storage; deletion must cover all derived references without deleting other authorized references accidentally.
- Owner: ENG. Status: proposed.
- Evidence: T18/T29 duplicate, edit, delete, in-flight cancellation, and lineage fixtures.
- Revisit: product owner defines a different creative-identity convention; migrate deliberately rather than silently changing historical denominators.

### ADR-09 - Resources and provider budgets

- Question: how are concurrent obligations bounded?
- Alternatives: telemetry-only costs; static quotas; transactional reservation/admission plus actual-usage reconciliation.
- Proposed choice: retained Trailforge declared units plus separate Prism actual monetary/resource admission. Host job deadline/provider budgets/concurrency supplement kernel local leases and bounded attempts. UNKNOWN requires explicit authorized inspection/resolution.
- Reason: concurrent dashboard totals cannot enforce hard limits. Paid work requires an owner-set allowance.
- Downside: declared units are not tokens/dollars and never refund after admission. Same-file caps are finite/cumulative; reopening/replacing authority cannot reset allowance. Actual provider-cost reconciliation is a separate host responsibility.
- Owner: OPS. Status: proposed; monetary cap OPEN.
- Evidence: T21 simultaneous admissions, provider timeout, retries/fallbacks, and reservation reconciliation.
- Revisit: demonstrated quota/quality economics justify routing or dynamic allocation. Cheaper unit pricing alone is insufficient.

### ADR-10 - Initial stack and deployment

- Question: which concrete stack implements the selected capabilities?
- Selected local stack (2026-10-10): Python/FastAPI, a responsive vanilla JavaScript interface, separate product/execution SQLite databases, private filesystem artifacts and supervised local CPU OpenCLIP. Trailforge v0.1.0a1 is pinned to `fbefaf40fb39a1429dcc328184372214f9fd849d`. Exact validated versions are in [requirements.lock](../requirements.lock).
- Alternatives: React/TypeScript, PostgreSQL product storage, hosted inference and separate distributed services. These add setup/operations requirements without evidence of local necessity.
- Decision: one loopback server and execution host under a data-directory lock; no paid model calls. CLI setup, model-download, doctor, backup, restore and Develop configuration are implemented. PostgreSQL, distributed generic execution and hosted release remain deferred.
- Reason: completes the user's authorized local build with no paid service, no available real ads and a reproducible real-CLIP demonstration.
- Downside: local accounts/single-host storage are not a hosted team product; CPU cold start and ingestion are material waits. Rules/templates cover a narrower language/messaging space than OCR or a general language model.
- Owner: implementation ENG role; operational/pilot owners remain unassigned. Status: selected and implemented locally; production stage gates open.
- Evidence: 28 automated tests, six installed harness checks, real-CLIP 30/100-ad synthetic workflows, browser layouts and packaged web assets. See [IMPLEMENTATION.md](IMPLEMENTATION.md); these are not a held-out quality or SLO result.
- Revisit: representative data, team/hosting needs or measured capacity justify a new versioned choice. No cloud deployment is included.

### ADR-11 - Feedback and learning

- Question: does Prism improve automatically from corrections?
- Alternatives: immediate online updates; curated evaluation expansion; periodic supervised training.
- Proposed choice: corrections are authoritative user annotations for their collection, with provenance; separate adjudicated examples feed evaluation and versioned configuration changes. No online training or policy adaptation.
- Reason: unreviewed feedback can poison labels, cross tenant boundaries, or create unmeasured regressions.
- Downside: slower improvement and explicit adjudication effort.
- Owner: ML/PO. Status: proposed; online learning deferred.
- Evidence: correction-to-evaluation audit trail and simulated poisoned feedback in T41/T42.
- Revisit: sufficient permitted labeled data and evidence justify a controlled training program.

### ADR-12 - Human review and evidence authority

- Question: when can generated observations become accepted conclusions?
- Alternatives: unattended fluent reports; user-reviewed drafts; verified templates only.
- Proposed choice: automatic numeric/reference validation followed by draft display and human review. Experiment selection stays human. Approvals, if introduced, bind exact versions/payloads and expire; no campaign action is available.
- Reason: valid citations do not establish semantic support, and uploaded ads provide no performance evidence.
- Downside: review workload and automation benefits must be measured together.
- Owner: PO. Status: proposed.
- Evidence: T34 review/correction flow, known-error fixtures, sustainable capacity.
- Revisit: representative audited evidence supports narrower automatic report acceptance; authority changes need an owner decision.

### ADR-13 - User-owned coding agents and Develop

- Question: how should Trailforge manage agents building Prism?
- Selected direction: Develop for bounded coding milestones; generic Harness for product inference. Separate developer/customer scope, authority, context, and budgets.
- Composition: host supplies PLAN/RESEARCH/BUILD/DEBUG/VERIFY; HEALTH is built in. One round initially; up to three predeclared rounds. BUILD alone writes candidates; DEBUG diagnoses; repairs occur in a later planned BUILD or a new contract.
- Reason: follows the selected harness and retains protected criteria/current-candidate continuity. Multiple specialist agents and approval at every phase are not required.
- Downside: file/tree limits require narrow staged candidates. Trusted callbacks are not OS isolation; Linux runner checks are read-only/network-free, not a mutable app/GPU environment.
- Owner: ENG/PO. Status: user-directed mechanism decided; command phase adapters implemented in develop.py; the user's actual commands/check ownership remain pending in TF03.
- Evidence: synthetic resume/handoff-mutation denial passed; meaningful independently administered Prism checks and isolation/promotion remain TF03/TF08/S5 evidence.
- Revisit: new release/size/isolation needs. Handoff is never merge/deployment approval.

## 4. Uncertainty register

| ID | Open issue | Owner | Bounded next step | Gate blocked |
|---|---|---|---|---|
| U01 | Real workflow/time benefit | PO | Observe users and measure manual tasks | S0 value claim |
| U02 | Permitted representative dataset | PO/SEC | Data provenance and rights audit | S1 real-data/provider processing |
| U03 | CLIP retrieval/grouping fit | ML | E01/E02 on frozen splits | S3 model selection, S4 quality |
| U04 | Copy/OCR reliability and supported language | ML | E03 by input slice | Extraction/generation claims |
| U05 | Generator adds value and allowed provider handling | ML/SEC | E04 plus provider policy review | Hosted generation |
| U06 | Hardware, latency, capacity | ENG/OPS | Profile warm/cold 30/100-ad workloads | S5 SLO/capacity |
| U07 | Monetary allowance and unit economics | PO/OPS | Set budget and measure total unit cost | Paid-provider/hosted admission |
| U08 | Named operator/reviewer availability | PO | Assign roles and measure review time | S4 pilot/S5 release |
| U09 | Retention/residency/export expectations | SEC/PO | Confirm policy, exercise deletion/restore | S5 hosted privacy |
| U10 | Acceptance targets and grouping granularity | PO/ML | Ratify after baseline/feasibility | S4/S5 acceptance |
| U11 | Companion workbook mentioned by PDF unavailable at searched locations | ENG | Use this eleven-file pack to record all stated workbook fields; request only if additional template fidelity is later required | Does not block current planning |
| U12 | Single-host capacity and cross-store recovery | ENG/OPS | TF05 bridge/crash tests and T35 load | S5 execution topology |
| U13 | Actual coding/model/tool adapters and protected checks | ENG/PO | TF03 host phase composition | Agent-assisted milestone handoff |
| U14 | Installed harness bytes and old-run compatibility | ENG | TF01 pin verification and TF08 conformance | Integration/release |

Critical unknowns block their dependent commitment, not every reversible experiment. Update the relevant record when evidence changes; never promote a proposal to evidence-backed based on document completeness.

# Prism - System Blueprint

> Current 0.5 account system: [complete system design and rollout](SYSTEM_DESIGN.md), [implementation and activation gates](RELEASE_0_5.md). Green/gray dashboard and backend code are implemented; Google accounts require D1/OAuth configuration. Earlier sections are historical baselines.

> Current 0.4 interface replacement: [layout, preserved features and verified publication](RELEASE_0_4.md). Existing CLIP, Trailforge, provider and storage boundaries remain applicable.

> Current campaign research / Gemini / UI extension: [Prism 0.3 specification and framework mapping](RELEASE_0_3.md). Earlier sections below remain historical baseline records.


> Current 0.2 desktop/browser scope and verification: [release record](RELEASE_0_2.md), [deployment architecture](DEPLOYMENT.md). Earlier local-only implementation sections below describe the 0.1 baseline; open human/quality gates remain open.

> Implementation update (2026-10-10): the local Prism 0.1.0 app is built with real CLIP and pinned Trailforge. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for implemented contracts, evidence and remaining gates. Earlier proposals below remain framework/reference requirements; they do not imply that missing real-data, pilot or hosted-release evidence exists.

Updated: 2026-10-09 (Asia/Karachi). Status: Trailforge selected by the user; Prism integration and learned behavior remain planned and subject to evidence. No product system is implemented.

Framework source: Sections 06/09/10, PDF pp. 10-12 and 22-24. Scope and acceptance: [PRD.md](PRD.md). Delivery/evidence: [PLAN.md](PLAN.md). Tradeoffs: [DECISION.md](DECISION.md).

Harness baseline: Trailforge v0.1.0a1 at `fbefaf40fb39a1429dcc328184372214f9fd849d`. Read [TRAILFORGE_INTEGRATION.md](TRAILFORGE_INTEGRATION.md) for exact source/PDF findings, limits, agent setup, and host duties. Generic Harness drives product workflows; Develop drives bounded coding-agent milestones under separate developer authority.

## 1. Responsibilities and flow

```text
Authenticated owner / collection-local browser UI
       |
Identity + authorization + bounded upload validation
       |
Private artifacts -> product revisions + durable host work intent
       |
TrailforgeWorkflow host -> finite Goal/Task -> Harness + SQLite authority
       |
       +-- sequential bounded visual/copy batches -> staged artifacts
       +-- trusted VERIFY adapters -> typed VerifiedResult + receipts
       |
Host currentness/permission checks -> idempotent product commit
       |
Revisioned board snapshot + collection-local search
       |
Selected evidence + exact counts -> template or bounded generator
       |
Schema/reference/count checks -> report draft or explicit gap
       |
Human review / corrections / selection of experiments
```

Search of ready inputs need not wait for report generation. Collection analysis and creative reporting use separate finite goals. Tasks inside one neutral run execute sequentially; independent goals may be scheduled concurrently by a measured single-host policy. The host declares capability coverage, maps observations to UI states, and commits current outputs. A worker is a process boundary, not proof of a multi-agent architecture.

| Step | Responsible mechanism | Why |
|---|---|---|
| Identity, limits, admission, state, counts | Deterministic application code | Exact rules cannot depend on model judgment. |
| Visual representation/ranking | Pretrained CLIP candidate | Learned image/text similarity requires held-out validation. |
| Visual grouping | Configured clustering over image vectors | A repeatable grouping aid; usefulness still needs review. |
| Reading visible words | Optional bounded OCR adapter | Original region/text references preserved; errors possible. |
| Obvious offers/amounts | Rules and exact parsing | Amounts and units must match source text. |
| Semantic hooks/ambiguous offers | Conditional structured extractor | Unknown/disputed values permitted. |
| Pattern prose/experiment drafts | Template baseline or one grounded generator | Evidence supports observations; generation is not an authority. |
| Creative/campaign decision | Human | Performance data and execution authority are outside MVP. |

## 2. Domain invariants

Every operation has a principal and workspace/collection scope resolved by Prism. Trailforge tenant/resource strings bind that scope but do not authenticate it. A collection revision pins an ordered manifest of ad revisions. Derived records cannot silently mix different manifests, encoders, preprocessing, or taxonomy versions. Counts identify eligible ad variants and coverage. Model output cannot write policy, override access, accept work, resolve UNKNOWN, or authorize an external effect.

Idempotency is scoped to principal/workspace, endpoint, request key, and payload hash. Reusing a key with a different payload is a conflict. Trailforge fences its own run-result commits with local attempt ownership/expiry and CAS; Prism independently gates authoritative publication of staged results by current revision, deletion, and expected output identity. Callbacks must not directly publish business state. Deleted/tombstoned records cannot be restored by a late callback or terminal replay.

## 3. Typed contract specification

These are schema requirements for implementation, not actual generated API types. All IDs are opaque, timestamps UTC ISO-8601, revisions immutable positive integers, hashes named by algorithm, and enum values validated. Null means explicitly unavailable, not an empty invented fact.

### Work and context

```typescript
type WorkStatus = 'queued' | 'running' | 'awaiting_attention' | 'succeeded' | 'partial'
  | 'failed' | 'cancelled';
type Coverage = {
  requested: number; accepted: number; ready: number;
  failed: number; missing_copy: number; excluded: number;
};
type AnalysisJob = {
  id: string; workspace_id: string; collection_id: string;
  collection_revision: number; manifest_sha256: string;
  requested_by: string; requested_capabilities: string[];
  status: WorkStatus; deadline_at: string;
  policy_version: string; pipeline_manifest_id: string;
  idempotency_key: string; payload_sha256: string;
  harness_runs: Array<{profile: string; run_id: string; goal_digest: string;
    adapter_manifest_sha256: string; raw_state: string}>;
  coverage: Coverage; created_at: string;
};
type ExecutionContext = {
  job_id: string; authorized_scope: string;
  collection_manifest_sha256: string; permitted_ad_revisions: string[];
  model_artifact_sha256: string; preprocessing_version: string;
  taxonomy_version: string; clustering_version: string;
  ranking_version: string; prompt_version: string | null;
  provider_config_version: string | null; policy_version: string;
  reservation_id: string; deadline_at: string;
  harness_release: string; harness_goal_digest: string;
};
```

Coverage requested includes submitted files. Accepted excludes invalid files and exact duplicates skipped under the documented policy. Ready is capability-specific: a visual-ready asset can have missing copy. Store per-capability coverage as well as the summary fields; never compare incomparable denominators.

### Inputs and derived data

```typescript
type AdAsset = {
  id: string; workspace_id: string; collection_id: string; revision: number;
  original_artifact_id: string; image_sha256: string;
  original_filename: string; mime: string; byte_size: number;
  width: number; height: number; copy_record_id: string | null;
  source_reference: string | null; source_authority: 'user_supplied';
  tombstoned_at: string | null;
};
type CopyRecord = {
  id: string; ad_id: string; revision: number; text: string;
  source: 'user' | 'ocr'; language: string | null;
  source_image_revision: number | null;
  regions: Array<{text: string; box: number[]}>;
  status: 'available' | 'missing' | 'unsupported' | 'needs_review';
};
type EmbeddingRecord = {
  ad_id: string; ad_revision: number; encoder_id: string;
  encoder_artifact_sha256: string; preprocessing_version: string;
  dimension: number; normalized: boolean; vector_artifact_id: string;
};
type MessageTag = {
  ad_id: string; ad_revision: number; copy_revision: number;
  kind: 'hook' | 'offer' | 'cta'; category: string | null;
  source_record_id: string; source_span: {start: number; end: number} | null;
  extractor_version: string; status: 'suggested' | 'confirmed' | 'unknown';
  review_reason: string | null;
};
type VisualCluster = {
  id: string; snapshot_id: string; label: string;
  label_source: 'system_suggestion' | 'user'; member_ad_revision_ids: string[];
  representative_ad_revision_ids: string[]; clustering_version: string;
};
```

User copy and OCR are separate records. If they disagree, preserve both and show the disagreement; user-selected text determines the active analysis copy. Preserve original wording and OCR regions. Do not label CLIP as an OCR engine. Vector dimensions come from the selected encoder, not a copied fixed constant.

### Search, reports, and errors

```typescript
type EvidenceRef = {
  ad_id: string; ad_revision: number; collection_revision: number;
  copy_record_id: string | null; copy_revision: number | null;
  source_span: {start: number; end: number} | null;
};
type PatternClaim = {
  id: string; text: string; kind: 'count' | 'observation';
  evidence: EvidenceRef[];
  aggregate_id: string | null; limitations: string[];
};
type Experiment = {
  id: string; title: string; hypothesis: string;
  changed_variable: string; constants: string[];
  rationale_claim_ids: string[]; evidence: EvidenceRef[];
  proposed_measurement: string; limitations: string[];
};
type Report = {
  id: string; job_id: string; collection_revision: number;
  status: 'draft' | 'reviewed' | 'partial' | 'unavailable';
  claims: PatternClaim[]; experiments: Experiment[];
  coverage: Coverage; limitations: string[];
  pipeline_manifest_id: string; currentness: 'current' | 'stale';
};
type SearchResult = {
  collection_revision: number; ranking_version: string;
  status: 'matches' | 'no_match' | 'limited';
  items: Array<{ad_id: string; ad_revision: number; rank: number;
    match_basis: 'visual_similarity' | 'copy' | 'tag'}>;
  limitations: string[];
};
type ApiError = {
  code: string; message: string; request_id: string;
  retryable: boolean; failed_asset_ids: string[];
};
```

A complete report has exactly three distinct experiments and validated claims. Insufficient grounding yields partial/unavailable rather than three padded suggestions. Currentness is computed from authoritative revisions; it is not a provider judgment. Search scores may be stored internally for evaluation but are not shown as correctness percentages.

### Event and resource record

```typescript
type ExecutionEvent = {
  id: string; job_id: string; task_id: string | null;
  harness_run_id: string | null; harness_receipt_id: string | null;
  trace_id: string; span_id: string; occurred_at: string;
  type: string; outcome: string; duration_ms: number | null;
  input_revision_refs: string[]; config_manifest_id: string;
  evidence_refs: string[]; artifact_refs: string[];
  usage: {cpu_ms: number; gpu_ms: number; input_tokens: number;
    output_tokens: number; estimated_cost: number | null;
    actual_cost: number | null; currency: string | null};
};
```

Concise observations and validation receipts reconstruct behavior. Hidden chain-of-thought is neither requested nor retained. Application append-only events are not claimed to be administrator-proof immutable audit.

### Examples

Valid input: 30 decoded skincare images plus explicitly mapped English copy, scoped to collection C1 revision 1. Missing copy on two ads is a visible gap, not an invalid entire collection.

Invalid input: an executable renamed `.png`; 101 files; duplicate filenames with ambiguous CSV mapping; an unauthorized collection ID; a stale `expected_revision` mutation. Return typed rejection/conflict; do not enqueue invalid work.

Partial output: 30 files submitted, 29 accepted, 27 visual-ready, two asset failures, four missing-copy records. Show counts per capability; report observations only on the declared analyzed set. A template report can be ready while generated experiments are unavailable.

## 4. State and storage inventory

| Class | Records / authority | Access and consistency | Lifecycle |
|---|---|---|---|
| Business truth | Ownership, collections, input revisions, accepted work intents, run links/projections, annotations, output manifests, monetary reservations, deletion tombstones | Product-store transactions; scoped reads; compare-and-set output transitions | Durable; revisioned; host-controlled mutations |
| Harness execution authority | Neutral goals, task states, local attempts/leases, receipts/journal, declared-unit ledgers | Trailforge SQLite/CAS; one persistent authority file on one execution host | Retain attempts/units through UNKNOWN/cancel; reconstruct same contract on resume |
| Semantic/context state | Embeddings, copy indexes, tags, group snapshots | Derived from exact revisions/config; permission filter first | Rebuildable; invalidate on edit/delete/model/config change |
| Episodic state | Past job outcomes and report revisions | Readable to permitted owner/operator, not automatic model context | Retained under policy; summaries never replace original outcome |
| Procedural state | Approved policies, taxonomy, prompts, defaults | Versioned config/assets under change control | Promoted through evaluation; no model writes |
| Events/time | Traces, step outcomes, validation and cost receipts | Append-oriented app writes; controlled operator access | Proposed 30-day operational retention |
| Artifacts | Original/normalized images, thumbnails, vector files, model artifact, evaluation evidence | Private store with scoped keys and references | Reference-aware deletion; model/eval lifecycle separate from user data |
| Temporary working context | Selected evidence bundle, in-memory query vector, bounded OCR scratch files | Job-local/process-local | Discard after bounded execution; no persistent chat buffer |
| Queue/cache | Host work intents/wakeups and optional acceleration caches | Dispatch is a hint; reload linked Trailforge authority before advancing | Queue/cache never grants execution or retry authority |

Proposed deletion policy and backup obligations are in SECURITY. Images default to private. Across-workspace deduplication is omitted to avoid existence/privacy leaks. No new embedding should be required for an unchanged image when compatible image/preprocessing/model versions exist; changed copy invalidates text-derived outputs and reports.

## 5. Trailforge workflow, host bridge, and concurrency

Prism job lifecycle: queued -> running/awaiting_attention -> succeeded/partial/failed/cancelled. Capability status tracks pending/ready/failed/unavailable independently. Harness state is separately retained as READY/RUNNING/CHECKING/WAITING_HUMAN/COMPLETED/FAILED/CANCELLED; there is no neutral PARTIAL terminal state. A completed declared contract can yield honestly partial product coverage. WAITING_HUMAN maps to an operator-visible attention state, never automatic approval.

1. Validate identity/input; stage private durable originals and commit product revisions/work intent plus real-resource admission. Acknowledge only a recoverable accepted intent.
2. Construct immutable `prism.collection_analysis/1` Goal from artifact references, revisions/config/code hashes, finite ordered batches, allowed effects, units, and host VERIFY tasks. Never serialize original image bytes into Goal input.
3. Serialize run creation/linkage per intent on the execution host. Call Harness.start, persist run linkage, and reconcile any crash between the two stores. Unlinked runs cannot dispatch callbacks; adopt a matching unused run or cancel inspected duplicate orphans.
4. Worker reloads current host policy and calls Harness.advance. The kernel persists admission/units/local ownership before invoking registered bounded callbacks. Tasks are sequential within one run; same-host concurrency across runs requires limits and representative testing.
5. Callbacks read scoped inputs and produce bounded results or reversible host-allowlisted staged artifacts with declared CANDIDATE_WRITE. VERIFY returns actual `VerifiedResult` bound to request.goal_digest. Unknown execution holds the run; completed results are replayed from the checkpoint.
6. After checks, host rereads current collection/policy/artifacts/tombstones and atomically commits an idempotent current product snapshot keyed by job/capability/goal/output digest. A stale/late result cannot pass this bridge merely because its harness run completed.
7. Start separate `prism.creative_report/1` Goal from the current board/evidence manifest. Report outage/hold preserves committed board/search. Reconcile actual provider cost independently from retained harness declared units.

The implemented local release uses separate SQLite product and execution databases, each with its own transaction authority. Work-intent/run-link and result-commit recovery in TF05 is mandatory; no cross-store exactly-once guarantee is assumed. Trailforge's optional PostgresRunStore/dispatch/broker belongs to legacy Review and is not a generic backend for this profile.

For a crash/expired callback: advance retires the attempt as UNKNOWN/WAITING_HUMAN. Host inspects evidence/effects and applies explicit resolve_unknown(RETRY/CANCEL) only under current authorization, available attempts/units, real cost headroom, and whole-job deadline. Even PURE work is not silently reissued. Attempts and reservations remain consumed. Separate in-adapter transient retries, if permitted, have one finite provider-call budget and recorded attempts; they cannot mask ambiguous provider effects.

Set callback timeout below lease (proposed 60-second bound/90-second lease, maximum library lease 300 seconds). The kernel does not preempt Python or undo a provider call. Host supervises subprocess/provider duration, cancellation and the 10-minute job deadline. On deadline it cancels and preserves uncertainty. Whole-job timeout is not a harness lease setting.

Required FAIL is evaluated after the declared task sequence. Any later callback requiring a passed intermediate predicate checks its dependent verdict explicitly; final business commit is host-gated. Terminal replay does not recheck current source/policy, so host delivery always revalidates current authority. Deleted evidence leaves active retrieval immediately; purge remains an explicit host lifecycle task.

## 6. Retrieval and aggregation

Use normalized image vectors and same-version CLIP query vectors. Candidate retrieval is restricted to authorized, nondeleted ads for the requested collection/snapshot before scoring. Reject dimension/model mismatches. Rank exact similarities at the initial <=100-ad envelope; deterministic tie-breaking uses ad ID.

For visual grouping evaluate average-linkage cosine clustering with development-tuned threshold; leave singletons and undersized collections explicit. A numeric threshold is not specified until E02. Preserve sorted member identities/config to reproduce grouping. User group labels override display metadata, not the underlying vector truth.

Messaging tags overlap across groups. Offer/hook counts are code-computed over eligible ad variants and identified source-copy records. User corrections are versioned annotations with explicit provenance. Evidence selection includes representative and minority examples; limit the prompt to at most 20 ads and 12,000 input tokens initially, with visible coverage. Long copy is bounded/chunked with span provenance; CLIP text tokenization cannot silently discard long input and pretend full coverage.

Generator returns the prescribed schema only. Validate references, authorization, currentness, exact aggregates, experiment cardinality/distinctness, and forbidden performance claims. Semantic support needs human/adjudicated checks in evaluation; a reference resolver alone does not prove an observation true.

## 7. API and adapter boundaries

Proposed API surface, with exact route names finalized in T11:

| Operation | Contract behavior |
|---|---|
| Create/list/get collection | Principal-scoped; no arbitrary workspace chosen by client |
| Upload batch + copy manifest | Durable job ID, per-file results, idempotency, bounded input |
| Get job/board/report | Visible capability status, coverage, snapshot revision, limitations |
| Search collection | Query + filters + snapshot/current revision; permissioned results |
| Edit copy/rename group/review report | `expected_revision`, authenticated actor, new annotation/revision |
| Reanalyze/retry/cancel | Bounded job semantics and resource admission |
| Delete ad/collection | Tombstone first; explicit purge status; cross-scope denial |
| Retrieve artifact | Scoped access check or short-lived private URL; no public bucket |

Core ports: ImageEncoder.encode_images/encode_query; TextReader.read; MessageExtractor.extract; Clusterer.group; Retriever.search; ReportGenerator.draft; RecordStore transactional domain operations; ArtifactStore stage/commit/read/delete; WorkflowRunner start/inspect/advance/resolve/cancel; ResourceAdmission reserve/reconcile. TrailforgeWorkflow implements WorkflowRunner and translates native Goal/Task/VerifiedResult; Trailforge imports stay in the outer adapter. Its local artifact port has put/get only, so Prism's lifecycle adapter adds deletion/quota behavior rather than claiming those methods exist upstream.

Adapters expose actual unsupported capabilities, timeouts, version IDs, and usage. Dependency direction: UI/API and infrastructure -> application services -> core domain/contracts. Core never constructs a provider SDK, SQL client, HTTP framework, or tracing vendor. Compose concrete adapters at application startup.

## 8. Full source-module disposition

The framework preserves 20 internal modules plus frontend and migrations. These are responsibilities, not a demand for 22 packages or services.

| Source entry | Prism disposition / initial location |
|---|---|
| agents/ | Deferred specialist reasoning; ordinary processors in application workflow |
| api/ | Collection/job/search/report/correction endpoints |
| auth/ | Identity resolution and scoped access policy |
| core/ | Domain invariants, ports, errors |
| data/ | Decode/normalize/copy mapping/dedupe/revision lifecycle |
| database/ | Product records/work intents/run links/annotations/real-cost reservations; Trailforge SQLite authority handled by outer workflow adapter |
| economics/ | Resource admission and usage attribution, combined application/repository code |
| evaluation/ | Frozen fixtures, labels, metrics, fault/security graders |
| hitl/ | Draft review and correction services/UI; no external-action approval engine needed |
| integrations/ | Conditional OCR/generation provider and artifact adapters |
| job_queue/ | Host durable work wakeups; consumers reload linked Harness authority; legacy Review dispatcher not reused |
| memory/ | Scoped retrieval/context selection; persistent conversational memory deferred |
| models/ | Typed domain schemas; trained weights live in artifacts, not this schema name |
| observability/ | Injected event/span/usage hooks and operator queries |
| orchestrator/ | TrailforgeWorkflow and host product profiles/bridge; finite tasks; Develop composition in separate developer plane |
| prompts/ | Versioned bounded extractor/report prompts if E03/E04 justify them |
| reliability/ | Host deadlines/effect inspection/bridge recovery and explicit UNKNOWN resolution; reuse kernel checkpoints/local leases/attempts |
| security/ | Authorization/decoding/privacy/provider/egress policies |
| tools/ | Constrained inference and OCR ports; shell/browser tool access excluded |
| webhook_receiver/ | Batch ingress combined with API; external webhooks not applicable |
| migrations | Versioned schema/index/config backfill; deletion-safe rebuild |
| frontend/ | Collection/upload/board/detail/search/report/review screens |

Dedicated training, feature-store, model-registry service, multi-agent merger, public publishing adapter, and ad-platform clients are omitted for MVP. Their responsibilities are reconsidered only for new scope or measured need.

## 9. Deployment and operational changes

Initial deployment boundary: web frontend/API, one execution host with persistent Trailforge neutral SQLite authority, measured bounded local workers, product DB, private artifacts, and encoder runtime. The local stack is selected in ADR-10: FastAPI, vanilla JavaScript, separate SQLite databases and local CPU CLIP; exact dependencies are in requirements.lock. CPU/GPU feasibility and cold start remain measured concerns. Horizontal/distributed generic execution is deferred until an appropriate authority implementation is separately designed and tested.

Release unit also binds Trailforge commit/version, adapter implementation/config hashes, Goal-construction manifest, and neutral protocol. Back up product truth, authority, run links and artifacts consistently; use SQLite backup API or quiescent snapshot for active authority. Retained usage cannot be reset by restore or file replacement. Restore reapplies deletion tombstones before serving. Compatible rollback tests old-run reconstruction as well as product schemas/derived state; a changed Goal or adapter identity gets a new run, not rewritten checkpoints.

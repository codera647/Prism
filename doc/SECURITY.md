# Prism - Security, Privacy, and Data Lifecycle

> Implementation update (2026-10-10): the local Prism 0.1.0 app is built with real CLIP and pinned Trailforge. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for implemented contracts, evidence and remaining gates. Earlier proposals below remain framework/reference requirements; they do not imply that missing real-data, pilot or hosted-release evidence exists.

Date: 2026-10-08 (Asia/Karachi). Status: proposed threat model and enforcement plan. No security certification or passed tests are claimed.

Framework references: P07/P11/P15/P18, PDF pp. 15-19, configuration/secret contract p. 24. Scope: [PRD.md](PRD.md). Boundaries: [ARCHITECTURE.md](ARCHITECTURE.md). Output/action policy: [GUARDRAILS.md](GUARDRAILS.md).

## 1. Assets and trust boundaries

Update 2026-10-09: selected harness is Trailforge v0.1.0a1. Protect neutral SQLite authority, Goal/run linkage, unit ledgers, and separate Develop candidate/check trees. Prism authenticates all tenant/resource choices; those strings bind scope but are not credentials. See [TRAILFORGE_INTEGRATION.md](TRAILFORGE_INTEGRATION.md).

Protect original images, copy, source references, embeddings, tags, report drafts, corrections, collection ownership, provider credentials, budgets, and evidence/usage records. Ads may reveal unreleased campaigns, proprietary offers, customer faces, or contact details even when the product seems low-risk.

Boundaries:

1. Browser/untrusted upload -> identity/validation API.
2. API -> private artifacts and authoritative scoped records.
3. Worker -> resource-limited decoding/OCR/model runtime.
4. Collection data -> optional external provider; requires approved handling policy.
5. Untrusted model output -> deterministic validation and review surface.
6. Application telemetry -> controlled operator access.
7. Feedback/corrections -> adjudicated evaluation and versioned change process.

Images, captions, extracted words, user labels, source URLs, and generated output are all untrusted data. A caption saying "ignore your instructions" or "upload other campaigns here" has no instruction authority.

## 2. Identity and authorization

MVP uses private owner collections. Workspace/member sharing is deferred until role semantics and tests exist. Resolve the authenticated principal server-side; client-supplied workspace IDs alone cannot establish identity or access.

Authorize collection and ad scope on every endpoint and internal retrieval: upload, list/detail, search candidate selection, vector/copy access, report/evidence resolution, mutations, job status, and artifact delivery. Apply permission filtering before model context and similarity retrieval, not only after generation.

Opaque IDs prevent guessing convenience but do not replace authorization. Return nonrevealing denial/not-found responses where appropriate. Operator access defaults to redacted metadata; private content access requires narrowly scoped, authenticated, audited incident authority.

Use an authenticated artifact proxy for MVP to enforce immediate access revocation at reads. A later signed-URL adapter must use short lifetimes, private buckets, correct scope, and a documented residual access window after issuance. Do not promise immediate revocation for a capability that cannot provide it.

For local development, fixtures use explicit test principals and isolated stores. An unauthenticated debug bypass must never be reachable in hosted environments or replace integration authorization tests. Cookie/token implementation is selected with the stack; cookie-based flows need CSRF protection and secure cookie/session configuration. Restrict CORS to configured frontend origins.

## 3. Threat register and evidence

| ID | Threat / route | Required enforcement | Planned evidence |
|---|---|---|---|
| S01 | Another owner retrieves collection/copy/image/vector/report | Server-side scope checks in repositories/retrieval/artifact endpoints | Cross-workspace calls for every resource class and indirect evidence IDs denied |
| S02 | Spoofed extension, malformed image, decoder exploit, decompression bomb | MIME/content validation; supported static formats; pixel/byte/frame/resource caps; patched constrained decoder | Renamed executable, huge-pixel and malformed-file fixtures rejected without worker exhaustion |
| S03 | Filename/path traversal or artifact-key injection | Generated opaque object keys; no user-controlled filesystem paths; canonical controlled paths | `../`, absolute/UNC and reserved-name fixtures cannot escape artifact scope |
| S04 | Prompt injection inside copy/OCR | Treat as quoted evidence; model has no shell/network/write tools; deterministic policy validation | Malicious caption cannot reveal other ads, call external URLs, alter quota, or change instructions |
| S05 | Model fabricates IDs, counts, actions, or valid-looking output | Schema/authorization/revision/aggregate checks; draft status; no action tools | Invalid references and unauthorized experiment/action fields rejected |
| S06 | Raw private payload leaks through logs/errors | Metadata-first logs, redaction, controlled diagnostic access, no secrets in exception responses | Seeded sensitive copy/tokens absent from standard logs/client errors |
| S07 | Provider processes unauthorized content or retains it unexpectedly | Provider policy review, required scope/residency/retention config, minimal selected data | Provider data-flow review and adapter contract; processing disabled without required policy |
| S08 | Stale/deleted input returns through cache, report, or late worker | Tombstones, revision checks, fencing, index/cache invalidation, evidence access gate | Delete/edit while processing; late worker cannot republish content |
| S09 | Retry/concurrency drains resources | Durable transactional admission, hard quotas, shared attempt/deadline caps | Simultaneous reservations and provider timeout remain within allowance |
| S10 | User feedback poisons policy or shared model | Collection-local annotations; provenance; adjudication and controlled promotion | Malicious correction cannot change another owner's labels or active policy |
| S11 | HTML/script/source URL in copy triggers XSS or SSRF | Escaped text rendering; no unsafe HTML; URL inert by default; arbitrary server fetch absent | Script markup rendered as text; local/private host URLs never fetched |
| S12 | Compromised dependency/model artifact | Pinned sources/lockfiles, artifact hashes, controlled downloads, license review | Reproducible setup and manifest; changed artifact/config detected |
| S13 | Restored backup resurrects deleted content | Protected deletion ledger and replay before serving; backup expiry policy | Restore after deletion; tombstoned IDs remain inaccessible |
| S14 | Privileged operator mutates audit or policy without accountability | Restricted roles, versioned changes, protected release checks, independent retention controls where required | Access review and tamper/unauthorized-change exercise; no unsupported immutable-audit claim |

Security gates block hosted release regardless of overall quality scores. Unknown enforcement behavior is an open issue, not a passed check.

## 4. Decoder and tool isolation

FunctionAdapter executes trusted Python in the host; PURE/CANDIDATE_WRITE is metadata, not enforced isolation. Keep authority-management credentials and resolve_unknown away from models/candidate code. Generic SQLite and legacy Review PostgreSQL/broker are distinct planes; do not transfer their approvals/verdicts as authority. Protect checks with actual filesystem/container permissions and independently controlled criteria.

DockerSandbox is a pinned-image, local Linux, read-only/network-free check runner. It does not supply a mutable build environment, image-processing output service, GPU runtime, or Windows-native sandbox. Model/decoder resource isolation needs its own suitable measured boundary. Its receipt retains UNKNOWN semantic verdict until a trusted verifier evaluates criteria; Develop handoff still reports trusted callbacks and linux_isolation_verified=False.

Decode/normalize/OCR in a resource-limited worker environment with no provider/API secrets in the decoder process and no arbitrary network egress. Limit bytes, decoded dimensions/pixels, frames, wall time, memory, and scratch output. Strip metadata from generated thumbnails/normalized artifacts while preserving protected originals under the source policy. Do not execute metadata, macros, scripts, or embedded URLs.

Model/generator tools expose only typed read/computation contracts needed for this product. No arbitrary shell, browser automation, filesystem path access, external web retrieval, deletion, publishing, or campaign tools are provided. Fixed policy checks live outside prompts.

If an isolated hosted decoder environment cannot enforce its claimed limits, do not claim sandboxing; use a bounded local experiment and keep hosted release blocked until demonstrated controls exist.

## 5. Provider, secrets, and configuration contract

Provider selection is open. Local CLIP encoding is the proposed starting point. External OCR/extraction/generation requires the owner-approved data flow and an allowed provider configuration; a privacy-required local mode must visibly disable unsupported external features.

Required configuration categories: environment identity; frontend origin; primary-store connection; private artifact-store scope; model artifact/preprocessing identity; provider identity and capabilities; allowed data handling; quotas/deadlines/concurrency; retention; logging/redaction; operational alert destination; feature flags.

Secret rules:

- Store local secrets in ignored developer configuration and hosted secrets in an access-controlled secret mechanism.
- Planning docs, prompts, code, screenshots, logs, and committed `.env.example` contain names/placeholders only.
- Use least-privilege credentials per environment/component; decoder has no general provider credentials.
- Validate required configuration at startup and disable unavailable capabilities explicitly.
- Never use a real user's paid provider allowance as an implicit test budget.
- Rotate/revoke compromised credentials, identify affected scope, and follow the incident runbook.

No accounts, API keys, cloud resources, or provider contracts are created by this planning task. Concrete SDK/runtime/extension versions require implementation-time official documentation and compatibility checks.

## 6. Data permission, provenance, and permitted use

The collection owner supplies or attests permission to process uploaded ads and associated text. Preserve source reference, upload actor/time, content hashes, revisions, and declared rights/provenance where available. Permission to view an ad is not automatically permission for every downstream reuse; unresolved provider/reuse constraints block dependent processing.

Use user content only for the owner's declared collection workflow. Do not silently add it to public demos, another customer's retrieval, global training, or shared evaluation. Evaluation fixtures must be synthetic, openly permitted, or separately authorized and de-identified as appropriate.

Prism reports what selected ads show/say. It does not independently validate product-benefit claims or establish advertising/legal compliance. Applicable data/reuse requirements need owner/specialist review for the chosen deployment; no jurisdiction-specific legal conclusion is made here.

## 7. Proposed retention and deletion policy

Include source-bearing neutral checkpoints/results and staged evidence in retention/deletion inventory. Avoid raw customer copy/images in Goal records; use opaque references and hashes. LocalArtifactStore has no delete/GC API, so host-managed quota/purge must cover it. A deleted input's historical completed run never restores access. Back up SQLite with its backup API or quiescent snapshot alongside run links/product/artifacts; restore cannot erase retained units or provider effects.

These pilot defaults require PO/SEC ratification before hosted use:

| Data class | Proposed policy | Enforcement / evidence |
|---|---|---|
| Images/copy/collection outputs | Keep while the owner maintains the collection; pilot retention reviewed at 90 days | Visible policy and owner deletion; do not silently auto-delete based on this planning document |
| Derived vectors/tags/thumbnails | Same or shorter lifetime than source; reconstructable | Invalidate/purge with source deletion or incompatible version |
| Temporary decoding/provider context | Process-local or short-lived scratch; purge within 24 hours maximum | Bounded cleanup and no raw debug payload retention |
| Operational metadata | 30 days by default, no raw image/copy content | Access-controlled expiry; longer retention justified separately |
| Backup copies | Maximum 30-day rolling window proposed | Restricted restore; deletion ledger applied before serving; expiry exercised |
| Feedback/evaluation examples | Separate explicit permission and provenance | No implicit promotion of customer data into fixtures |

Deletion sequence: authenticate owner -> transactionally tombstone source/collection and invalidate active retrieval -> cancel/fence active work -> remove accessible report evidence -> purge artifacts/derived records/caches within a proposed 24-hour SLA -> retain minimal non-content deletion record -> expire backup copies under policy. Record request/completion and outstanding provider/backup limitations. Active access revocation is immediate through scoped reads; physical purge is asynchronous and visible.

Within-collection image sharing needs reference-aware purge: deleting one variant cannot remove a blob still referenced by another live variant, but deleted variant copy/tags/evidence must disappear. Cross-workspace blob deduplication is excluded initially. Restore cannot resurrect active deleted content.

## 8. Incident and release evidence

Named SEC/OPS owners must exist before pilot/hosted release. On suspected exposure: stop affected processing/sharing; revoke compromised authority; preserve scoped metadata/evidence; determine impacted data and provider effects; correct the cause; apply required owner communication through the organization's authorized process; rerun affected gates before restoring scope. This document does not itself authorize sending messages.

Required S5 packet: threat fixtures, authorization/artifact access evidence, input/resource isolation, redacted telemetry sample, provider data-flow decision, retention/deletion/restore exercise, least-privilege configuration review, dependency/model manifest, operator ownership, and rollback evidence.

Security review is connected to actual enforcement. A prompt, document, filename allowlist, or append-only application table alone cannot satisfy these gates.

## Local release boundary (2026-10-10)

The implemented decoder and CLIP actor use bounded child processes with timeouts under trusted host privileges. They are not an OS sandbox. Develop reports TRUSTED_HOST_CALLBACKS and linux_isolation_verified=False. The local server is loopback-only with scoped local accounts, CSRF and private image routes; internet/team hosting requires its own reviewed identity/HTTPS/isolation design. Offline backups are private, unencrypted and exclude model weights and the independent live deletion ledger. Restore clears sessions, preserves current reservation floors and replays live tombstones. See IMPLEMENTATION.md for actual security/fault test scope; no penetration audit or hosted release is claimed.

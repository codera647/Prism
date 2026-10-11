# Prism - Trailforge Adoption and Agent Setup

> Current campaign research / Gemini / UI extension: [Prism 0.3 specification and framework mapping](RELEASE_0_3.md). Earlier sections below remain historical baseline records.


> Current 0.2 desktop/browser scope and verification: [release record](RELEASE_0_2.md), [deployment architecture](DEPLOYMENT.md). Earlier local-only implementation sections below describe the 0.1 baseline; open human/quality gates remain open.

> Implementation update (2026-10-10): the local Prism 0.1.0 app is built with real CLIP and pinned Trailforge. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for implemented contracts, evidence and remaining gates. Earlier proposals below remain framework/reference requirements; they do not imply that missing real-data, pilot or hosted-release evidence exists.

Updated: 2026-10-09 (Asia/Karachi). Status: harness selection is user-directed; Prism integration is planned, not implemented. Six limited source-checkout checks passed on 2026-10-08; no model-quality or deployment claim follows.

## 1. Study sources and selected baseline

The user explicitly selected Trailforge as their agent harness. Use release `v0.1.0a1`, source commit `fbefaf40fb39a1429dcc328184372214f9fd849d`, source tree `cfe3cbc5b6317fa58d3154785d6f4538250039da`. The repository's observed default-branch HEAD was `2cd1cf8b1443277d2711870e55009c6014818c81`; this plan deliberately targets the release matching the supplied guide, rather than assuming branch compatibility.

Sources studied:

- User-supplied 46-page technical/user guide: `F:/Diffwise/output/pdf/Trailforge_Technical_Reference_and_User_Guide_v0.1.0a1.pdf`, dated 8 October 2026.
- [Tagged source](https://github.com/codera647/Trailforge/tree/v0.1.0a1), especially runtime.py, ports.py, store.py, develop.py, artifacts.py, telemetry.py, publication.py, optional adapters, examples, tests, and package metadata.
- A read-only reference checkout in an OS temporary directory. It is not a Prism dependency installation or a fork of Trailforge.
- [Local check report](../output/evidence/trailforge/reference-checks.json) and [reproduction script](../output/evidence/trailforge/verify_reference.py).

The guide's code/setup recipes are reference material. They did not authorize paid calls, cloud setup, publication, account creation, or communicating with others. Tagged implementation resolves API questions. Historical tagged Markdown notes can lag release evidence: for example embedding.md describes Linux checks as preparation while the supplied guide records later release conformance. Neither is represented as a Docker test performed for Prism.

## 2. Two distinct uses

**Prism's product runtime:** use `trailforge.runtime.Harness`, `Goal`, and `Task` for the finite collection-analysis and report workflows. Prism registers its actual ML/tool/verifier adapters and owns customer identity, source permissions, UI, business records, model quality, actual spend, and operations.

**The user's coding agents:** use `trailforge.develop.Develop` around a bounded implementation milestone. PLAN, RESEARCH, BUILD, DEBUG, VERIFY, HEALTH produce a candidate/check-bound handoff. The host supplies coding-agent/model/tool callbacks and protected checks. This use has separate developer identity, authority files, candidate workspace, and resource allocation from customer ad-analysis runs.

The fixed `OfflineController`/CLI Review profile is a harness demonstration. It is not Prism's production agent and its security/correctness/tests/documentation mock roles are not Prism specialist agents. Choosing Trailforge does not require multiple agents or LangGraph.

## 3. Implemented capability and Prism responsibility

| Released capability | What Prism uses | What remains in the host |
|---|---|---|
| Finite Goal/Task runtime | Ordered scoped tasks and required verifier IDs | Construct immutable collection/policy/model manifests and sensible acceptance predicates |
| SQLite checkpoints/CAS/journal | Resume and inspect exact runs; local attempt ownership | Persistent private paths, backup, access controls, host clock, product-record linkage |
| Declared-unit admission | Per-goal and same-authority tenant/global limits | Provider token/time/spend limits, measured cost, billing reconciliation, storage/concurrency limits |
| UNKNOWN hold | Preserve uncertainty and admitted usage | Authorized inspect/retry/cancel policy and operator UI; no blind reissue |
| Typed VerifiedResult | Host PASS/FAIL/UNKNOWN bound to goal digest | Real count/source/coverage/currentness/quality predicates; model JSON cannot mint verdicts |
| LocalArtifactStore | Small scoped evidence/derived artifact receipts where useful | Originals, thumbnails, aggregate quota, retention/deletion, authentication, encryption/object storage |
| RetrievalPort / LocalRetrieval | Preserve scope/revision/evidence discipline | CLIP semantic search and collection ranking; bundled retrieval is literal text lookup |
| Develop | Scoped coding milestone, protected-check/candidate continuity | Actual agent callbacks, independently administered criteria, human review, controlled promotion |
| DockerSandbox | Optional Linux checks on a pinned preloaded image | Suitable ML/decoder/check environments and real isolation evidence; no generic build environment or GPU service |
| JsonEventSink | Minimal approved execution-event projections | Emit wiring and separate redacted latency/cost/evidence metrics; six-field event schema cannot be extended arbitrarily |
| GuardedPublisher | Deferred for future actual external actions | No campaign/publish action in current product; real execute/inspect/live identity policy needed if added |
| Legacy PostgreSQL/dispatch/broker | Not used for neutral Prism runtime | It supports fixed Review contracts, not generic Goal/Task storage |

## 4. Architecture and authority ownership

```text
Prism web UI -> authenticated API -> Prism application services
                                      |
                        Product records + accepted work intent
                                      |
                   TrailforgeWorkflow adapter / host supervisor
                                      |
               finite Goal -> Harness -> SQLite execution authority
                                      |
                 registered ML / TOOL / VERIFY adapters
                                      |
                   scoped staged result/evidence artifacts
                                      |
                host revalidation + idempotent product commit
                                      |
                   board/search/report draft + human review
```

Product DB owns collections, ownership, input revisions, accepted work requests, approved annotations, current output references, monetary limits, and deletion. Trailforge SQLite owns neutral run/tasks/attempts/receipts/journal/declared units. Product tables hold run IDs and projections, not an independently advancing copy of harness task state.

Start with one execution host and one persistent neutral authority file shared by product analysis/report runs. Runs for different scopes can coexist; tenant/global declared totals are shared only within that file. Coding Develop uses a separate authority/accountability plane. Two local run consumers are a measured option, not distributed authority. Do not put authority on a presumed-safe shared network file or claim generic PostgreSQL/distributed fencing.

If Prism's product DB is PostgreSQL, the neutral runtime still uses SQLite. Transactions cannot atomically cover both stores. The host therefore implements a durable work-intent/reconciliation bridge:

1. Stage durable inputs and transactionally save a unique accepted work intent plus exact Goal-construction manifest and real-resource allowance. Acceptance means the host can recover that intent.
2. Under single-host creation serialization, revalidate scope/revision, start the matching Goal, and link its run ID. Search matching persisted bindings when a crash occurs between start and linkage. Unlinked runs must not dispatch adapters. Duplicate unexecuted runs are inspected/cancelled, not both executed.
3. Advance only a linked, currently permitted run. Store small result references; adapters may write only host-approved reversible staged artifacts when declared `CANDIDATE_WRITE`. They do not publish current business truth.
4. For completed required predicates, reread actual referenced artifacts/current collection/policy/deletion before an idempotent product transaction keyed by job/capability/goal/output digest. CAS the expected collection revision.
5. Recover a crash after product commit by observing that exact committed result; recover before commit by validating and retrying the host commit. This is host local-state persistence, not a neutral `EXTERNAL_WRITE` adapter or provider publication.
6. Retain raw harness status and coverage even if the product outcome is partial or stale. Product completion is not inferred from CLI exit code, a callback reply, or replayed terminal state.

This bridge, safe orphan handling, and consistent recovery must be implemented/tested in TF05/T31. The harness supplies no cross-store exactly-once transaction.

## 5. Prism product profiles and adapters

Define at least two independently scoped goals so a report-provider hold does not disable a ready board:

| Goal/profile | Ordered work | Required host predicates |
|---|---|---|
| `prism.collection_analysis/1` | Input observation -> bounded image/copy batches -> visual groups/message tags -> exact aggregates -> checks | Source/revision binding, declared coverage accounting, vector compatibility, tag/value provenance, exact count units |
| `prism.creative_report/1` | Current board/evidence manifest -> selected context -> template/conditional generation -> report checks | Evidence authorization/currentness/support rules, exact counts, schema, three distinct supported experiments or explicitly partial output |

Model semantic usefulness remains subject to held-out/human evaluation. A predicate passes a specified invariant, not all possible creative correctness. Honest missing copy/asset errors can be a contract-valid partial analysis; UNKNOWN is reserved for unestablished execution/check outcomes.

Suggested adapter identities (all are future host implementations, not bundled Trailforge APIs):

| Adapter | Kind / effect | Bounded result |
|---|---|---|
| `prism.observe_inputs/<version>` | TOOL / SCOPED_READ | Exact scoped manifest and accessible input receipts |
| `prism.encode_images/<version>` | TOOL / CANDIDATE_WRITE if staging output | Artifact references plus compatible encoder/config identity and coverage |
| `prism.analyze_copy/<version>` | TOOL or MODEL / CANDIDATE_WRITE if staging output | Source-linked tags/extraction gaps, with provider handling outside model authority |
| `prism.group_visuals/<version>` | TOOL / PURE or explicit staged write | Group artifact/reference, selected representatives, exact member revisions |
| `prism.aggregate_patterns/<version>` | TOOL / PURE | Exact counts and denominators or artifact reference |
| `prism.select_evidence/<version>` | TOOL / SCOPED_READ | Selected source references/currentness and coverage |
| `prism.draft_creatives/<version>` | MODEL / PURE for result-only callback | Bounded draft JSON; provider usage/time is still a host concern |
| `prism.verify_collection/<version>` | VERIFY / SCOPED_READ | Actual `VerifiedResult` for independent collection predicates |
| `prism.verify_report/<version>` | VERIFY / SCOPED_READ | Actual `VerifiedResult` for independent report predicates |

PURE/CANDIDATE_WRITE metadata does not sandbox a callback or make a remote inference free. Adapter effects must honestly describe staged writes. Actual current-output commits are host operations after validation. Registered adapter IDs and task inputs bind code/config/model/prompt hashes because capability digests do not hash callback bytes.

Task data contains opaque artifact/input IDs, hashes, bounded metadata, and outputs. Keep raw images, arrays, long copy, large vectors, and credentials outside Goal JSON. The trusted adapter resolves authorized content; a generated ID/path is never enough to access it.

## 6. Limits that change the build

- A Goal has 1-128 ordered tasks, including required VERIFY tasks. It executes sequentially within one run. Use bounded batches at <=100 ads instead of one ML-plus-verifier pair per ad. Host concurrency across goals is a separate measured policy.
- Default adapter input/output bound is 65,536 bytes each; configurable maximum is 1,048,576. Serialized Goal has its own 1 MiB bound. Compute real encoded-byte size before admission; return artifact references. Prism's 500-character query is a host search contract, not the bundled LocalRetrieval's 256-byte limit.
- LocalArtifactStore defaults to 1 MiB/object, configurable up to 16 MiB. Its default cannot hold a 10 MiB original; retain originals in Prism's artifact service or explicitly select/test a compatible cap. It supplies no delete/garbage-collection or aggregate quota API.
- Harness lease is at most 300 seconds, default 30. Proposed integration uses a 90-second lease for bounded <=60-second callbacks, profiled before release. This is per attempt, distinct from Prism's 10-minute whole-job deadline. Runtime does not preempt callbacks or renew a long ML call automatically; adapters supervise duration, batches, cancellation, and provider requests.
- Callback exceptions/invalid output/expired attempts hold UNKNOWN. Even nominal PURE work is not automatically retried. Host explicit resolution preserves consumed attempts/units and checks current scope, observed effects, deadline, and monetary headroom.
- Per-task attempts are 1-3. Reservations are monotonic for admitted work; cancellation/retry does not refund them. Same-authority caps cannot be changed by reopening with new constructor values. Finite pilot caps need monitoring; any later cap/period lifecycle requires explicit tested host policy, not deleting or replacing authority to regain allowance.
- Required FAIL is evaluated after the declared sequence, not automatically at its task boundary. Later adapters inspect dependent verifier observations and current policy themselves; a failed or uncertain prerequisite cannot trigger work requiring it. Final authoritative commit stays host-gated.
- Neutral terminal replay does not recheck changing external predicates. Host rereads revisions, tombstones, permissions, and artifacts at delivery/commit; old completed runs cannot republish deleted ads.

## 7. Status and recovery mapping

| Harness observation | Prism interpretation / action |
|---|---|
| READY | Queued/eligible only if host admission and current policy allow |
| RUNNING | Processing; competing live attempt denied |
| CHECKING | Result/checkpoint recorded; pause does not mean approval or completion |
| WAITING_HUMAN | Needs attention; show preserved coverage and operator reason, never retry from model prose |
| COMPLETED / COMPLETE | Declared required predicates passed; host still validates current commit/delivery and reports actual capability coverage |
| FAILED | Required check failed; preserve useful previously committed capability results |
| CANCELLED | Stop new work; retain reservations and any uncertain provider effects |
| UNKNOWN task/check | Host inspects; explicit RETRY/CANCEL only when permitted and bounded |

Expected missing/unsupported inputs can be structured gaps rather than exceptions. Genuine provider response loss remains unknown, not a fabricated "no offer" result. If the whole-job deadline ends, the host cancels the run, preserves ambiguity, and surfaces partial/failed/cancelled product status as appropriate. Board availability and report availability are independent.

## 8. Coding-agent setup using Develop

For each small dependency-ready build milestone, the user-owned host supplies an explicit phase map for PLAN/RESEARCH/BUILD/DEBUG/VERIFY. Develop supplies HEALTH. Start with one round; up to three rounds must be predeclared. Only BUILD may declare/write `CANDIDATE_WRITE`; DEBUG diagnoses and supplies observations. A second BUILD round performs repairs, or a changed objective gets a new reviewed Goal.

CandidateWorkspace permits 1-128 canonical allowed paths, 256 KiB/file by default, at most 1 MiB/file. Tree hashing bounds are 512 entries/16 MiB by default. Use a narrow staged candidate, not the entire application checkout, uploaded collection, virtual environment, dependency directory, or authority DB. Protected criteria live in a separate nonoverlapping tree controlled by the trusted acceptance owner. Callback detection is not filesystem privilege isolation.

For a trusted verify callback, return `VerifiedResult` bound to that request's goal digest. To execute untrusted candidate checks, use an independently exercised Linux runner and interpret its receipt; exit zero alone is not PASS. The supplied Docker runner has read-only candidate/check mounts and no network, so dependency installation, mutable builds, image preprocessing output, or GPU inference are not automatically supported. Bake needed dependencies into a vetted image and keep larger/ML execution behind a separately tested host boundary where necessary.

Handoff requires current candidate/check continuity and explicitly reports `TRUSTED_HOST_CALLBACKS`, `linux_isolation_verified=False`. Do not relabel it as isolated execution because a custom check used Docker. Attach real runner evidence separately. Handoff is an inspectable artifact; applying files to Prism, merging, and deployment remain their own host/user-authorized actions.

## 9. Study checks and next integration gates

Six source-import checks passed using synthetic data: checkpoint resume/terminal replay; explicit UNKNOWN retry with retained units; rejection of verdict-shaped JSON; scope/external-effect admission denial; retained shared units with `monetary_guarantee=False`; Develop resume and rejection of a changed verified candidate.

They are not installed-wheel conformance, CLIP/provider tests, PostgreSQL/Docker tests, or Prism implementation acceptance. The referenced release reports in the guide are upstream evidence; this session did not rerun them.

New TF01-TF08 tasks in [TASKS.md](TASKS.md) cover dependency pinning, host smoke contracts, coding-agent setup, final product profiles, cross-store bridge, recovery, verifiers, and applicable release conformance. [BUILD_ORDER.md](BUILD_ORDER.md) integrates them into 21 steps and a 50-task sequence. All implementation tasks remain Planned.

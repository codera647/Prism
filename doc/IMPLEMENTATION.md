# Prism - Local Implementation Record

> Current 0.2 desktop/browser scope and verification: [release record](RELEASE_0_2.md), [deployment architecture](DEPLOYMENT.md). Earlier local-only implementation sections below describe the 0.1 baseline; open human/quality gates remain open.

Updated: 2026-10-10 (Asia/Karachi). Release: **0.1.0 local app**.

The user authorized completing Prism and synchronizing its GitHub repository. They have no ad images available. The implemented app therefore includes clearly labelled synthetic skincare creatives. Synthetic data demonstrates executable mechanics; it does not complete the framework's real-user, permitted-dataset, held-out quality, pilot or hosted release gates.

## What you can use now

1. Start the app using the [setup guide](../README.md), open `http://127.0.0.1:8000` and create a local account.
2. Choose **Explore a demo**, or create a board and upload JPEG, PNG or static WebP ads. Supply copy beside each image or in a `filename,copy` CSV. Missing copy remains missing.
3. Prism computes genuine pretrained CLIP embeddings on the CPU, groups similar visuals, and extracts English hook/offer tags with exact supporting phrases.
4. Browse the visual board, filter groups/tags, or search with descriptions such as **minimal skincare ads with product close-ups**. Group names are tentative and editable.
5. Inspect repeated patterns and three distinct experiment drafts when evidence is sufficient. Each draft links supporting ads. These are source-based templates, not advertising performance predictions.
6. Edit copy or correct tags, then refresh analysis. Review the exact current report, export JSON, or delete images/boards. Deletion immediately removes retrieval eligibility and purges local files.

## Implemented architecture

| Responsibility | Implementation |
|---|---|
| Browser interface | Responsive HTML/CSS/JavaScript served by FastAPI; no frontend build tool or remote asset dependency |
| Product truth | Separate SQLite WAL database: users, sessions, collections, input revisions, ads, jobs, annotations, corrections, audit and upload idempotency |
| Execution truth | Pinned Trailforge generic Harness with neutral persistent SQLite, separate collection-analysis/report Goals and registered host callbacks |
| Identity boundary | Local scrypt accounts, opaque hashed sessions, HttpOnly SameSite cookies, CSRF, trusted origin/host checks and owner-scoped API/artifact reads |
| Image ingestion | Byte/pixel/format/filename/mapping limits; bounded child decoder with timeout; opaque paths and metadata-stripped previews |
| CLIP execution | Supervised local CPU process, four Torch threads, finite startup/inference timeouts and normalized 512-dimensional vectors |
| Visual grouping | Cosine average-linkage agglomerative clustering with threshold 0.22, including singletons; CLIP-assisted tentative labels |
| Retrieval | Exact owner/current-collection vector comparison, provisional cosine floor 0.23, small normalized lexical bonus; full long-query token chunks |
| Copy analysis | English rules plus source-linked user corrections; exact spans, overlapping tags, explicit missing inputs |
| Reports | Deterministic aggregates and grounded templates; separate typed host verification; partial reports explain insufficient evidence |
| Operations | Single-host file lock, CLI doctor, offline backup/restore, independent deletion ledger and retained cumulative execution reservations |
| Coding agents | Separate Develop command adapter with bounded JSON stdin/stdout, staged BUILD allowlist and independently controlled VERIFY command |

This local architecture is the selected ADR-10 disposition. The application runs one loopback server with a background execution host. SQLite product and execution databases remain separate transaction domains. No generic PostgreSQL backend, distributed execution or hosted release is implied.

## Durable work and authority

Product jobs preserve accepted work intents and reconstruction identities. The host serializes native start/link operations, reconciles a crash between them, executes only the linked run and commits only verified outputs whose owner, input revision, runtime/model/policy identity and deletion state remain current. A completed kernel run can recover its interrupted product commit without repeating successful encoding. An interrupted analysis-to-report handoff is reconciled separately.

Native task attempts, leases, checkpoints and declared units stay authoritative in Trailforge. UNKNOWN requires explicit owner inspection and retry/cancel; it is never silently retried. Reservations and previous attempts remain consumed. Completion receipts establish execution integrity, not semantic quality or customer approval.

Current limits include 100 ad variants/board, 10 MiB/image, 40 MP/image, 1 GiB originals/board, eight images/encoding batch, 20 active product jobs, a 600-second job deadline, 90-second native lease and finite cumulative tenant/global unit caps. Decoder concurrency is two with a 20-second timeout. Limits are local admission controls, not paid-provider accounting.

Review binds both collection revision and exact report ID. Copy/tag changes invalidate derived output; group renames are display annotations. Deletion records are fsynced separately before product mutation. Active native runs are cancelled and late staged writes are purged. Offline restore replays live deletions, preserves higher current execution reservations, validates archive paths/database integrity and clears sessions. Backups are private and unencrypted; a new machine needs the latest deletion/authority history as well as the snapshot.

## Versions and model provenance

The validated host is Windows with Python 3.13.15. Direct and transitive dependency versions are frozen in [requirements.lock](../requirements.lock). The package declares Python >=3.11; other Python/OS combinations have not received this real-model/browser verification.

- Trailforge: `v0.1.0a1`, exact source commit `fbefaf40fb39a1429dcc328184372214f9fd849d`. Installed distribution metadata and six bounded installed-package mechanism checks were verified.
- Encoder: OpenCLIP `ViT-B-32`, OpenAI pretrained weights, QuickGELU, `open_clip/ViT-B-32/224/v1` preprocessing, normalized 512-dimensional vectors.
- Official model source SHA-256: `40d365715913c9da98579312b702a82c18be219cc2a73407c4526f58eba950af`.
- Converted tensor-only safetensors SHA-256: `431adb635d7a35aaaf5b70acf8738712c6f9ae30d08e17698c6f505c9a686fb8`.

Setup downloads the official immutable artifact, verifies the known hash, then converts that trusted TorchScript artifact into safetensors. Runtime uses the tensor-only artifact and verifies its hash. The first model download sends no ads/copy; subsequent image/search inference is local. There is no production test encoder fallback.

## Actual verification

| Check | Observed result | Scope |
|---|---|---|
| Automated suite | **28 passed**, 0 failed/skipped, 75.273 seconds | Deterministic test-only encoder plus actual Trailforge and real process-death fixture |
| Installed Trailforge checks | **6 passed** | Resume, UNKNOWN/units, typed-verdict boundary, scoped effects, shared caps and Develop continuity; not full upstream conformance |
| Real CLIP 30-ad demo | 30 variants, 18 unique images, three groups of 10; report has three experiments; 92.049 seconds cold end-to-end | Synthetic developmental skincare fixtures |
| Real CLIP 100-ad capacity | 100 variants, 23 unique images, three groups; three experiments; upload/decode 83.683 seconds, warm processing 71.345 seconds | Repeated synthetic families; single local workload, not a production load test |
| Five live search checks | 0.411-0.463 seconds; related query counts 27/13/10; unrelated query returned no matches; long query processed | Single observations, not a p95 guarantee or held-out quality score |
| Browser | Login, board, search, supporting patterns/experiments and responsive layouts inspected | 390px mobile and 1024px tablet widths; no horizontal page overflow after layout correction |
| Packaging | Wheel built with packaged web assets; browser script syntax and dependency consistency checked | Local environment; GitHub CI recorded separately |

The automated suite covers cross-owner reads/mutations, origin/CSRF denial, upload corruption/ambiguity and variants, exact copy spans, source corrections, stale revisions, idempotency/concurrent admission, typed verification and forged source/count denial, cancelled late callbacks, staged-artifact corruption, native process death/explicit recovery, cross-store crash windows, exact-report review, Develop candidate continuity and restore/deletion/reservation handling.

Evidence: [real-model smoke](../output/evidence/implementation/local-smoke.json), [installed harness checks](../output/evidence/implementation/installed-harness.json), [final verification](../output/evidence/implementation/verification.json), [browser screenshot](../output/evidence/implementation/prism-board.jpg). The reproducible real-model check is [scripts/verify_local.py](../scripts/verify_local.py); it creates synthetic boards and requires an already installed model. Detailed test source is in [tests](../tests).

## Framework status and remaining work

The 21-step/50-task framework is retained in [BUILD_ORDER.md](BUILD_ORDER.md) and [TASKS.md](TASKS.md). The executable local slice is delivered. Local implementation status does not ratify proposed acceptance targets or manufacture missing prerequisite evidence. Discovery and full stage signoff remain separate from the user's authorized mechanical build.

- No real ad dataset, permissions manifest, strategist observation, conventional baseline, held-out relevance/extraction/grouping scores or usefulness pilot was available.
- Retrieval/group thresholds are provisional development settings. Real-world quality, fairness across styles/categories and human review effort need representative permitted ads.
- Copy rules support English supplied text. OCR and a language-model generator are deferred; templates are the local no-paid-call disposition, without a claimed comparative E04 result.
- The Develop adapter is implemented and tested with controlled local commands. The user's actual PLAN/RESEARCH/BUILD/DEBUG/VERIFY commands and protected-check ownership have not been supplied, so their agents are not yet connected.
- Decoder/ML/agent child processes run with trusted local host privileges. Timeouts and separate candidate/check directories are not an OS security sandbox; `linux_isolation_verified=False` is preserved.
- Team identity, internet hosting, HTTPS/reverse proxy, paid providers, GPU deployment, ad-platform publishing and campaign execution are outside this release. The private GitHub repository contains source, docs and reviewed synthetic evidence; private runtime data/model weights/secrets are excluded.

## Next development order

1. Collect permitted representative ads and observe the actual strategist workflow; record source rights, supported language/categories and baseline time/relevance.
2. Freeze development and held-out cases. Run E01-E05 and ratify quality/no-match/latency targets before promoting provisional thresholds or promising advertising usefulness.
3. Supply the user's coding-agent command configuration and independently owned checks; exercise a real bounded Develop milestone and inspect its handoff.
4. Run a supervised pilot and measure reference usefulness, report support, correction/review effort and resource capacity.
5. If hosting is requested, choose identity/HTTPS/storage/operator/retention policies, complete load/security/restore/release gates and authorize that deployment separately.

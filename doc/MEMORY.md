# Prism - Project Memory and Continuation State

> Current 0.5 account system: [complete system design and rollout](SYSTEM_DESIGN.md), [implementation and activation gates](RELEASE_0_5.md). Green/gray dashboard and backend code are implemented; Google accounts require D1/OAuth configuration. Earlier sections are historical baselines.

> Current work: **0.4 layout replacement** following the user's supplied design-checklist video. User explicitly chose to retain all working features and confirmed Gemini was working before this request. Published on Pages and as Windows v0.4.0. 23 browser/source/DOM tests passed; core contracts and actual packaged CLIP passed in Actions. The installed 0.4.0 backend is ready and serves the exact tag assets; 12 live catalogue references and a valid image passed in web and desktop checks. Prior versions and data are retained. [Evidence](../output/evidence/implementation/ui-redesign.json). Browser-control runtime is unavailable, so do not claim screenshot/native visual QA. [Release record](RELEASE_0_4.md). Earlier missing-model/live-success notes below are historical.

## Gemini availability correction (2026-10-11)

Completed: Pages deployment, v0.3.1 Windows publication, and local installed-backend verification. [Patch evidence](../output/evidence/implementation/gemini-connection-patch.json) records source hashes, CI runs, release checksums and the local runtime-reuse method. 42 Python contracts / packaged-app checks passed in Actions; 21 browser regressions passed. Native UI visual inspection and live Gemini success with the private user key remain unverified.

0.3.1 replaces the two hardcoded Gemini 2.5 choices with direct models.list discovery and explicit Flash text model selection. The user reported a missing-model error; Google restricts some 2.5 projects to previous users. Discovery uses a private in-memory key in a header, runs no generation, and does not guarantee generation quota. New models omit deprecated generation settings. Grounding is separate from free text generation and now off until explicitly enabled per session. 21 local browser/source/DOM tests passed, including fixture 404 recovery; live Gemini success remains unverified with the user's private key.

0.3.0 Actions verified and published the Windows ZIP. The local install reused the verified 0.2.1 runtime plus exact 0.3.0 released source; its ZIP download stalled and was not used. The interrupted local version check produced no success record; do not claim the native UI was visually verified.



> Current work: **0.3.1 Gemini availability fix**. User tested the key and reported a missing model; the account-driven selection fix is published as 0.3.1 and live on Pages. Historical 0.3 status: User requested internet references for anti-frizz shampoo/Pakistan/Instagram, optional free-tier Gemini, chat and UI motion. User will enter a key privately in Prism; do not ask for a key in chat or reveal it. See [0.3 mapping](RELEASE_0_3.md). Live catalogue checks found 12 shampoo references; actual CLIP produced three groups, 12 shampoo matches and zero underwater matches (27.911 seconds). Cloudflare deployment `38118963618` succeeded. Windows release `38118976802` has published v0.3.0; final cleanup status and local installation are being verified. The user subsequently reported a missing-model error; live provider quality and UI visual inspection remain open; tools for browser control are unavailable this turn. Native Trailforge receipts continue to cover image/report workflows, not the optional client-side Gemini calls. Deployment/release status must be verified from Actions before claiming publication.


> Current 0.2 desktop/browser scope and verification: [release record](RELEASE_0_2.md), [deployment architecture](DEPLOYMENT.md). Earlier local-only implementation sections below describe the 0.1 baseline; open human/quality gates remain open.

Last updated: 2026-10-11 (Asia/Karachi).

## Earlier 0.2 desktop and hosted release evidence

- **Prism 0.2.1 is published:** https://github.com/codera647/Prism/releases/tag/v0.2.1 . Windows Actions run `38076811675` passed 32 contracts, assembled the isolated runtime, tested the actual packaged executable and published the ZIP/checksum. Released code commit: `b97ed18de052f59a1a4555b8f6ecb96aa8a7b89c`. The earlier v0.2.0 tag failed before publication; retain its history.
- **Cloudflare Pages is live:** https://prism-creative.pages.dev/ . Pages run `38076807066` succeeded. Browser CLIP uses pinned q8 ONNX weights and local IndexedDB; no server Trailforge receipts or cross-device sync. Account/project deployment credentials are private and ignored. Pages token expires 2027-01-09.
- **Installed app:** `%LOCALAPPDATA%/Prism/app/0.2.1/Prism.exe`; Desktop shortcut `Prism.lnk`; data `%LOCALAPPDATA%/Prism/data`. The native application was opened and its managed loopback backend verified. The Windows computer-use native pipe was unavailable, so do not claim a native-window visual inspection.
- **Real data checks:** 30 Google/Unsplash product photographs were downloaded, visually inspected, deduplicated and tested in browser CLIP and the packaged Python/Trailforge host. No authentic ad copy was available. Reports correctly remained partial; some group labels and retrieval results were wrong suggestions. Originals remain ignored; source/hash evidence is tracked. These checks do not complete held-out quality or real-user pilot gates.
- **Public browser UI:** real model inference, grouped synthetic demo, search, reload retention, source copy edits/reanalysis, exact review, deletion/reanalysis and downloaded JSON export were exercised. Current test demo has 29 creatives after deleting one synthetic fixture.
- See [release verification](RELEASE_0_2.md), [deployment guide](DEPLOYMENT.md) and `output/evidence/implementation/{desktop-release,desktop-real-smoke,browser-release,real-photo-sources}.json` for bounded evidence. Private test credentials are runtime-only; users create their own desktop account.

## 1. User intent and current authorization

Prism answers "Show me what all these ads have in common": 30-100 uploaded ad images/copy, CLIP visual grouping and natural-language retrieval, source-linked hook/offer analysis, pattern drafts and three distinct creative experiments. The user requested the framework documentation, a step-by-step build order, adapting it to their own Trailforge harness, GitHub setup/push, then **complete the project** and **continue**. They confirmed that they have no images available.

The local app, dependency setup/free model download, labelled synthetic fixtures, local verification/server and repository synchronization are authorized. Earlier planning-only scope was superseded by the explicit build request. The user subsequently authorized a Windows desktop release, free public hosting on Cloudflare and real-photo development checks. Paid inference, campaign execution and messages to other people remain outside scope. Do not ask again for routine authorized local edits/pushes.

## 2. Current workspace and app

- Workspace: `F:/Prism`, Windows PowerShell. No applicable AGENTS.md was found in F:/ or this workspace.
- App: Prism 0.1.0. Python/FastAPI, responsive vanilla JavaScript, separate SQLite product and execution databases, private files and supervised local CPU CLIP. Run from README; local URL `http://127.0.0.1:8000`.
- Source: `src/prism/`; tests: `tests/`; exact validated Windows/Python 3.13.15 versions: `requirements.lock`; CLI setup/start/doctor/model-download/backup/restore/develop.
- Runtime `.prism/`, virtualenv, models, private uploads, credentials and generated packages are excluded from Git. Retain execution authority and independent deletion ledger; never reset them to regain units or resurrect data.
- Two retained smoke boards belong to the synthetic verification account: a 30-ad demo and a 100-ad capacity fixture. Test credentials exist only in ignored private runtime data. New users can create their own account and choose Explore a demo.
- Trailforge pin: `v0.1.0a1`, commit `fbefaf40fb39a1429dcc328184372214f9fd849d`, reference tree `cfe3cbc5b6317fa58d3154785d6f4538250039da`. Generic product Harness and separate Develop planes are implemented. Actual user coding-agent commands/check ownership are not supplied.
- Private repository: [codera647/Prism](https://github.com/codera647/Prism), origin HTTPS, branch main. Determine latest committed/pushed state from Git refs rather than assuming a historical hash.

## 3. Framework and inventory

The framework PDF at `F:/Diffwise/output/pdf/Production_AI_Thinking_Framework.pdf` was read (29 pages, 167,748 bytes); it is the Production AI Design Compass / A Thinking Framework v1.0 prepared for Diffwise on 6 October 2026. It covers five working artifacts/design moves, eleven questions, failures, A0-A4, P00-P20, S0-S6, module responsibilities, ADRs and pre-build review. A referenced companion workbook was not found; no unseen template fidelity is claimed.

The Trailforge guide at `F:/Diffwise/output/pdf/Trailforge_Technical_Reference_and_User_Guide_v0.1.0a1.pdf` was read (46 pages, 255,864 bytes), with selected visual checks. Read-only source reference: `C:/Users/nexge/AppData/Local/Temp/Prism-Trailforge-v0.1.0a1-reference`.

Fourteen documents now live in doc: ARCHITECTURE, BUILD_PROMPT, BUILD_ORDER, DECISION, DESIGN, GUARDRAILS, IMPLEMENTATION, MEMORY, PLAN, PRD, RULES, SECURITY, TASKS and TRAILFORGE_INTEGRATION. The 21 build steps and 50 unique T01-T42/TF01-TF08 tasks remain the framework map; implementation updates preserve their original evidence requirements.

## 4. Actual evidence and stage limits

| Area | Actual state | Evidence / limitation |
|---|---|---|
| Local executable slice | Delivered | See [IMPLEMENTATION.md](IMPLEMENTATION.md) for features/contracts/setup |
| Product/host tests | 28 passed; zero failed/skipped | Privacy, invalid inputs, currentness, tampering, real process death, explicit UNKNOWN recovery, cross-store crash windows, exact-report review, Develop continuity and restore/deletion |
| Installed harness | Pin metadata plus six bounded checks passed | [installed-harness.json](../output/evidence/implementation/installed-harness.json); not full upstream conformance |
| Real CLIP | Synthetic 30/100-ad workflows passed | [local-smoke.json](../output/evidence/implementation/local-smoke.json); no custom training or paid calls |
| Browser/package | Responsive mobile/tablet inspected; wheel built | [verification.json](../output/evidence/implementation/verification.json), [screenshot](../output/evidence/implementation/prism-board.jpg) |
| S0/S1 full signoff | Open | No real workflow/baseline, permitted representative dataset or held-out quality |
| S2/S3 framework gates | Local mechanical implementation documented | Proposed targets/owners not fully ratified; synthetic evidence does not fill missing prerequisites |
| S4 pilot | Open | No actual strategist usefulness/review-effort measurements |
| S5/S6 production | Open | No hosted deployment/operator/release/incident signoff |

Source-model SHA-256 `40d365715913c9da98579312b702a82c18be219cc2a73407c4526f58eba950af`; converted tensor-only runtime SHA-256 `431adb635d7a35aaaf5b70acf8738712c6f9ae30d08e17698c6f505c9a686fb8`. Search floor 0.23/clustering threshold 0.22 are provisional local development settings. No p95, P@5, extraction F1, advertising effectiveness or held-out grouping result is claimed.

## 5. Next work and continuation rules

Read IMPLEMENTATION and current TASKS before modifying the working app. Preserve scoped product truth, independent native authority, hash/revision/currentness checks and deletion replay. Run relevant tests after substantive changes. Use the existing browser runtime binding if continuing browser inspection; no need to reconnect merely because a turn changed.

Next external evidence: permitted representative ads and user workflow/baseline; freeze held-out cases; run E01-E05/ratify targets; supply actual coding-agent argv/check configuration; supervised usefulness pilot; then separately scoped hosting/release work if requested. These missing inputs do not invalidate the user's already delivered local mechanical build.

Keep verified facts separate from proposals. Record real checks and population limitations; no secrets/private raw data in docs. Earlier dated verification below describes earlier states, not the current app.

## 6. Historical planning and study record

## 8. Session verification record

Documentation validation on 2026-10-08: the exact eleven requested Markdown filenames exist and are nonempty; all local Markdown links resolve; titles and code fences are intact; no unresolved TODO/TBD/PLACEHOLDER markers were found. Coverage checks confirmed P00-P20, Q1-Q11, S0-S6, ADR-01 through ADR-12, and unique ordered T01-T42 entries with owner/dependency/status/completion-evidence fields. All referenced task IDs exist. A final consistency check additionally verifies dependency acyclicity and the complete source-module/failure disposition inventory. These are documentation checks only; no application/model/security/performance test has run.

Follow-up build-order validation on 2026-10-08: all 21 numbered steps are present; their task mapping matches the exact 42-task sequence; each T01-T42 appears once in that sequence; every declared dependency precedes its task; local links and code fences across the twelve Markdown files pass structural checks. Application task states remain Planned.

## 9. Trailforge study record (2026-10-08 to 2026-10-09)

- Supplied guide: `F:/Diffwise/output/pdf/Trailforge_Technical_Reference_and_User_Guide_v0.1.0a1.pdf`, 46 pages, 255,864 bytes. Relevant full text was reviewed; pages 9/12/26/29 visually inspected.
- Read-only tagged reference checkout: `C:/Users/nexge/AppData/Local/Temp/Prism-Trailforge-v0.1.0a1-reference`; release commit/tree match the guide. Default HEAD observed separately, not used as dependency.
- Studied neutral runtime/ports/store/Develop/artifacts/telemetry/publication/optional adapters/examples/tests/package metadata. Some historical tagged docs lag guide release evidence; precise implementation behavior determines integration.
- Six synthetic source-import checks passed: resume/replay, explicit UNKNOWN retry with retained units, verdict-shaped JSON rejection, scope/external-effect denial, persistent nonmonetary shared caps, and Develop resume/changed-candidate denial. Report: [reference-checks.json](../output/evidence/trailforge/reference-checks.json). Reproducer: [verify_reference.py](../output/evidence/trailforge/verify_reference.py).
- No installation, provider/CLIP/model evaluation, Docker/Postgres/distributed/installed-wheel conformance, or Prism product acceptance was performed. Reference checkout is not application code/dependency setup.
- F: disappeared temporarily during edits and returned after the user selected restoration. Saved files were verified intact; continue using the restored workspace.
- Documentation verification on 2026-10-09 passed: all thirteen Markdown files have valid titles, balanced fences, and resolving local links; all fifty tasks have owner/status/completion-evidence fields; all 21 build-step mappings match the complete dependency-safe sequence; P00-P20 and all 22 module dispositions remain covered. The six limited source checks remain PASS. These checks do not complete implementation or product acceptance gates.

## 10. Memory update rules

Keep verified facts separate from proposals and assumptions. Link actual evidence and record its population/limitations. Store compact decisions and factual observations, not hidden reasoning. Never put secrets/private raw data here. Status changes require real work and matching checks. Update this file and affected TASKS/ADRs after each substantive build/evidence session.

## 11. GitHub repository setup (2026-10-09)

- The user explicitly requested .gitignore creation and pushing project changes to GitHub.
- Local Git repository existed with an unborn `main` branch and no remote. Authenticated GitHub account was verified as `codera647`.
- Created [codera647/Prism](https://github.com/codera647/Prism) with private visibility. Use `origin` at `https://github.com/codera647/Prism.git` and publish the local `main` branch.
- Root .gitignore excludes local secrets/config, dependency/build caches, uploaded ads, model/runtime artifacts, databases, and generated output. The existing synthetic study script/report under output/evidence/trailforge are explicitly retained so documentation evidence links remain usable.
- Publishing this documentation/evidence snapshot does not complete any product or agent-integration task. Future synchronization is determined from actual Git status and remote refs.

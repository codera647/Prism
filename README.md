# Prism

**Start with a product. Leave with a direction.**

Prism 0.3 adds **Campaign studio**: describe your product, Pakistan/global market, platform, audience and copy language; discover real product references, import selected photographs into a local CLIP board, and connect your own Gemini key for cited web research, three tailored creative concepts and a chat assistant. Enter the key privately in the app, never in chat. Click **Load available models**, choose a listed Flash / Flash-Lite text model, then connect. The key clears on refresh. [Workflow, architecture and boundaries](doc/RELEASE_0_3.md).

Try: **anti-frizz shampoo → Pakistan → Instagram → English + Roman Urdu → reference keyword: shampoo**. Catalogue photographs are labelled product references; their paid-ad status and Instagram delivery are unverified. Regional Ad Library links help check actual ads. Images remain device-side; optional Gemini calls send your brief and selected text to Google. For the free route use a Gemini project without paid billing; provider quotas apply. Google Search grounding is separate, unavailable on newer models' API free tier, and disabled until explicitly enabled in AI connection. Free product discovery and regional search links remain available.

Prism turns up to 100 static ad images and their copy into a private visual board. It uses local pretrained CLIP embeddings for visual grouping and natural-language search, extracts source-linked hooks/offers with English rules, and drafts three distinct creative experiments using evidence-based templates.

Trailforge `v0.1.0a1` runs separate analysis and report workflows, with durable checkpoints, typed verification, retained work units and explicit recovery. Your own coding-agent commands can connect separately through Trailforge Develop.

## Desktop and free website

Open **https://prism-creative.pages.dev/** for the browser app. It downloads a pinned CLIP model (~150 MB) on first analysis and processes images on your device. Boards stay in this browser; export before clearing site data. Keep this tab open while processing. Use current Chrome or Edge on a computer.

The Windows x64 portable package is built and tested by [GitHub Actions](https://github.com/codera647/Prism/actions/workflows/desktop-release.yml) and published as [Prism v0.3.0 on GitHub Releases](https://github.com/codera647/Prism/releases/tag/v0.3.0). Extract the entire ZIP, then open `Prism.exe`; keep its `_internal` folder beside it. The package includes Python, CLIP and Trailforge. Windows 10/11 and WebView2 Runtime are required. Its private data lives in `%LOCALAPPDATA%/Prism/data`.

Desktop and browser boards are separate. The website runs quantized CLIP in a browser worker and has no Python backend, Trailforge receipts, accounts or cloud synchronization. Desktop retains the full local Python/Harness workflows. Both use the same source-linked English copy rules. See [deployment architecture](doc/DEPLOYMENT.md) and [0.2 verification record](doc/RELEASE_0_2.md).

## Run on Windows

Python 3.11+ is required; this workspace was verified with Python 3.13.15 on Windows. About 2 GiB of free disk space is needed for the environment and CLIP. No API key, paid model call or cloud service is needed.

```powershell
cd F:\Prism
powershell -ExecutionPolicy Bypass -File .\setup.ps1
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

The scripts' execution policy applies only to that PowerShell process. Alternatively, use the direct commands below without running scripts:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
.\.venv\Scripts\python.exe -m pip install --no-deps -e .
.\.venv\Scripts\python.exe -m prism.cli model-download
.\.venv\Scripts\python.exe -m prism.cli serve
```

Open **http://127.0.0.1:8000**. Create a local account, then choose **Explore a demo** or create a board and add your images. The demo contains 30 synthetic skincare creatives with invented copy and illustrative testimonials. It verifies the workflow, not real-world advertising quality.

The first model download contacts the official OpenAI CLIP artifact host and verifies its SHA-256. No ad images or copy are sent. Once installed, image analysis and search run offline on your CPU in a supervised process. The model is a 354 MB download; actual setup time depends on your connection. Local model cold start is reported separately from warm processing.

## Using a board

1. Add JPEG, PNG or static WebP images (10 MiB/image, 40 MP, 100 ad variants/board).
2. Paste copy beside each file or choose/paste a CSV with exactly `filename,copy` columns. Filenames must match. Missing copy stays missing. Quoted multiline CSV fields are supported.
3. Analysis runs in the background. Refreshing the browser preserves work. Inspect **View progress** to see native task receipts, attempts and declared work units.
4. Browse tentative visual groups and rename them. Use messaging filters or search, for example **minimal skincare ads with product close-ups**.
5. Inspect a creative to edit its copy, remove an incorrect tag, or add a tag linked to an exact phrase. Changes create a new revision; refresh analysis to include them.
6. Open **Patterns** and **Experiments**. Check supporting ads before marking the exact draft reviewed. Exports download JSON locally.
7. Delete an ad or board when needed. It leaves retrieval immediately and local image files are purged. A separate deletion ledger prevents restores from republishing deleted content.

Exactly three experiment drafts appear when there are at least three ads and sufficient messaging evidence. Otherwise Prism displays a partial report with a specific gap. The app does not claim campaign effectiveness from images/copy and does not execute campaigns.

## Configuration and storage

See [.env.example](.env.example) for process environment variables. Prism does not automatically load `.env` files. Default private data lives in `.prism/`: product SQLite, separate Trailforge execution SQLite, model weights, private artifacts, staged results, hashed sessions and redacted execution events. These files are excluded from Git.

The supported runtime is **one local server process** on loopback. The CLI obtains a data-directory lock and prevents a second execution host. Authentication uses scrypt password hashing and HttpOnly SameSite cookies; mutations require a session-bound CSRF token. Collections, images, search, jobs and exports are owner-scoped. Uploaded copy is rendered as text; source URLs are never fetched.

Declared Trailforge units are cumulative, finite work reservations, not money or tokens. No monetary provider is enabled. UNKNOWN tasks require an owner to inspect before an explicit retry; previous attempts/units remain consumed. Do not delete or replace the authority database to regain allowance.

```powershell
.\.venv\Scripts\python.exe -m prism.cli doctor
```

For another local port, set `PRISM_PORT`. The CLI sets its expected origin accordingly. Hosting the full Python backend, team identity, GPU execution, isolated untrusted code, OCR, paid language models and ad-platform integrations are outside this release. The separately implemented browser app is hosted on Cloudflare Pages.

## Backup and restore

Stop the server first. Backups contain private ads, copy and account records; store them privately. They are not encrypted by this tool. The model weights and independent live deletion ledger are not included.

```powershell
.\.venv\Scripts\python.exe -m prism.cli backup F:\PrismBackups\prism.zip
.\.venv\Scripts\python.exe -m prism.cli restore F:\PrismBackups\prism.zip
```

Restore validates archive paths and product database integrity, keeps any higher current authority reservations, and replays the live deletion ledger before serving. Keep the current data directory and its deletion ledger. Restoring to a new empty machine cannot know deletions or reservations made after the snapshot; transfer the latest ledger/authority under an operator-reviewed process. Never serve an old snapshot as if it contains that missing history.

## Your coding agents

Copy [config/develop.example.json](config/develop.example.json) to ignored `config/develop.local.json` and replace its commands, candidate allowlist, milestone and protected checks. Configured commands are trusted local code. They receive a JSON request on stdin and return bounded JSON on stdout. BUILD returns a `files` mapping of allowed UTF-8 candidate files. PLAN/RESEARCH/DEBUG return observations; they cannot legitimately modify the candidate. VERIFY runs your independently controlled check command, which must return a boolean `passed` and nonempty `criteria` evidence.

```powershell
.\.venv\Scripts\python.exe -m prism.cli develop config\develop.local.json --pause-after 1:BUILD
.\.venv\Scripts\python.exe -m prism.cli develop config\develop.local.json --run-id <saved-run-id>
```

Candidate, checks and developer authority are separate from product execution. One to three rounds must be predeclared. HEALTH is supplied by Develop. A handoff verifies candidate/check continuity and reports `TRUSTED_HOST_CALLBACKS`, `linux_isolation_verified=False`; it does not merge or deploy. This adapter is ready for your commands; your actual coding agents were not supplied or connected in this session.

## Verify

```powershell
.\.venv\Scripts\python.exe -m pytest -q
node --check src\prism\web\app.js
```

Automated tests use an explicitly test-only encoder for deterministic fault and privacy checks. It cannot be selected in the app. Real CLIP results, timings and browser verification are recorded separately in [doc/IMPLEMENTATION.md](doc/IMPLEMENTATION.md). The original framework and 50-task backlog remain in [doc/BUILD_ORDER.md](doc/BUILD_ORDER.md); real-user, held-out model-quality and hosted release gates are not passed by synthetic tests.

## Implementation

| Area | Location |
|---|---|
| Contracts and invariants | `src/prism/domain.py` |
| Identity and product storage | `auth.py`, `store.py` |
| Upload validation / bounded child decoder | `media.py`, `decode_worker.py` |
| Local CLIP process and artifact verification | `encoder.py` |
| Copy evidence, grouping and templates | `analysis.py` |
| Trailforge profiles, crash linkage, host commit | `workflow.py` |
| API and responsive interface | `api.py`, `web/` |
| Coding-agent integration and offline operations | `develop.py`, `operations.py`, `cli.py` |

Technical references: [FastAPI uploads](https://fastapi.tiangolo.com/tutorial/request-files/), [OpenCLIP](https://github.com/mlfoundations/open_clip), [OpenAI CLIP](https://github.com/openai/CLIP), [Trailforge pinned release](https://github.com/codera647/Trailforge/tree/v0.1.0a1).

# Prism desktop and free web deployment

> In 0.3, Pages also deploys two bounded, read-only research functions. CLIP still runs on-device; no Python backend is hosted. Gemini keys are entered privately by users and are never deployment secrets. See [0.3 architecture](RELEASE_0_3.md).


The selected target is **Cloudflare Pages Free**, plus a Windows desktop release. Oracle was dropped because the user has no credit card. Hugging Face Docker hosting required a paid account. No paid plan or inference service is used.

## Two execution environments

| | Desktop | Cloudflare Pages |
|---|---|---|
| Interface | Native WebView2 window | Website in a modern browser |
| CLIP | OpenCLIP CPU, original verified weights | Transformers.js / ONNX q8 CPU in a browser worker |
| Execution | Python and pinned Trailforge Harness | Browser worker; no Python server or Trailforge receipts |
| Data | Private local SQLite and image files | IndexedDB on this device and site origin |
| Accounts | Local per-owner accounts | One device workspace, without accounts |
| Recovery | Durable Harness receipts, inspect/retry | Saved images; interrupted work needs explicit retry |
| Synchronization | Separate from hosted boards | No cross-device or desktop synchronization |

The browser model is `Xenova/clip-vit-base-patch32` pinned at commit `d15189d7028b43f1d3e65039190477f6af591c2a`. Quantized vectors and provisional similarity thresholds require separate evaluation. Uploaded image pixels/copy are processed on the visitor's device. External requests download the model from Hugging Face; model caching uses the browser cache. Cloudflare receives normal site requests, not uploaded ads.

## Web build and deployment order

1. Run `python scripts/export_browser_policy.py` from the repository root. It exports the exact declarative English hook/offer rules and six tentative visual labels used by Python.
2. In `browser`, run `npm ci`, `npm test` and `npm run build`. The build checks every asset against Pages' 25 MiB per-file limit; large model weights stay on the pinned model host.
3. Test actual browser inference, upload/copy handling, grouped board, search, sourced report, editing, review, deletion, reload recovery and export. One active tab owns the device workspace; mutations use browser locks and analysis commits check the saved revision. A page refresh never silently retries interrupted work.
4. Create a direct-upload Pages project named `prism-creative` with production branch `main` in the user's Cloudflare account. Preserve other existing Cloudflare applications.
5. Configure GitHub Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token has **Pages Write only** on the selected account and expires **2027-01-09**. Rotate it before expiration to keep deployment working. Token values and local credentials remain ignored.
6. Push browser changes to `main`. [Deploy Cloudflare Pages](../.github/workflows/pages-deploy.yml) verifies policy export, installs the npm lock, runs tests, builds assets and deploys the exact commit through Wrangler. A workflow file is not proof of publication; record the successful run and inspect its live HTTPS URL.
7. Verify the published app with actual browser CLIP, including its model download under the deployed security policy. Export JSON before clearing site data. Exported JSON contains copy/analysis; original image files must be kept separately.

Cloudflare Pages is static hosting. This is a browser implementation of Prism's core visual workflow, not the full Python host moved into Pages. [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [deployment with continuous integration](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

## Desktop release order

1. Create a dedicated Windows x64 Python 3.13 venv. Install `requirements.lock`, `requirements-desktop.lock` and Prism without dependency re-resolution.
2. Run the Python contracts and `scripts/prepare_desktop.py`. The latter verifies/downloads the official immutable CLIP source, produces tensor-only weights and creates the Prism icon.
3. Freeze the small native launcher with `packaging/prism.spec`; run `scripts/assemble_desktop.py` to attach an isolated standard CPython runtime, its native dependency libraries, Prism source/assets and verified model. The backend uses ordinary Python multiprocessing.
4. Run `scripts/smoke_desktop.py` against the actual packaged executable. It checks child decoding, real CLIP, native Trailforge receipts, authenticated images, search, export and orderly shutdown. `--photos output/real-images/provenance.json` uses permitted downloaded photos with missing ad copy instead of synthetic fixtures.
5. Extract the entire portable ZIP and open `Prism.exe`. Windows 10/11 x64 and WebView2 Runtime are required. Python installation and paid API credentials are not required. Data lives at `%LOCALAPPDATA%\Prism\data`.
6. Push a matching version tag after verification. [Windows desktop release](../.github/workflows/desktop-release.yml) repeats the build and packaged tests in GitHub Actions, then publishes the ZIP and digest as a prerelease. GitHub repository visibility remains unchanged.

Real product photographs establish that the pipeline accepts and searches actual photos. They do not establish authentic advertising-copy extraction, held-out retrieval quality or campaign effectiveness. Synthetic demos remain clearly labelled.

## Published result

The website is live at **https://prism-creative.pages.dev/**. Version 0.2.1 deployed through [Pages run 38076807066](https://github.com/codera647/Prism/actions/runs/38076807066). The Windows download is [v0.2.1](https://github.com/codera647/Prism/releases/tag/v0.2.1), built by [desktop run 38076811675](https://github.com/codera647/Prism/actions/runs/38076811675). The 609,980,938-byte ZIP's GitHub SHA-256 digest matches `SHA256SUMS.txt`. Repository visibility remains private; downloading needs an account with repository access. The website is public.

On this computer, the application is installed at `%LOCALAPPDATA%/Prism/app/0.2.1/Prism.exe` and a **Prism** shortcut exists on the Desktop. See [release evidence](../output/evidence/implementation/desktop-release.json) and [verification record](RELEASE_0_2.md).

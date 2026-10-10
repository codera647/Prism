# Prism 0.2 — desktop and browser implementation

Updated 2026-10-10. The user authorized a Windows desktop release, GitHub Actions deployment, free public hosting and tests with real product images. Cloudflare Pages Free was selected after other providers required payment or a credit card. No paid inference service is used.

The first `v0.2.0` desktop Actions run stopped before packaging/publication when its clean Windows runner exposed a valid-backup rejection under a noncanonical temporary directory. Version **0.2.1** resolves the temporary root before validating archive descendants; containment and traversal rejection stay enforced. A regression test uses an equivalent aliased temporary root. Earlier 0.2.0 inference evidence below remains applicable to the unchanged CLIP pipeline.

The updated full local suite passed **32 tests in 126.39 seconds**. The browser core suite passed five tests and its production build succeeded. The desktop package was relocated to the user's AppData folder and passed another actual-executable six-image check with controlled shutdown. A desktop shortcut opens the local application; the installed native backend's interface was also inspected through its loopback URL.

**Published:** [Windows v0.2.1](https://github.com/codera647/Prism/releases/tag/v0.2.1), plus [Cloudflare browser app](https://prism-creative.pages.dev/). GitHub Actions passed the Windows contracts and actual packaged smoke before publishing. GitHub's archive digest matches the published checksum file. Raw photographs, private account credentials and deployment tokens are excluded from the repository and release.

## Architecture and ordered delivery

1. Keep the Python product host and pinned Trailforge Harness as the full desktop execution plane. Freeze a small launcher; attach isolated portable CPython and native libraries so supervised decoding and CLIP multiprocessing use their normal runtime.
2. Include hash-verified offline CLIP weights in the desktop package. Use private loopback HTTP inside a native WebView2 window, per-owner local accounts and `%LOCALAPPDATA%/Prism/data`. Closing the window requests shutdown through a private parent pipe.
3. Implement the core board workflow separately for static hosting: pinned Transformers.js CLIP in a worker, bounded image decoding, IndexedDB storage, browser mutation locks, revision checks and explicit interrupted-job recovery. Export the exact Python copy rules into the browser build.
4. Publish static assets on Cloudflare Pages through GitHub Actions with an account-scoped Pages Write token. Preserve unrelated applications. Model requests download public weights; uploaded pixels and copy stay on the visitor's device.
5. Obtain 30 real photographs through Google and Unsplash, retain source links and hashes privately, and test both inference engines. Captions remain photo descriptions, not fabricated ad copy. Original photographs are excluded from Git, packages and the hosted site.
6. Test the actual packaged executable before publishing. GitHub Actions repeats contracts, model verification, assembly and a packaged synthetic smoke check, then publishes a version-matched prerelease ZIP and SHA-256 digest.

See [DEPLOYMENT](DEPLOYMENT.md) for build commands, model pin, storage differences and token rotation. The earlier 0.1 implementation records remain historical baseline evidence; their local-only scope does not describe the added browser deployment.

## Evidence and limits

The baseline local suite passed 28 contracts; the desktop extension increased it to 31 passing tests. Five browser-core tests passed. These test recovery, evidence grounding and product boundaries, not advertising effectiveness. The first Pages deployment succeeded at [run 38074462351](https://github.com/codera647/Prism/actions/runs/38074462351).

Local browser inference accepted all 30 unique real photos, produced tentative groups and a partial report with one visual experiment because all advertising copy was missing. The skincare query returned 17 matches; its first five were visually inspected skincare/product photographs. “running shoes” returned eight footwear photographs. Some visual group names, including “Discount promotions” assigned to plain product photos, were incorrect suggestions and require correction. The grouping threshold and label vocabulary need evaluation on authentic campaign ads.

These are developmental checks on publicly sourced product photographs and labelled synthetic fixtures. They are not a held-out advertising benchmark. Authentic-copy accuracy, real-user pilot review, meaningful cluster quality, quantified retrieval quality and campaign impact remain open framework gates. Desktop and browser embeddings differ and need separate quality evaluation. No OCR, cross-device sync, automatic campaign execution or performance prediction is implemented.

Native window visual inspection is constrained by the unavailable Windows computer-use helper. Packaged API/runtime checks and browser-rendered UI checks must be reported separately from native-window visual inspection.

The final portable executable passed both a six-image synthetic check (three groups and three experiments, 90.479 seconds) and a 30-photo check (all accepted, 30 unique images, no copy, partial report, 121.660 seconds). Both verified native Trailforge completion/receipts, export, authenticated image access and controlled shutdown. See [desktop real-photo evidence](../output/evidence/implementation/desktop-real-smoke.json) and [browser evidence](../output/evidence/implementation/browser-release.json).

Desktop search took 0.257–0.304 seconds per warm query in this development run. Footwear filled its top five shoe results; the headphone photograph ranked first, followed by an irrelevant watch. The skincare query also included portraits. An unrelated underwater query returned no matches. These mixed results support releasing this as a developmental prerelease with tentative groups, rather than claiming validated retrieval precision.

On the published site, real browser inference under the deployed policy completed the labelled 30-ad demo. Three groups of ten and three supported experiments appeared. Reload retained the board and analysis; all 30 cards became visible after fixing ad-blocked CSS class names and adding versioned assets. Ten close-up thumbnails were checked loaded, and exact report review was exercised. Export was clicked; its downloaded file contents were not verified in that browser check.

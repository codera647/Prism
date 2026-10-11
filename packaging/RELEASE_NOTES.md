Prism 0.3.1 fixes Gemini model availability. AI connection now loads Google's compatible Flash text models using your key and requires explicit selection. Missing models no longer suggest another hardcoded older model. Keys stay in memory and are not saved; no automatic paid fallback or retry occurs. Newer Gemini models no longer receive deprecated generation settings. Google Search grounding is disabled until explicitly enabled per session; review pricing first, because it is separate from free text quotas. Product catalogue research, regional search links and local CLIP remain available without Gemini web search.

Prism 0.3 adds a campaign-first creative studio: describe a product, market, platform and language; discover sourced product photographs; analyse selected references locally with CLIP; and optionally connect your own Gemini key for cited Google Search research, three tailored concepts and chat. The interface includes clearer search labels, source cards, hover/motion effects and reduced-motion support.

Keys are entered privately in the app and kept only in page memory. Optional Gemini sends the brief and selected text to Google; images/vectors remain local. Use a Gemini project without paid billing for the intended free route; quotas apply. Catalogue photos are not verified paid Instagram ads. Regional Ad Library links are provided; restricted interfaces are not scraped. Concepts are proposed copy and production briefs, not generated image assets or proven winners.

Prism opens as a native Windows desktop window with its own managed local backend. The portable download includes Python dependencies and hash-verified CLIP weights, so image analysis and search run on your computer without paid inference APIs.

Extract the ZIP and open `Prism.exe`. Windows 10/11 x64 and Microsoft Edge WebView2 Runtime are required. Keep the `_internal` folder beside the executable.

Upload up to 100 images with copy, browse visual groups, search in plain language, inspect repeated hooks/offers and review three creative experiment drafts when evidence is sufficient. The included demo is labelled synthetic.

Free browser app: https://prism-creative.pages.dev/ . It runs quantized CLIP on your device and stores boards in this browser, without cloud synchronization or a Python/Trailforge server. Its first analysis downloads approximately 150 MB of model weights.

The Windows release workflow runs all 42 product tests and tested the actual packaged executable's decoder, CLIP, native Trailforge receipts, search, export, authenticated images and orderly shutdown. Browser/source integration also has 21 checks, including a mocked AI workflow. The new live discovery check found 12 Pakistani shampoo references. Local development previously checked 30 real product photographs. These had no authentic advertising copy; the report remained partial. Search and suggested group labels require human review.

Version 0.3 retains the 0.2.1 backup-path fix. Campaign research is saved in the window/browser profile and has a separate JSON export; it is not included in the SQLite backup. This is a developmental prerelease; live Gemini quality requires a connected user key, and no held-out retrieval accuracy or advertising effectiveness claim is made. Desktop board data is stored in `%LOCALAPPDATA%\Prism\data` and is separate from browser boards.

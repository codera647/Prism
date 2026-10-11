# Prism 0.3 — campaign research and creative studio

Client date: 2026-10-11, Asia/Karachi. This is a development prerelease.

## The product change

Prism now starts with a campaign question instead of requiring a folder of ads. Example: **anti-frizz shampoo, Pakistan, Instagram, English + Roman Urdu**. The user enters an audience, goal, supported product benefits and a broad catalogue search term. Prism finds product photographs from supported public brand catalogues, preserves source links, imports selected photographs into the existing local CLIP analysis, and optionally uses Gemini to research the web, draft three concepts and answer follow-up questions.

Each generated concept contains a creative angle, visual production brief, draft headline, caption, CTA, one variable to compare and conditions to keep constant. These are untested proposals. Source IDs are checked against the supplied references and board creatives. Existing template reports remain a separate, evidence-limited feature.

## Workflow, in order

1. Open **Campaign studio**. Describe the product and specify Pakistan or global inspiration, platform, audience, goal, language and supported claims. A product name is not evidence for every benefit it implies.
2. Use **Find product references**. For Pakistan the initial supported catalogues are Saeed Ghani and Conatural. Global inspiration also includes Color Wow and OUAI. Search uses a broad product keyword; it does not promise comprehensive internet or market coverage.
3. Check original product pages. Select photographs and add them to a CLIP board. Product titles remain reference metadata; advertising copy stays empty rather than being invented from catalogue titles.
4. Open the visual board and wait for analysis. Search describes only the board's images. Equal visual labels share one filter, while the underlying average-linkage clusters remain separate. Names and offer-like visual matches are tentative.
5. Connect a personal Gemini key privately in Prism. In 0.3.1, click **Load available models**, choose an explicitly listed compatible Flash text model, then connect. No generation request is made while listing models. Keys stay in page memory, clear on reload/logout and travel directly to Google in a request header. They are excluded from saved research, exports, Cloudflare and the Python backend.
6. Optionally run **Research the web with Gemini** after explicitly enabling it in AI connection. Newer models do not include Google Search grounding in the API free tier; a billed project may incur charges. Leave it off and use product references / regional search links for the free route. Google Search grounding returns a public-source summary, source links, statement-level evidence when supplied and Google's search suggestions in a sandbox. Gemini does not control a logged-in browser. Failed/no-source responses are not represented as completed web research.
7. Check actual ad delivery through the regional Meta Ad Library search. A public Pakistani catalogue photograph or an organic Instagram post is not a verified paid Pakistan Instagram campaign. Restricted Instagram/Meta interfaces are not scraped or bypassed. Authentic ad screenshots/copy can be uploaded through the existing board flow.
8. Draft three concepts from the brief and selected references/current CLIP descriptions. Brief-only drafts are explicitly allowed and labelled. A connected incomplete/stale board must finish analysis first. The board/context is checked again before a draft is saved.
9. Use **Ask Prism** for explanations, localisation and copy revisions. It uses campaign/board context; ordinary chat does not run a new web search. Chat messages and selected text are sent to Google only after connecting a key. Images and embedding vectors are not sent to Gemini.
10. Export campaign research and board JSON separately, keep original images, and execute any campaign comparison outside Prism. There is no campaign publishing, performance measurement or automatic asset licensing.

## Mapping to the production thinking framework

| Design question / responsibility | 0.3 implementation decision |
|---|---|
| User value and success | Specific, sourced references and actionable concepts for a stated market; not generic visual-composition advice |
| Inputs and product truth | Campaign brief, supported claims, catalogue source/time, user-supplied ad copy, current board revision |
| Evidence versus inference | Product references, grounded web summaries, tentative CLIP labels and proposed copy are shown separately |
| Tools and boundaries | Bounded public catalogue requests; fixed image-host/path/type/size allowlist; direct optional Gemini calls; Ad Library navigation links |
| State and memory | Boards retain existing product persistence; research sessions save in per-origin, per-local-account browser storage, with a separate export. Chat and keys are memory-only |
| Harness authority | Desktop image/report analysis still uses native Trailforge. The optional client-side Gemini calls and read-only catalogue requests do not claim native Harness receipts or durable task recovery |
| Failures and recovery | Source-level unavailable states; explicit API/quota/timeout errors; no silent paid fallback or invented provider response; previous boards retained |
| Verification | Network boundary tests, source/idea validation, DOM workflow tests, public catalogue/photo checks, existing product contracts and clean Actions packaging |
| Autonomy | Research and proposal generation only. No ad-account credentials, login bypass, publishing, spend or external messaging |
| Open quality gates | Live provider check after the user connects a key; browser/native visual inspection; authentic region/platform ad verification; concept quality and real-user usefulness |

## Architecture

```text
Campaign brief -> bounded public catalogue discovery -> source-linked photo candidates
                                       -> select/import -> local CLIP board
Optional Gemini + Google Search -> cited web research and search suggestions
Brief + selected source metadata + current CLIP groups/supplied copy -> Gemini
                                       -> schema/source-ID validation -> 3 concepts
Current campaign/board + bounded chat history -> Gemini -> plain-text assistant reply
```

- **Hosted:** Cloudflare Pages Functions implement only `/api/discover` and `/api/reference-image`; other requests stay static. The full CLIP runtime remains on the user's device. No database, account service, GPU backend or API secret is hosted. Functions consume Cloudflare's applicable free request allowance; catalogue availability and provider quotas are external dependencies.
- **Desktop:** authenticated FastAPI counterparts fetch catalogues/images, while optional Gemini calls run in the window. Existing CSRF/origin/owner controls apply. Python CLIP and Trailforge are unchanged except for a product-neutral close-up label prompt.
- **Gemini (0.3.1):** Direct `models.list` discovers Flash text models, excludes image/audio/live/TTS endpoints, and requires explicit selection. No fixed old-model fallback or automatic retry. Listing does not guarantee generation access or quota. Newer models use default sampling/thinking settings; the older 2.5 budget is scoped to 2.5. Key-invalid, access, missing-model, quota and transient errors are distinguished without echoing raw provider messages. Search grounding is off by default and separately enabled per session after reading pricing. Prism cannot determine billing status; use an unbilled project for free text quotas. [Models API](https://ai.google.dev/api/models), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [generateContent API](https://ai.google.dev/api/generate-content).
- **Sources:** the code never accepts an arbitrary host for a network fetch. Catalogue hosts are fixed. Image retrieval accepts HTTPS `cdn.shopify.com/s/files/` JPEG/PNG/WebP only, prohibits credentials/custom ports/redirect following, reads at most 10 MiB and still passes imported bytes through the existing decoder limits.
- **Google suggestions:** provider HTML is shown only in an opaque iframe sandbox with scripts, same-origin access and forms disabled. Text from users/catalogues/models is escaped. Parent style policy permits inline styles for the supplied search widget; script policy remains restricted. A sandboxed child CSP blocks network content/scripts/forms.

## UI

Campaign-first landing, brief/research/concept panels, source cards with selection, meaningful progress/error states, grouped label filters, clearer board-search explanations, floating assistant and campaign export. Motion is subtle and disabled by `prefers-reduced-motion`. Mobile panels stack; keyboard focus states and labelled controls are included.

## Verification and remaining limits

- Live Python and deployed Cloudflare discovery returned **12 genuine shampoo product references**, six each from Saeed Ghani and Conatural. All 12 photographs downloaded and passed actual local CLIP inference: 512-dimensional finite vectors, three similarity groups, 12 matches for ?shampoo bottle on a plain background? and zero for an underwater query. CLIP inference/grouping/search took 27.911 seconds, including model startup. Three photographs were visually inspected. Source URLs/hashes are retained in `output/evidence/implementation/campaign-research.json`; originals remain ignored. No authentic ad copy or confirmed Instagram delivery was inferred.
- Deterministic DOM tests exercise brief submission, escaped catalogue text, reference import with empty copy, key connection without persistence, blocking drafts until board analysis is current, three mock-provider concepts, source IDs and removal of stale concepts. Mock Gemini/CLIP outputs are testing fixtures, not live provider evidence.
- Real Gemini search/chat/concept output remains pending the user's privately entered key. No live model success is claimed from mock tests.
- Browser-control tools are unavailable in this turn. Layout/motion have not been visually inspected in a running browser; DOM tests and HTTP checks have a narrower scope.
- Saved research is device/browser-profile storage, including on desktop; it is not in the product SQLite backup or shared between devices. Source lists/briefs can be exported and deleted. It is not an encrypted multi-user vault.
- Labels/search can still be wrong. English copy rules, missing OCR, static-image-only analysis, no campaign metrics and the existing held-out quality gates remain as documented in 0.2.

Local verification: **42 Python tests passed in 108.55 seconds; 14 browser/source/DOM tests passed**. Browser production assets and Pages Functions compiled successfully. Cloudflare Actions run [38118963618](https://github.com/codera647/Prism/actions/runs/38118963618) succeeded at source commit `e92922418ca1f008ca16d175371035e3a2bb0a33`. Live HTTP checks confirmed the updated UI assets, 12 references, valid image downloads, blocked arbitrary/private image targets and blocked other-origin discovery. Google's endpoint accepted browser CORS from the Pages origin. Windows run [38118976802](https://github.com/codera647/Prism/actions/runs/38118976802) passed contracts, packaged executable checks, artifact upload and publication of [Prism v0.3.0](https://github.com/codera647/Prism/releases/tag/v0.3.0). The source tag remains at `e92922418ca1f008ca16d175371035e3a2bb0a33`; later documentation/verification-helper changes do not move the tag.


0.3.1 publication and verification (2026-10-11): the model-discovery fix is live at https://prism-creative.pages.dev/ . Served studio/client modules match tagged commit `5ac5c78a3c05da97fcb88ff09f48d745fffdf7ea`; Google's model-list endpoint accepts the site's CORS request. Pages run [38120306742](https://github.com/codera647/Prism/actions/runs/38120306742) and core contracts run [38120306740](https://github.com/codera647/Prism/actions/runs/38120306740) succeeded. Windows run [38120312857](https://github.com/codera647/Prism/actions/runs/38120312857) passed 42 contracts, actual packaged executable/CLIP checks and publication of [v0.3.1](https://github.com/codera647/Prism/releases/tag/v0.3.1). Local 21 browser/source/DOM regression checks passed, including mocked missing-model recovery. The installed desktop reports 0.3.1, CLIP ready, 12 live catalogue references and a valid image; its model-discovery module matches the tag. It reuses the previously verified pinned runtime/launcher with exact tagged source/UI; the official ZIP was verified by Actions and was not downloaded locally. Previous app versions and the existing data path are retained. Native-window visual inspection and a successful live Gemini response with the user's private key remain unverified. See [patch evidence](../output/evidence/implementation/gemini-connection-patch.json).

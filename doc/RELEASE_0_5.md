# Prism 0.5 account-ready release

The green/gray dashboard adds owned campaigns, individually saved ideas, encrypted provider connections, Agent Reach upstream web search and optional product-design jobs. [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) is the current implementation and operations plan and supersedes earlier local-only hosting statements.

## Implemented and checked

- Green/gray surfaces, green controls, updated icon and desktop opening screen; existing boards, CLIP, uploads, search, copy editing, experiments, export, catalogue research, Gemini and chat retained.
- Google OIDC with PKCE, browser-bound state, signed-token validation, secure hashed sessions and mutation CSRF checks.
- Account-scoped D1 schema, 30-identity admission cap, campaign autosaving/version conflicts, independent saved ideas and account export/deletion.
- AES-GCM saved Gemini/Muapi/Exa keys with user/provider authenticated data; keys are never returned in metadata or stored in browser localStorage.
- Agent Reach's recommended Exa MCP direct-tool integration in Python and Functions, bounded source-linked results and explicit quota errors. No social-account session/cookie extraction.
- Gemini generates two editable image prompts from a current concept. Explicit provider-credit confirmation selects one or two jobs through a clean-room Open-Higgsfield-compatible Muapi adapter. SQL intent/idempotency prevents automatic duplicate paid dispatch; uncertain states require provider-history review.
- Optional private R2 product-image API and dashboard upload/list/delete interface. Original CLIP board files and vectors remain local; separately uploaded account images are not automatic board synchronization.
- A read-only Cloudflare readiness check and additive [setup script](../scripts/configure_cloud_accounts.py), with private environment configuration in the system design.

Local verification: **45 Python tests and 36 browser tests pass**. The account integration test uses actual SQLite, WebCrypto and HTTP handlers; Google-session setup and Gemini/Exa/Muapi responses are clearly labelled fixtures. It restores saved campaign/key metadata, autosaves edits, saves an idea, reviews two prompts and dispatches two fixture image jobs. JWT tests sign fixture tokens and reject invalid claims. Private-media tests check ownership, bytes, quota and cleanup. These checks do not establish real Google login or live image inference.

## Production activation remains gated

The current Cloudflare credential can publish Pages but D1 read access returned **HTTP 401, code 10000**. The setup script fails closed before provisioning or changing configuration. Account-scoped D1 access and Google OAuth client credentials are needed. No database or OAuth client is claimed to have been created.

The user reported services signed in through Chrome, but the mandatory browser-control tool is unavailable in this session. Browser sessions and credentials were not inspected through an alternate mechanism.

A real Exa public search returned `_meta.ai.exa/rateLimited=true`; Prism reports quota exhaustion. An optional account Exa key can be connected after activation. Catalogue discovery and regional links remain available.

No live Gemini/Muapi keys or paid inference credits were accessed. Real Google login, account isolation across two browsers and a real requested image remain open activation checks. Model quality, campaign performance, full visual browser/native QA and the human pilot remain separate gates.

Native accounts continue to be local. Cloud synchronization targets the hosted website. Permanent provider keys require enabled Google account storage; anonymous/device mode keeps Gemini keys in memory.

## Upstream provenance

Agent Reach reference commit: `94f06c1969dfc1834001269d79d3ad0972d9dee6`, actual MIT license. Its installer is not hosted inside Functions; Prism calls its recommended upstream Exa tool route.

Open-Higgsfield reference commit: `b578108936e83a3b2a5e86644057a56f8aea73a1`. README claims MIT, but no LICENSE exists at this commit. No upstream UI/source is vendored; the delivered adapter implements the observed Muapi protocol independently. Open source does not provide free image inference.

Publication/build evidence is recorded in [account-system.json](../output/evidence/implementation/account-system.json). Publishing account-ready code with disabled Google sign-in is distinct from activating account infrastructure.

## Published verification

Pages run [38137753364](https://github.com/codera647/Prism/actions/runs/38137753364) deployed backend commit `f778b11c9fd2f206fcb6071f465549a8a5a232f2`. The Windows tag remains at `067c84018c29fb7d3a5cf3eca1a99a7f5c5861d4`; later fixes affect cloud Functions, tests and setup documentation, with unchanged packaged app source/assets. The [Windows build](https://github.com/codera647/Prism/actions/runs/38135827673) passed and [v0.5.0](https://github.com/codera647/Prism/releases/tag/v0.5.0) was downloaded and checksum-verified before installation.

The live website returned 12 shampoo references and a source photograph. The keyless Exa route returned HTTP 502/unavailable during this production check; no successful web-search result is claimed. The pinned optional Agent Reach 1.5.0 package was installed in `.prism/agent-reach-env`, imported its WebChannel and read a 33,534-byte public Conatural hair-care page. That separate package test does not establish live Exa search in the hosted app. No upstream system installer, personal browser cookies or social-account access was used.

The official ZIP was installed and all 27 packaged app source/assets match the Windows tag exactly. A local real-photo smoke test passed on retry with three unique shampoo photos and missing copy: real CLIP, native Trailforge receipts, private image delivery, export and controlled shutdown. The first attempt reported a CLIP worker startup failure; direct import/model loading and a spawned-worker probe later passed on the same unmodified package. The initial cause remains unconfirmed. This transient startup result is retained in evidence; it is not silently rewritten as an unconditional first-launch success. Original smoke queries were deliberately generic/distractors and returned no matches; that is not a positive shampoo-retrieval result.

A further real-photo check used relevant queries: "a shampoo bottle" and "hair care products" each retrieved all three photographs; "a product photograph of shampoo bottles on a white background" retrieved two; the underwater-submarine distractor retrieved none. The same released package completed this check in 40.5 seconds with no paid calls and controlled shutdown. This is a three-photo development check, not a held-out ranking-quality evaluation.

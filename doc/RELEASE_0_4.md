# Prism 0.4 — interface redesign

Date: 2026-10-11, Asia/Karachi. User direction: replace the layout and keep every working feature. The supplied video lists common generic website design patterns; it is design reference material, not a product specification or an instruction to delete capabilities.

## Product and design

The warm paper background, dark text, restrained rust accent and Georgia headings replace the purple gradients, orbit artwork, sparkle symbols, floating labels, shadows and hover lifts. Native system fonts work without a font service. Product photographs and uploaded creatives retain containment so packaging and ad copy remain visible. The custom prism mark is used in web navigation and newly built Windows packages.

Campaign studio now has three keyboard-navigable views: **Campaign brief → References → Creative concepts**. Incomplete briefs survive switching views. Saved campaigns and New/Export/Delete actions remain available. The references view gives real source photographs more space, exposes selection and CLIP import, and keeps public ad searches and sourced Gemini research available. Concepts appear as three numbered production notes with copy, visual direction, source links, a comparison and what to keep constant.

Boards retain uploads, per-image copy, CSV mapping, similarity search, merged suggested-group filters, messaging tags, pattern reports, experiments, evidence thumbnails, source corrections, group renaming, export, review, job diagnostics, retry and deletion confirmation. Account and privacy controls remain reachable on narrow screens. AI connection still discovers available Gemini models, requires explicit selection, keeps the key in memory and separates Google Search opt-in from text generation. Ask Prism remains available.

Loading placeholders show only during actual requests. Status text uses actual steps rather than invented percentages. Keyboard focus is visible, tabs support arrows/Home/End, inactive panels are hidden, and reduced-motion preferences disable the small functional fades and loading pulses.

## Evidence and claims

- Catalogue photos say **Product photo. Paid-ad status unverified.** Pakistani brand location does not establish Pakistan Instagram ad delivery.
- The board search explains that it searches this collection, not the internet, and that copy comes from user-supplied text, not OCR.
- Concepts and experiments are proposed tests; uploaded images contain no campaign performance evidence.
- Privacy & data and Using Prism sheets describe actual local storage, clearing/deletion, export boundaries, discovery requests and optional provider calls. They do not invent legal warranties, customer endorsements or measured advertising results.
- Generation metadata records the model used for the request even if connection settings change before it completes.

## Architecture and framework mapping

This is a presentation change on the existing 0.3 architecture, not a new ML pipeline. `studio-view.mjs` renders the campaign views; `studio.mjs` owns state, provider calls, revisions and request cancellation. `app.js` owns board/account workflows. Browser build hashing and asset copying include the new view module. Native CLIP/SQLite/Trailforge workflows and browser CLIP/IndexedDB remain separate; Gemini requests still run directly from the client, outside Trailforge receipts.

Framework mapping uses the established IDs in [PLAN](PLAN.md): P00 cognitive/product design (reference-finding rather than performance prediction); P01 system architecture (presentation separate from existing adapters); P02 frontend/channels (navigation, keyboard flow and actual request states); P06 memory/context (revision-bound concepts); P09 evaluation (DOM regressions and explicitly open visual review); P15 governance (source provenance and truthful data disclosures); P18 CI/CD for AI (hashed web assets and tagged package checks); P19 human operations (reviewable hypotheses, source inspection and deletion confirmation). P03/P04/P05/P14 backend, orchestration, modeling and data lineage retain their existing contracts. Other framework dispositions, including P20 continuous learning, remain as documented; no new learning mechanism or stage signoff is claimed. This UI update does not pass missing pilot or held-out model-quality gates.

## Verification and release

Local verification: **23 browser/source/DOM tests passed**, including the entire campaign/Gemini flow, private key lifecycle, incomplete brief navigation, loading placeholders, scoped board search, merged group filters, supplied-copy editing and deletion confirmation. CSS token tests verify normal-text contrast. Production bundle and Cloudflare Functions compilation passed.

These are functional and source checks, not screenshot proof. Browser/native visual inspection is unavailable in this session because the required browser-control runtime tool is not exposed. Responsive layout is implemented in CSS and still needs a human visual check on actual screens. The user separately confirmed Gemini is working before requesting this redesign; no private key was requested or tested by the agent.

Published at [Prism on Pages](https://prism-creative.pages.dev/) and as [Windows v0.4.0](https://github.com/codera647/Prism/releases/tag/v0.4.0), a prerelease. Source tag remains at `c429ef7521807aa2b7dfd59fb4d1be73b892cad1`; subsequent evidence/documentation commits do not move it. [Pages run 38124311670](https://github.com/codera647/Prism/actions/runs/38124311670), [main core contracts 38124311609](https://github.com/codera647/Prism/actions/runs/38124311609), [tag contracts 38124318649](https://github.com/codera647/Prism/actions/runs/38124318649), and [Windows release 38124318626](https://github.com/codera647/Prism/actions/runs/38124318626) all succeeded. Windows checks exercised the actual packaged subprocesses and real CLIP before publication.

Served web assets match the exact tag. Live web and installed-desktop checks each returned 12 real shampoo product photographs and a valid 103,501-byte image. The desktop shortcut opens 0.4.0; its backend reports CLIP ready and serves the exact tagged interface. Local installation reuses the previously verified pinned runtime/launcher and replaces source/UI from the tag, rather than downloading the official ZIP. The old launcher retains its embedded icon; the shortcut uses the new icon and the newly built release has the new embedded icon. Previous app versions and existing data are retained. No user-owned board was deleted or altered for this check. Reference-video frames and private helpers stay out of Git. [Release evidence](../output/evidence/implementation/ui-redesign.json).

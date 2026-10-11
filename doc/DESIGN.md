# Prism - Product and Interaction Design

> Current campaign research / Gemini / UI extension: [Prism 0.3 specification and framework mapping](RELEASE_0_3.md). Earlier sections below remain historical baseline records.


> Current 0.2 desktop/browser scope and verification: [release record](RELEASE_0_2.md), [deployment architecture](DEPLOYMENT.md). Earlier local-only implementation sections below describe the 0.1 baseline; open human/quality gates remain open.

> Implementation update (2026-10-10): the local Prism 0.1.0 app is built with real CLIP and pinned Trailforge. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for implemented contracts, evidence and remaining gates. Earlier proposals below remain framework/reference requirements; they do not imply that missing real-data, pilot or hosted-release evidence exists.

Date: 2026-10-08 (Asia/Karachi). Status: proposed UX specification; no screens or usability evidence exist yet.

Framework mapping: P02, PDF p. 13; autonomy pp. 9-10; P19 p. 19. Requirements: [PRD.md](PRD.md). Failure behavior: [GUARDRAILS.md](GUARDRAILS.md).

## 1. Design objective

Let a strategist see patterns and find examples quickly while understanding which conclusions have evidence and which need review. The board is the central workspace. Visual grouping and hook/offer filtering complement each other.

Do not show technical model names, vector dimensions, token counts, or orchestration mechanics in everyday flows. Show concrete progress, usable results, missing inputs, source examples, and actions the user can take. Operator diagnostics live in a separate controlled surface.

## 2. Information architecture

Collection list -> collection workspace -> board / pattern report. Opening an ad shows its original image, copy, tags, provenance, and correction controls. Search and filters operate within the current collection. A visible collection switcher prevents accidental assumptions about search scope.

Primary navigation: My collections, current collection, Board, Patterns & experiments. Settings contains data/deletion and account options. A dedicated public gallery or marketplace is outside MVP.

## 3. Collection creation and upload

1. Name the collection and optionally provide brand/category.
2. Drop/select images. Explain supported formats and batch/file limits before uploading.
3. Associate copy with each thumbnail or import a CSV containing `filename,copy`. Show an editable mapping preview; duplicate filenames or missing matches require correction.
4. Optionally request extraction of words visible inside images. Preserve that text separately and allow selection/correction before it becomes the active copy.
5. Present accepted, duplicate, and invalid items. Missing copy does not prevent visual analysis.
6. Start analysis and show durable progress with ready/failed counts. User may leave and return.

Typical product copy: "Add 30-100 ads for a useful collection. Smaller collections work too, with fewer patterns to compare."

For fewer than three visual-ready ads, show a simple searchable gallery and "Add more ads to compare visual groups." Exactly zero valid inputs yields a clear upload rejection. A batch with some valid inputs continues and lists rejected files. No fake progress percentage if the remaining processing time is unknown.

## 4. Board layout

```text
Collection name       60 ads | 56 ready | 4 need attention
Search: [minimal skincare ads with product close-ups           ]
Filters: visual group | hook | offer | copy status | clear
View: Grouped / All ads                         Patterns & experiments

Product close-ups (22)     Customer review designs (14)
[ad] [ad] [ad] ...         [ad] [ad] [ad] ...

Lifestyle use (12)         Other visuals / single ads (8)
[ad] [ad] [ad] ...         [ad] [ad] [ad] ...
```

Counts above are illustrative, not dataset results. The board supports group sections and an all-ads grid. Cards preserve aspect ratio with containment; never crop away copy/offer details merely to fill a uniform tile. Use a neutral surface, clear typography, and restrained accent color so ad imagery remains primary. Final design tokens follow the chosen frontend stack and accessibility checks.

Each card shows thumbnail, short copy snippet, relevant tags, and a small missing-copy/needs-review marker when applicable. It opens a detail panel. Selected-card highlighting must not imply a quality or performance ranking.

Group headings are suggested until corrected. Rename affects display metadata, not an unsupported claim about classification correctness. An explicit "Ungrouped" area is useful; unrelated items need not be forced together. Filters use tags that can overlap, so "testimonial" and "discount" can both match one ad.

## 5. Search experience

The search box accepts ordinary phrases. Show the demo phrase as a selectable example only if the collection has relevant content; otherwise offer neutral collection-relevant examples.

Search returns a grid sorted by relevance, with the active query and filters visible. Indicate that matches relate to visuals, copy, or tags when that helps explain a surprising result. Do not show similarity as a percent confidence or a performance score.

No match: "No close matches in this collection. Try a broader description or clear a filter." Do not say the whole market has no such ads. Limited search: "Searching 27 ready ads; 3 are still processing." Stale snapshot: "This view uses an earlier collection version. Refresh to include your latest changes."

Search history is session-local for MVP; do not create persistent chat memory implicitly. Keyboard Enter submits, Escape clears/dismisses appropriate overlays, and result navigation remains possible with a keyboard.

## 6. Ad detail and corrections

The detail view contains the full image, active user copy, separately identified extracted image text, visual-group membership, overlapping hook/offer tags, source reference if supplied, and revision/currentness.

A hook/offer tag can show the exact source phrase. An unknown tag reads "Not identified" rather than a guessed category. If OCR differs from user text, show both and let the owner choose/correct the active text.

Corrections: edit copy, accept/change a suggested tag, rename a group, or delete an ad. Use an expected revision when saving. If another change occurred, show a conflict with current content and preserve the user's unsaved text. Do not silently overwrite.

After an edit: immediately display the corrected authoritative content, mark dependent analysis stale, and offer bounded reanalysis. After deletion: remove the ad from active board/search/evidence immediately, show purge progress where relevant, and update coverage.

## 7. Pattern report and experiments

Each pattern card includes one clear observation, an exact numerator/denominator when counted, scope/coverage, and clickable supporting ad thumbnails. Example text is explicitly illustrative: "18 of 27 analyzed ad variants show a product against a plain background." Do not imply all uploaded files or unique images were included unless that denominator is correct.

Report status visibly reads Draft / Reviewed / Partial / Unavailable. Reviewed means an authenticated person accepted that exact version; it is not a claim of universal correctness. Fluent prose must not visually hide missing evidence.

Each experiment card contains:

- One concrete creative change and a short hypothesis.
- Supporting pattern and source ad links.
- What to keep constant so the user can compare the changed variable.
- A suggested outcome measure to choose when running a campaign elsewhere.
- Limitations, especially absent performance evidence.

Exactly three distinct cards appear for a complete report. If evidence cannot support three, show the supported suggestions and the explicit gap as a partial report. No fabricated idea should be presented as derived from the collection.

Actions: inspect supporting ads, mark reviewed, correct/reject a claim, and copy experiment text locally. Campaign launch, spend controls, public publishing, and emailing colleagues are outside MVP.

## 8. State and error presentation

| State | User sees | Useful next action |
|---|---|---|
| Empty | Upload explanation and limits | Add images/copy |
| Uploading | Per-file progress and cancel behavior | Wait/cancel; correct invalid items |
| Queued | Work accepted and saved; position/time only if known | Return later; inspect uploaded files |
| Processing | Ready/pending/failed counts by capability | Browse ready ads; inspect errors |
| Needs attention | Processing could not establish an outcome; ready capabilities remain accessible | Authorized operator inspects before bounded retry/cancel; no automatic approval |
| Ready | Board/search and current report availability | Search, inspect, review |
| Partial | Named gaps and explicit coverage | Fix/retry eligible failed assets |
| Stale | Earlier analysis tied to previous revision | Refresh/reanalyze |
| Failed | Readable reason and retained inputs | Retry eligible failures or change input |
| Cancelled | Work stopped; completed effects/status retained | Start a new bounded run |
| Budget limit | Draft/analysis unavailable due to configured limit | Use ready board or owner adjusts allowance |
| Provider unavailable | Board/search still available where ready | Use template observations; retry later |
| Unauthorized | Generic access rejection | Return to permitted collection |
| Deleted | Active access removed; purge status if relevant | Return to board; no stale evidence exposed |

Errors avoid leaking another user's resource existence, secrets, raw provider details, or stack traces. Request IDs can support operator diagnosis without dumping private payloads.

Trailforge raw states/units belong in the controlled operator surface. Product language explains concrete missing/uncertain work. CHECKING is not completion; WAITING_HUMAN is attention, not automatic review; a report hold does not hide a separately committed board. Retry invokes host policy rather than exposing resolve_unknown or resetting units.

## 9. Accessibility and responsive behavior

Maintain keyboard access, clear focus, labeled controls, readable contrast, zoom support, and non-color state indicators. Status updates use appropriate live regions without overwhelming the reader. Dialogs/panels manage focus and return it to their triggering card.

Use filename/user label for image alternative text unless a reviewed description is available; do not expose an invented AI description as authoritative. Important words visible in an ad are also available through copy/OCR where supported. Preserve original image zoom for detailed inspection.

Desktop shows grouped board plus a detail side panel. Small screens use a responsive grid and a full-width detail view. Long copy wraps; dense tags collapse with an accessible expansion control. Test portrait, landscape, square, text-heavy, and very long copy fixtures.

## 10. Usability evidence

S0 validates the workflow; S3 checks state/error/keyboard behavior; S4 compares manual and Prism tasks. Ask users to locate five references, explain one pattern using source ads, notice an intentionally wrong claim, distinguish partial/stale output, correct copy, and identify the one changed variable in an experiment.

Record task completion/time, relevant-reference judgments, error detection, review time, and confusion. Visual appeal alone does not pass the gate. Prototype dimensions and final visual assets are implementation work after the contract is agreed.

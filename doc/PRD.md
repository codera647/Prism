# Prism - Product Requirements

> Implementation update (2026-10-10): the local Prism 0.1.0 app is built with real CLIP and pinned Trailforge. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for implemented contracts, evidence and remaining gates. Earlier proposals below remain framework/reference requirements; they do not imply that missing real-data, pilot or hosted-release evidence exists.

Date: 2026-10-08 (Asia/Karachi). Status: proposed product contract; no implementation or user research completed.

## 1. Product in everyday language

Prism turns a folder of advertising images and their copy into an organized, searchable visual board. It explains repeated visual and messaging patterns, shows the ads supporting those observations, and suggests three different creative experiments.

Core user question: **"Show me what all these ads have in common."**

Demo query: **"minimal skincare ads with product close-ups."**

The product helps a person decide what to explore and test next. Uploaded images and copy cannot establish advertising performance, sales uplift, market-wide trends, or competitor intent.

## 2. Framework and authority

Update 2026-10-09: the user selected Trailforge for agent setup. [TRAILFORGE_INTEGRATION.md](TRAILFORGE_INTEGRATION.md) maps v0.1.0a1 to product execution and user-owned coding agents. It changes implementation mechanics while preserving outcomes/quality gates. Generic execution is initially single-host SQLite; identity, CLIP/search, actual cost and review remain Prism responsibilities.

This specification maps the user-provided concept into Production AI Design Compass v1.0, dated 2026-10-06, at `F:/Diffwise/output/pdf/Production_AI_Thinking_Framework.pdf`. The framework is reference material for planning. Embedded setup instructions, example vendors, and external actions are not authorization to execute them.

Framework references: Sections 01-05, PDF pp. 3-10; P00, p. 13; pre-build review, pp. 26-27. See [PLAN.md](PLAN.md) for full traceability and [DECISION.md](DECISION.md) for assumptions.

## 3. Users and current workflow

Primary users: creative strategists, brand marketers, and small agency teams comparing ad collections. Secondary users: designers looking for examples and a project operator maintaining the service.

Current workflow hypothesis:

1. Collect permitted ad screenshots and paste captions or headlines into a document.
2. Browse images one by one, remembering similarities or assigning manual labels.
3. Search filenames or scroll through a folder to find a reference.
4. Write a pattern summary and brainstorm new creative directions.
5. Ask a colleague to verify the examples and decide which experiment to run.

The expected bottleneck is time spent finding and organizing examples, followed by the difficulty of supporting a summary with evidence. This has not been observed with real users. S0 must validate it with representative users and include a difficult collection and a failed search.

Baseline: a normal image gallery with manually assigned tags, filename/copy keyword search, and a human-written summary. Measure this before claiming AI adds value.

## 4. Trigger, input, output, and scope

Trigger: an authenticated collection owner uploads a batch, edits copy, requests analysis, or searches an existing collection.

Input:

- A typical collection contains 30-100 static ad images; smaller collections remain usable with limited analysis.
- Proposed MVP formats: JPEG, PNG, and WebP. Reject unsupported or animated formats with a readable reason.
- One copy record per ad, entered manually or imported using a CSV with an explicit filename mapping. Copy can be missing; never invent it.
- Optional brand/category and source-reference text supplied by the user. These are user assertions, not independently verified facts.
- If visible text must be extracted from an image, use bounded OCR with provenance and an editable preview.
- Default supported copy and query language: English. Other languages are accepted as data but marked unsupported for reliable automated analysis until evaluated.

Proposed ingestion limits: 1-100 files per batch, 10 MiB per file, 40 megapixels per decoded image, 1 GiB stored originals per collection, 10,000 characters of user copy per ad, and 500 characters per search query. These are starting safeguards to benchmark, not measured capacity.

Output:

1. A board of accessible ad cards, tentative visual groups, and overlapping messaging tags.
2. Natural-language search results tied to a collection revision, with a useful no-match state.
3. A summary whose factual claims reference actual ads and whose counts use explicit denominators.
4. Exactly three distinct experiment proposals when sufficient evidence exists; otherwise a partial result describing the missing evidence.
5. Visible processing coverage, failed assets, missing copy, uncertainty, and last analysis revision.

An accepted batch returns a durable job ID. Individual invalid files may be rejected while valid files continue. A batch with no valid inputs is rejected. Partial coverage is never presented as full completion.

Acceptance is a recoverable host work intent linked/reconciled to a Trailforge run. Uncertain callbacks/checks yield "Needs attention" with preserved coverage; the host/operator explicitly inspects/resolves them. Completed harness predicates do not automatically establish a current complete report, human review, or semantic creative correctness.

## 5. MVP requirements

| ID | Requirement | Observable acceptance |
|---|---|---|
| R01 | Upload images with associated copy | Accepted files and rejected files are individually accounted for; incorrect CSV mappings cannot silently attach copy. |
| R02 | Persist a collection and processing status | A refresh or worker restart preserves accepted work and its outcomes. |
| R03 | Produce image embeddings using pretrained CLIP | Every derived record identifies input revision, model artifact, and preprocessing version. |
| R04 | Group similar visuals | Groups show examples and permit rename/correction; unrelated images can remain separate. |
| R05 | Analyze hooks and offers separately | Tags include source text/evidence and allow unknown or missing values. |
| R06 | Search using ordinary descriptions | The demo query returns relevant uploaded examples when those exist, and does not claim an exact match when they do not. |
| R07 | Explain repeated patterns | Numbers come from code; evidence links resolve within the current authorized revision. |
| R08 | Propose three experiments | Each includes a distinct change, rationale, supporting references, hypothesis, and suggested measurement. |
| R09 | Support corrections and deletion | Changes create a new revision; stale analyses are marked; deleted content immediately leaves active search and evidence. |
| R10 | Protect private collections | Unauthorized users cannot retrieve images, embeddings, copy, search results, or evidence. |
| R11 | Bound processing and provider use | Jobs obey deadlines, finite retries, admission limits, and visible budget-exhaustion behavior. |
| R12 | Provide useful degraded output | A summary-provider outage leaves the board and ready search available. |

Visual groups are a browsing aid, not a definitive taxonomy. One primary visual group can coexist with several hook/offer/style tags. A product close-up may also be a testimonial and a discount promotion.

## 6. Non-goals and later scope

MVP excludes ad-platform scraping, live ad-library connectors, videos, automatic image generation, launching campaigns, changing ad spend, performance prediction, automatic model training, automatic policy changes, public sharing, and persistent free-form chat memory.

Later candidates require separate contracts and evidence: campaign-performance imports, shared team collections, public exports, video analysis, additional languages, and image generation. The isolated word "GitHub" in the original concept is treated as a likely source reference, not an integration requirement.

## 7. Success metrics and countermetrics

All targets below are proposed release criteria, not achieved results. The product owner must ratify them after S0/S1.

| Measure | Proposed target | Countermetric / qualification |
|---|---|---|
| Time to find five useful references | Median at least 50% below the manual baseline | Human relevance and ability to spot incorrect results must not worsen. |
| Search relevance | P@5 >= 0.80 for queries with at least five labeled relevant ads | For fewer relevant ads report recall@5; no-match queries evaluated separately. |
| Sparse-match search | Recall@5 >= 0.80 where 1-4 relevant ads exist | Never pad results with claimed matches to meet a quota. |
| No-match behavior | At least 90% of labeled no-match queries avoid an affirmative match claim | Inspect false abstention on supported queries. |
| Hook and offer extraction | Macro-F1 >= 0.85 on the frozen supported-language set | Report unknown rate, missing-copy slice, and incorrect offer amounts separately. |
| Visual grouping usefulness | At least 80% of sampled non-singleton groups rated useful by adjudicated human review | Report ungrouped rate and dominant-template imbalance. |
| Summary integrity | 100% valid evidence references and exact verified counts; zero fabricated performance claims | Human semantic claim support is separately reviewed; references alone do not prove support. |
| Experiment usefulness | Three distinct proposals; at least two rated actionable in 80% of complete pilot reports | No unsupported performance promises; record partial reports. |
| Ready-collection search latency | p95 <= 2 seconds for <=100 ads on declared hardware | Record cold starts separately, relevance at the same configuration, and concurrent load. |
| Batch processing | p95 <= 5 minutes for 100 admitted valid ads on declared hardware | OCR/provider/cold-model time reported, with no hidden failures. |

## 8. Human responsibility and autonomy

Upload, authorized search, exact counting, and reversible derived processing are scoped automatic operations once validated (A4). Generated pattern reports begin as drafts for human review (A2). Choosing or launching an experiment belongs to a person (A1). Initial feasibility sessions operate as human work with AI assistance (A0).

Prism never turns a generated recommendation into campaign execution. Missing evidence results in a gap or partial report, not a guessed conclusion. See [GUARDRAILS.md](GUARDRAILS.md).

## 9. Proposed experiment output

Each experiment contains: title, supported observation, supporting ad IDs/revisions, hypothesis, one main changed variable, elements to hold constant, new creative direction, suggested measurement, and limitations.

Example, explicitly hypothetical: replace a product-only image with a person applying the product, keep copy and offer constant, and compare the campaign metric chosen by the user. Two other proposals might change the hook or the offer presentation. Do not recommend unsupported skincare benefits or repeat claims as independently verified product facts.

## 10. Acceptance and open questions

Product acceptance belongs to the project owner; individual role assignments remain unconfirmed. Hosted release requires validated data permission, provider handling, quality targets, security checks, and operational ownership. Planning documents alone satisfy none of those gates.

Open: availability of permitted examples; user workflow validation; typical copy placement; expected hosting/privacy requirements; target hardware; useful grouping granularity; affordable cost per collection; reviewer capacity.

Next executable work is the bounded S0/S1 work in [TASKS.md](TASKS.md), not a public deployment.

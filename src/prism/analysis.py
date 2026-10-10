"""Deterministic copy evidence, grouping and creative hypotheses."""
import re
from collections import Counter
import numpy as np
from sklearn.cluster import AgglomerativeClustering

from .domain import fingerprint

VISUAL_LABELS = [
    ("Product close-ups", "an advertising image with a close-up of a single skincare product on a minimal plain background"),
    ("People & lifestyle", "an advertising image with a person using a product in a lifestyle photograph"),
    ("Testimonials", "a testimonial advertisement featuring a customer review and star ratings"),
    ("Discount promotions", "a promotional advertisement featuring a large discount price or sale percentage"),
    ("Product collections", "an advertising photograph showing several products arranged together"),
    ("Text-led creatives", "a typography advertisement dominated by headline text and graphics"),
]

HOOK_RULES = [
    ("Question", r"[^.!\n?]{0,180}\?"),
    ("Social proof", r"\b(?:rated\s+[\d.]+|[\d,]+\+?\s+(?:customers|reviews)|customers?\s+love|verified\s+review|five.star|5.star)\b"),
    ("Urgency", r"\b(?:limited\s+time|ends?\s+(?:tonight|today|soon)|last\s+chance|today\s+only|while\s+stocks?\s+last)\b"),
    ("Discovery", r"\b(?:meet|introducing|discover|new)\b"),
    ("Benefit claim", r"\b(?:hydrati\w*|glow\w*|smooth\w*|soft\w*|bright\w*|simpl\w*|gentle)\b"),
]
OFFER_RULES = [
    ("Discount", r"\b\d{1,3}(?:\.\d+)?\s*%\s*(?:off|discount)?|\b(?:save|off)\s*[$£€]\s*\d+(?:\.\d{1,2})?"),
    ("Free shipping", r"\bfree\s+(?:shipping|delivery)\b"),
    ("Bundle", r"\b(?:bundle|buy\s+one\s+get\s+one|bogo|starter\s+kit)\b"),
    ("Gift", r"\bfree\s+gift\b"),
]


def copy_tags(text):
    tags = []
    for kind, rules in (("hook", HOOK_RULES), ("offer", OFFER_RULES)):
        for label, expression in rules:
            match = re.search(expression, text, re.I)
            if match:
                tags.append({"kind": kind, "label": label, "source": "user_copy",
                             "start": match.start(), "end": match.end(), "quote": match.group()})
    return tags


def resolved_tags(ad):
    tags = copy_tags(ad["copy"])
    for correction in ad.get("corrections", []):
        tags = [t for t in tags if (t["kind"], t["label"]) != (correction["kind"], correction["label"])]
        if correction["operation"] == "add" and correction["quote"] in ad["copy"] and correction["quote"]:
            start = ad["copy"].index(correction["quote"])
            tags.append({"kind": correction["kind"], "label": correction["label"], "source": "user_annotation",
                         "start": start, "end": start+len(correction["quote"]), "quote": correction["quote"]})
    return tags


def validate_vectors(vectors, count, dimensions):
    values = np.asarray(vectors, dtype=np.float32)
    if values.shape != (count, dimensions) or not np.isfinite(values).all():
        raise ValueError("invalid or incompatible vectors")
    norms = np.linalg.norm(values, axis=1)
    if np.any(norms < 1e-6):
        raise ValueError("empty vector")
    return values / norms[:, None]


def group_ads(ads, vectors, label_vectors, model):
    values = validate_vectors(vectors, len(ads), model["dimensions"])
    labels = validate_vectors(label_vectors, len(VISUAL_LABELS), model["dimensions"])
    if len(ads) == 1:
        assignments = [0]
    else:
        assignments = AgglomerativeClustering(n_clusters=None, metric="cosine", linkage="average", distance_threshold=0.22).fit_predict(values)
    groups = []
    for assignment in sorted(set(int(n) for n in assignments)):
        indices = [i for i, n in enumerate(assignments) if n == assignment]
        centroid = values[indices].mean(axis=0)
        label = VISUAL_LABELS[int(np.argmax(labels @ centroid))][0]
        members = [ads[i]["id"] for i in indices]
        groups.append({"id": fingerprint(sorted(members))[:16], "name": label,
                       "members": members, "tentative": True})
    patterns = []
    for group in groups:
        patterns.append({"kind": "visual", "label": group["name"], "count": len(group["members"]),
                         "denominator": len(ads), "ad_ids": group["members"], "tentative": True})
    counts = Counter()
    for ad in ads:
        for tag in ad["tags"]:
            counts[(tag["kind"], tag["label"])] += 1
    for (kind, label), count in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
        members = [ad["id"] for ad in ads if any(t["kind"] == kind and t["label"] == label for t in ad["tags"])]
        patterns.append({"kind": kind, "label": label, "count": count,
                         "denominator": len(ads), "ad_ids": members, "tentative": False})
    return {"groups": groups, "patterns": patterns, "vectors": values.tolist(),
            "ads": ads, "model": model,
            "coverage": {"images": len(ads), "copy": sum(bool(ad["copy"].strip()) for ad in ads),
                         "ad_variants": len(ads), "unique_images": len({ad["hash"] for ad in ads})},
            "clustering": {"metric": "cosine", "linkage": "average", "distance_threshold": 0.22}}


def draft_report(analysis):
    ads, patterns = analysis["ads"], analysis["patterns"]
    observations = []
    for pattern in patterns:
        if pattern["count"] >= 2:
            observations.append({**pattern, "text": f"{pattern['count']} of {pattern['denominator']} analyzed ad variants share {pattern['label'].lower()}" + (" (tentative visual label)." if pattern["tentative"] else " in their supplied copy.")})
    experiments = []
    visual = next((p for p in patterns if p["kind"] == "visual"), None)
    hook = next((p for p in patterns if p["kind"] == "hook"), None)
    offer = next((p for p in patterns if p["kind"] == "offer"), None)
    candidates = [
        (visual, "Change the visual composition", "visual composition", "Compare the current composition with a contrasting composition, such as product-only versus product in use.", "Keep the headline, offer, audience and placement the same.", "A different composition may make the product easier to understand."),
        (hook, "Try a different opening hook", "opening headline", "Compare the observed hook with a question-led or direct, factual product introduction.", "Keep the image, product facts, offer and audience the same.", "A different opening may make the message more relevant to the viewer."),
        (offer or hook, "Test the supporting message", "offer presentation" if offer else "supporting copy", "Present the same existing offer more clearly without changing its value." if offer else "Compare concise supporting copy with a fuller explanation of verified product facts.", "Keep the image, opening hook, product, audience and actual price the same.", "Clearer supporting information may help viewers understand the proposal."),
    ]
    if len(ads) >= 3:
        for pattern, title, variable, direction, constant, hypothesis in candidates:
            if pattern:
                experiments.append({"title": title, "variable": variable, "direction": direction,
                                    "hold_constant": constant, "hypothesis": hypothesis,
                                    "evidence_ids": pattern["ad_ids"][:8], "observation": pattern["label"],
                                    "measurement": "Choose a campaign metric and a fair comparison before running this experiment elsewhere.",
                                    "limitations": "Untested creative hypothesis. Uploaded ads provide no performance evidence."})
    return {"status": "draft" if len(experiments) == 3 else "partial", "method": "evidence-based templates",
            "observations": observations[:12], "experiments": experiments,
            "coverage": analysis["coverage"], "gap": None if len(experiments) == 3 else "At least three ads and identifiable copy hooks are needed for three supported experiments.",
            "limitations": ["Visual labels are tentative CLIP suggestions; rename them after inspection.",
                            "Copy tags use English rules and quote supplied text. No OCR or semantic language model is enabled.",
                            "Repeated claims in ads are advertiser statements, not verified product benefits.",
                            "No campaign performance data was supplied."], "reviewed_at": None}


def verify_analysis(analysis, ads, model):
    ids = {a["id"] for a in ads}
    if len(ids) != len(ads) or {a["id"] for a in analysis["ads"]} != ids or analysis["model"] != model:
        return False
    validate_vectors(analysis["vectors"], len(ads), model["dimensions"])
    members = [i for g in analysis["groups"] for i in g["members"]]
    if len(members) != len(ids) or set(members) != ids:
        return False
    sources = {a["id"]: a for a in ads}
    for ad in analysis["ads"]:
        if ad["copy"] != sources[ad["id"]]["copy"] or ad["hash"] != sources[ad["id"]]["hash"]:
            return False
        if ad["tags"] != resolved_tags(sources[ad["id"]]):
            return False
    for p in analysis["patterns"]:
        if p["count"] != len(p["ad_ids"]) or p["denominator"] != len(ads) or not set(p["ad_ids"]) <= ids:
            return False
        if p["kind"] != "visual":
            expected = {a["id"] for a in analysis["ads"] if any(t["kind"] == p["kind"] and t["label"] == p["label"] for t in a["tags"])}
            if set(p["ad_ids"]) != expected:
                return False
    return analysis["coverage"] == {"images": len(ads), "copy": sum(bool(a["copy"].strip()) for a in ads), "ad_variants": len(ads), "unique_images": len({a["hash"] for a in ads})}


def verify_report(report, analysis):
    # An independent host compares the complete deterministic contract, not model prose.
    return report == draft_report(analysis)

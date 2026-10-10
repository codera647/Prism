"""Export declarative copy rules without importing Python ML dependencies."""
import ast
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
tree = ast.parse((root/"src/prism/analysis.py").read_text(encoding="utf-8"))
names = {"VISUAL_LABELS", "HOOK_RULES", "OFFER_RULES"}
policy = {node.targets[0].id:ast.literal_eval(node.value) for node in tree.body
          if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name)
          and node.targets[0].id in names}
policy["model"] = {"name":"Xenova/clip-vit-base-patch32", "revision":"d15189d7028b43f1d3e65039190477f6af591c2a",
                   "dtype":"q8", "dimensions":512, "runtime":"Transformers.js / ONNX CPU",
                   "tokenization":"75-token chunks; normalized mean"}
(root/"browser/policy.json").write_bytes((json.dumps(policy, indent=2, ensure_ascii=False)+"\n").encode())

"""Download bounded evaluation photos from explicitly collected Unsplash URLs."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse, urlencode

import httpx
from PIL import Image, ImageDraw, ImageOps


def main():
    root = Path("output/real-images")
    manifest = json.loads((root/"provenance.json").read_text(encoding="utf-8"))
    def download(item):
        url = urlparse(item["image"])
        if url.hostname != "images.unsplash.com" or not url.path.startswith("/photo-"):
            raise ValueError("Only explicitly collected free Unsplash image URLs are allowed")
        requested = url._replace(query=urlencode({"w":1024,"auto":"format","fit":"max","q":85})).geturl()
        response = httpx.get(requested, timeout=60, follow_redirects=True)
        response.raise_for_status()
        content = response.content
        assert 0 < len(content) < 10*1024*1024
        item["filename"] = url.path[1:]+".jpg"
        item["download_url"] = requested
        item["sha256"] = hashlib.sha256(content).hexdigest()
        item["source_kind"] = "product/lifestyle photo; not authenticated advertising campaign"
        item["advertising_copy"] = None
        path = root/item["filename"]
        path.write_bytes(content)
        with Image.open(path) as image:
            image.verify()
        return item
    with ThreadPoolExecutor(max_workers=4) as pool:
        items = list(pool.map(download, manifest))
    assert len({item["sha256"] for item in items}) == len(items), "Duplicate source images"
    (root/"provenance.json").write_text(json.dumps(items,indent=2),encoding="utf-8")
    montage = Image.new("RGB", (1200, 1400), "#f6f5f2")
    draw = ImageDraw.Draw(montage)
    for i,item in enumerate(items):
        x,y = (i%6)*200,(i//6)*280
        with Image.open(root/item["filename"]) as image:
            thumb = ImageOps.contain(image.convert("RGB"),(188,240))
            montage.paste(thumb,(x+6+(188-thumb.width)//2,y+6+(240-thumb.height)//2))
        draw.text((x+8,y+252),f"{i+1:02} {item['caption'][:25]}",fill="#29272f")
    montage.save(root/"montage.jpg",quality=90)
    print(json.dumps({"downloaded":len(items),"unique":len({i['sha256'] for i in items}),"path":str(root),"copy":"missing; captions not used as ad copy"}))


if __name__ == "__main__":
    main()

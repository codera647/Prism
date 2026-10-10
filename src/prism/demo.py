"""Synthetic, reproducible demo creatives; not customer ads or quality labels."""
from io import BytesIO
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from .domain import identifier, timestamp
from .media import stage_image


def font(size):
    for path in ("C:/Windows/Fonts/arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def demo_creative(index):
    kind, variant = index % 3, index // 3
    shades = ["#e8e1d4", "#e0e5d9", "#eddcd4", "#e2dfec", "#dce7e5"]
    image = Image.new("RGB", (720, 900), shades[variant % len(shades)])
    draw = ImageDraw.Draw(image)
    ink = "#263931"
    draw.text((48, 42), "AURA / DEMO", fill=ink, font=font(28))
    if kind == 0:
        draw.text((48, 110), ["Less, but better.", "Your daily ritual.", "Keep it simple."][variant % 3], fill=ink, font=font(45))
        draw.ellipse((180, 702, 555, 760), fill="#cbc3b6")
        x = 278 + (variant % 3-1)*30
        draw.rounded_rectangle((x, 320, x+166, 700), radius=30, fill="#faf9f1", outline="#b7b5a9", width=3)
        draw.rounded_rectangle((x+33, 258, x+133, 335), radius=12, fill="#314b3d")
        draw.text((x+22, 440), "AURA", fill=ink, font=font(31))
        draw.text((x+22, 495), "DAILY\nSERUM", fill=ink, font=font(22), spacing=8)
        draw.text((48, 813), "A simpler skincare routine.", fill=ink, font=font(24))
        copy = f"Meet Aura daily serum. A simpler skincare routine. Discover your daily ritual. Demo creative {variant+1}."
    elif kind == 1:
        draw.rounded_rectangle((45, 175, 675, 720), radius=30, fill="#fbfaf6")
        draw.text((88, 245), "5 / 5 STARS", fill="#ac8840", font=font(30))
        draw.text((88, 330), '"My daily ritual,\nmade simple."', fill=ink, font=font(46), spacing=15)
        draw.text((88, 525), "Alex / illustrative customer", fill=ink, font=font(25))
        draw.text((88, 587), "SYNTHETIC TESTIMONIAL", fill="#73776c", font=font(18))
        draw.text((48, 800), "See what customers say.", fill=ink, font=font(28))
        copy = f"Customers love a simpler routine. Rated 5.0. Illustrative review only, not a real testimonial. Demo creative {variant+1}."
    else:
        image = Image.new("RGB", (720, 900), ["#314d3b", "#593d55", "#364651"][variant % 3])
        draw = ImageDraw.Draw(image)
        draw.text((48, 42), "AURA / DEMO", fill="#f7eedc", font=font(28))
        draw.text((48, 176), "YOUR NEXT\nDAILY RITUAL", fill="#f7eedc", font=font(45), spacing=12)
        draw.text((38, 378), f"{20+variant % 3*5}%", fill="#eac591", font=font(180))
        draw.text((48, 575), "OFF YOUR FIRST ORDER", fill="#f7eedc", font=font(30))
        draw.rounded_rectangle((48, 715, 675, 798), radius=10, fill="#f7eedc")
        draw.text((90, 738), "DISCOVER THE STARTER KIT", fill=ink, font=font(28))
        copy = f"Discover your starter kit. {20+variant % 3*5}% off your first order. Free shipping. Limited time. Demo creative {variant+1}."
    stream = BytesIO()
    image.save(stream, format="PNG")
    return stream.getvalue(), copy


def add_demo(store, owner, count=30):
    cid = identifier()
    staged = []
    try:
        for index in range(count):
            content, copy = demo_creative(index)
            ad = stage_image(store.root, f"demo-{index+1:02}.png", content)
            ad["copy"] = copy
            staged.append(ad)
        with store.connect(write=True) as db:
            db.execute("INSERT INTO collections(id,owner,name,revision,created) VALUES(?,?,?,2,?)", (cid, owner, "Aura skincare · synthetic demo", timestamp()))
            for ad in staged:
                db.execute("INSERT INTO ads(id,collection_id,filename,copy,hash,bytes,width,height,created) VALUES(?,?,?,?,?,?,?,?,?)", (ad["id"], cid, ad["filename"], ad["copy"], ad["hash"], ad["bytes"], ad["width"], ad["height"], timestamp()))
            store.audit(db, owner, "synthetic_demo_created", cid)
    except Exception:
        import shutil
        for ad in staged:
            shutil.rmtree(store.root / "artifacts" / ad["id"], ignore_errors=True)
        raise
    return cid

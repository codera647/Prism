"""Prepare verified model seed, build identity assets and package notices."""
import argparse
from pathlib import Path
import shutil

from PIL import Image,ImageDraw
from prism.desktop import seed_model

parser=argparse.ArgumentParser()
parser.add_argument('--model',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
seed=root/'output/model-seed'
if args.model:
    manifest=seed_model(root/'output/seed-validation',args.model)
    seed.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(args.model/manifest['file'],seed/manifest['file'])
    shutil.copyfile(args.model/'manifest.json',seed/'manifest.json')
else:
    from prism.encoder import download_model
    download_model(seed)
image=Image.new('RGBA',(256,256),(119,86,201,255))
draw=ImageDraw.Draw(image)
draw.line([(128,40),(218,208),(38,208),(128,40)],fill='white',width=12)
draw.line([(128,40),(105,178),(218,208)],fill='white',width=6)
dest=root/'output/packaging';dest.mkdir(parents=True,exist_ok=True)
image.save(dest/'prism.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('Desktop model seed and icon ready.')

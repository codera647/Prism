"""Live product-reference + actual CLIP check; no API key or paid inference."""
import hashlib
from io import BytesIO
import json
from pathlib import Path
import time

from PIL import Image
import numpy as np

from prism.analysis import VISUAL_LABELS, group_ads, validate_vectors
from prism.encoder import ClipEncoder
from prism.research import CampaignBrief, discover, reference_image


def main():
    root = Path(__file__).resolve().parents[1]
    photos = root/'output/campaign-photos'
    photos.mkdir(parents=True, exist_ok=True)
    brief = CampaignBrief(product='Anti-frizz shampoo', region='PK', platform='Instagram',
                          audience='People exploring everyday hair care', goal='Product page visits',
                          language='English + Roman Urdu', claims='', query='shampoo')
    research = discover(brief)
    assert research['references'], 'No live source references returned.'
    paths, ads, checked = [], [], []
    for index, ref in enumerate(research['references']):
        data, kind = reference_image(ref['image'])
        path = photos/f'reference-{index+1:02}.jpg'
        with Image.open(BytesIO(data)) as image:
            assert image.width*image.height <= 40_000_000
            image.convert('RGB').save(path, 'JPEG', quality=90)
        paths.append(path)
        ads.append({'id': ref['id'], 'copy':'', 'corrections':[]})
        checked.append({'id':ref['id'], 'source':ref['url'], 'bytes':len(data),
                        'content_type':kind, 'sha256':hashlib.sha256(data).hexdigest()})
    encoder = ClipEncoder(root/'.prism/models')
    started = time.monotonic()
    try:
        vectors = encoder.images(paths)
        label_vectors = encoder.texts([prompt for _, prompt in VISUAL_LABELS])
        values = validate_vectors(vectors, len(ads), 512)
        analysis = group_ads(ads, vectors, label_vectors, encoder.manifest)
        queries = ['shampoo bottle on a plain background', 'underwater submarines and coral reefs']
        texts = validate_vectors(encoder.texts(queries), 2, 512)
        search = []
        for query, text in zip(queries, texts):
            scores = values @ text
            matches = np.flatnonzero(scores >= .23)
            ranked = sorted(matches, key=lambda i:float(scores[i]), reverse=True)
            search.append({'query':query,'matches':len(ranked), 'top':[{'source':research['references'][i]['url'], 'cosine':float(scores[i])} for i in ranked[:5]]})
        record={'status':'passed','scope':'Live Pakistani catalogue photos + real local CLIP mechanics; paid Instagram status and creative effectiveness unverified.',
                'brief':brief.model_dump(), 'research':research, 'images_checked':checked,
                'clip':{'model':encoder.manifest, 'count':len(ads), 'dimensions':512,
                        'groups':analysis['groups'], 'search':search, 'seconds':round(time.monotonic()-started,3)},
                'live_gemini':'Pending user-entered key; mock UI responses are not live model evidence.',
                'visual_inspection':'Not performed; browser control tool unavailable this turn.'}
        target=root/'output/evidence/implementation/campaign-research.json'
        target.write_text(json.dumps(record,indent=2),encoding='utf-8')
        print(json.dumps({'status':record['status'],'references':len(ads),'groups':len(analysis['groups']),'search':search,'seconds':record['clip']['seconds']},indent=2))
    finally:
        encoder.close()


if __name__ == '__main__':
    main()

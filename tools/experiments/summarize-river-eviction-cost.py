"""Validate the current-recipe A/B/A/B eviction comparison, including final pixels."""
import hashlib
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from PIL import Image, ImageChops, ImageStat

root = Path('docs/qa/global-visual-lab/current-review-20261025')
rows = []
conditions = None
images = {}
for run in ['a1', 'b1', 'a2', 'b2']:
    path = root / f'gran-rio-eviction-settled-{run}.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    stream = data['result']['streaming']
    query = parse_qs(urlparse(data['url']).query)
    assert query.pop('chunkEviction') == ['batch' if run.startswith('b') else 'single']
    assert not [e for e in data['errors'] if 'warning X4000' not in e]
    assert stream['farSettled'] and stream['elapsed'] == stream['initialElapsed']
    assert stream['gpu']['supported'] and not stream['gpu']['disjoint']
    current = [query, data['biome'], data['quality'], stream['hardware'], stream['options'],
               stream['cameraOrigin'], stream['targetOrigin'], stream['initialElapsed'],
               stream['created'], {k:v for k,v in stream['final'].items() if k != 'sectorUpdates'}]
    if conditions is None:
        conditions = current
    assert current == conditions, f'Mismatched conditions/inventory: {run}'
    frames = stream['rows']['frames'][:180]
    ordered = sorted(frames)
    assert len(frames) == 180
    removal = stream['summary']['removeBatch' if run.startswith('b') else 'remove']
    rows.append(dict(run=run, sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                     authoredMean=sum(frames)/len(frames), p95=ordered[int(179*.95)],
                     p99=ordered[int(179*.99)], maximum=max(frames),
                     travelAndSettle=sum(stream['rows']['frames']),
                     gpu=stream['gpu']['summary'], renderCpu=stream['summary']['render'],
                     evictionCalls=removal['count'], evictionTotal=removal['mean']*removal['count'],
                     evictionMaximum=removal['max'], sectorUpdates=stream['final']['sectorUpdates']))
    images[run] = Image.open(path.with_suffix('.png')).convert('RGB')
pixels = []
for left, right in [('a1', 'b1'), ('a2', 'b2')]:
    assert images[left].size == images[right].size == (1280, 720)
    diff = ImageChops.difference(images[left], images[right])
    pixels.append(dict(pair=[left, right], mae=sum(ImageStat.Stat(diff).mean)/3,
                       maxChannel=max(high for low, high in diff.getextrema())))
result = dict(scope='A/B/A/B, frozen simulation, current recipe, no density/quality changes. '
                    'Authored frames exclude variable settling; GPU intervals may include bubbles. '
                    'Final pixel differences do not prove full motion equivalence.',
              conditions=conditions, rows=rows, finalPixels=pixels)
(root/'gran-rio-eviction-summary.json').write_text(json.dumps(result, indent=2)+'\n',
                                                encoding='utf-8', newline='\n')
print(json.dumps(dict(rows=rows, finalPixels=pixels), indent=2))

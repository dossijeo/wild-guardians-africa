"""Compare saved native/impostor captures against their shared background."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
root = args.directory
read = lambda name: json.loads((root / (name + '.json')).read_text(encoding='utf-8'))
expected = {'native': 1, 'impostor': 0, 'background': 0, 'mixed': .5}
reports = {mode: read(mode) for mode in expected}
reference = reports['native']
for mode, coverage in expected.items():
    report = reports[mode]
    assert report['camera'] == reference['camera']
    assert report['atlasLod'] == reference['atlasLod']
    assert report['representation'] == mode and report['gpuReady'] and report['gpuCovered']
    assert report['state']['ready'] == 1 and not report['errors']
    assert report['webglError'] == 0
    assert report['nativeColorCoverage'][1] == {'count': 1, 'coverage': coverage}
assert not read('console')
images = {mode: Image.open(root / (mode + '.png')).convert('RGB') for mode in expected}
assert len({image.size for image in images.values()}) == 1
width, height = images['background'].size
# The QA panel occupies the left 394 pixels. Compare only the rendered world.
box = (400, 0, width, height)
background = images['background'].crop(box)
peaks = {}
for mode in ['native', 'impostor']:
    red, green, blue = ImageChops.difference(images[mode].crop(box), background).split()
    peaks[mode] = ImageChops.lighter(ImageChops.lighter(red, green), blue)

def bounds(mask):
    return [min(x for x, y in mask), min(y for x, y in mask),
            max(x for x, y in mask), max(y for x, y in mask)]

rows = []
for threshold in [0, 8]:
    masks = {}
    for mode, peak in peaks.items():
        masks[mode] = {(index % peak.width + 400, index // peak.width)
                       for index, value in enumerate(peak.getdata()) if value > threshold}
    native, impostor = masks['native'], masks['impostor']
    assert native and impostor
    intersection, union = native & impostor, native | impostor
    rows.append({'rgbDifferenceThreshold': threshold, 'nativePixels': len(native),
                 'impostorPixels': len(impostor), 'intersectionPixels': len(intersection),
                 'unionPixels': len(union), 'intersectionOverUnion': len(intersection) / len(union),
                 'nativeBounds': bounds(native), 'impostorBounds': bounds(impostor)})
summary = {'atlasLod': reference['atlasLod'], 'nativeLod': 1,
           'camera': reference['camera'], 'pixelMasks': rows,
           'scope': 'Single stationary daytime view, masks from RGB difference against separately rendered background; includes leaf holes, antialias and shading, not geometry-only silhouette or perceived quality',
           'errors': []}
result = json.dumps(summary, indent=2) + '\n'
if args.output:
    args.output.write_text(result, encoding='utf-8', newline='\n')
print(result, end='')

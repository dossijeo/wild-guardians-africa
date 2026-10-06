"""Verify the GPU-rendered distance fade against separately captured backgrounds."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
parser.add_argument('--reference', type=Path, help='Earlier 120 m unfaded impostor capture')
args = parser.parse_args()
root = args.directory
rows = []
for distance in (100, 120, 140):
    reports = {mode: json.loads((root / f'{distance}-{mode}.json').read_text(encoding='utf-8'))
               for mode in ('full', 'faded', 'background')}
    reference = reports['full']
    for mode, report in reports.items():
        assert report['camera'] == [0, 10, distance]
        assert report['view'] == reference['view']
        assert report['atlasLod'] == 2 and report['atlasElevation'] == 8
        assert report['gpuReady'] and report['gpuCovered'] and report['state']['ready'] == 1
        assert not report['errors'] and report['webglError'] == 0
        assert report['representation'] == ('background' if mode == 'background' else 'impostor')
        assert report['distanceFade'] == (mode != 'full')
        assert report['distanceFadeRange'] == ([1e8, 1e9] if mode == 'full' else [100, 140])
        assert all(entry['coverage'] == 0 for entry in report['nativeColorCoverage'] if entry['count'])
    images = {mode: Image.open(root / f'{distance}-{mode}.png').convert('RGB') for mode in reports}
    assert len({image.size for image in images.values()}) == 1
    width, height = images['full'].size
    images = {mode: image.crop((400, 0, width, height)) for mode, image in images.items()}
    masks, energy = {}, {}
    for mode in ('full', 'faded'):
        difference = ImageChops.difference(images[mode], images['background'])
        energy[mode] = sum(ImageStat.Stat(difference).sum)
        channels = difference.split()
        peak = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
        masks[mode] = {i for i, value in enumerate(peak.getdata()) if value}
    assert masks['full'], 'Control tree must remain visible: fog cannot prove the cutoff'
    # MSAA leaves partial coverage in most pixels at intermediate dithering;
    # nonzero pixel count is not an estimate of coverage. Measure RGB difference
    # energy against the identical background, retaining exact endpoint checks.
    ratio = energy['faded'] / energy['full']
    if distance == 100:
        assert images['full'].tobytes() == images['faded'].tobytes()
    elif distance == 120:
        assert .35 < ratio < .65, f'Expected partial screen-door coverage, got {ratio}'
    else:
        assert images['faded'].tobytes() == images['background'].tobytes()
    rows.append({'distance': distance, 'fullPixels': len(masks['full']),
                 'fadedPixels': len(masks['faded']), 'rgbDifferenceEnergyRatio': ratio})
assert not json.loads((root / 'console.json').read_text(encoding='utf-8'))
reference_equal = None
if args.reference:
    old_report = json.loads(args.reference.with_suffix('.json').read_text(encoding='utf-8'))
    new_report = json.loads((root / '120-full.json').read_text(encoding='utf-8'))
    assert all(old_report[key] == new_report[key] for key in ('camera', 'view', 'atlasLod', 'atlasElevation', 'representation'))
    old = Image.open(args.reference).convert('RGB')
    new = Image.open(root / '120-full.png').convert('RGB')
    assert old.size == new.size
    box = (400, 0, old.width, old.height)
    assert old.crop(box).tobytes() == new.crop(box).tobytes()
    reference_equal = True
summary = {'rows': rows, 'earlierUnfadedWorldPixelsEqual': reference_equal, 'scope': 'One stationary day view; real GPU pixels outside QA panel; '
           'isolated fade interval 100–140, same shader as native adapter', 'errors': []}
(root / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps(summary, indent=2))

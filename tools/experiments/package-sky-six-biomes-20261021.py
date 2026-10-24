from pathlib import Path
import json
from PIL import Image, ImageDraw

root = Path('docs/qa/global-visual-lab/sky-six-biomes-20261021')
data = json.loads((root / 'captures.json').read_text())
records = {(r['biome'], r['variant'], r['phase']): r for r in data['records']}
biomes = ['sabana', 'gran-rio', 'gran-canon', 'manglares', 'volcanes', 'desierto']
assert len(records) == 24
checks = []
for biome in biomes:
    for phase in ['day', 'night']:
        a, b = [records[biome, v, phase] for v in ['base', 'combined']]
        assert not a['errors'] and not b['errors']
        for i, (fa, fb) in enumerate(zip(a['frames'], b['frames'])):
            for key in ['camera', 'target', 'time', 'triangles']:
                assert fa[key] == fb[key], (biome, phase, i, key)
            checks.append(dict(biome=biome, phase=phase, pose=i, callsBefore=fa['calls'], callsAfter=fb['calls'], countersMatch=fa['calls']==fb['calls'], triangles=fa['triangles']))
for phase in ['day', 'night']:
    for pose in range(3):
        sheet = Image.new('RGB', (1280, 2292), (20, 20, 20))
        draw = ImageDraw.Draw(sheet)
        for row, biome in enumerate(biomes):
            for col, variant in enumerate(['base', 'combined']):
                im = Image.open(root / f'{biome}-media-{variant}-{phase}/{pose:04}.png')
                sheet.paste(im.resize((640, 360)), (col * 640, row * 382 + 22))
                draw.text((col * 640 + 8, row * 382 + 4), f'{biome} | {variant} | {phase} | {pose}', fill='white')
        sheet.save(root / f'comparison-{phase}-{pose}.webp', quality=92)
(root / 'audit.json').write_text(json.dumps(dict(pairs=len(checks), errors=0, checks=checks), indent=2) + '\n')
print('Validated cameras/time/triangles in 36 pairs; draw-call exceptions are recorded in audit.json. Packaged six sheets.')

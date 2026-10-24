"""Require all 18 original observations before publishing profile coverage."""
import json
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

root = Path(__file__).resolve().parents[2] / 'docs/qa/loading-production-variants'
rows = []
missing = []
for biome in ['sabana', 'gran-rio', 'manglares', 'desierto', 'volcanes', 'gran-canon']:
    for quality in ['baja', 'media', 'alta']:
        suffix = 'baseline-inventory' if quality == 'media' else f'baseline-{quality}-inventory'
        path = root / f'{biome}-{suffix}.json'
        if not path.exists():
            missing.append(path.name)
            continue
        data = json.loads(path.read_text(encoding='utf-8'))
        if (data['biome'], data['quality']) != (biome, quality):
            raise ValueError(f'Unexpected scenario in {path}')
        query = parse_qs(urlsplit(data['url']).query)
        if any(query.get(key) == ['1'] for key in ['productionGroundSource', 'sharedSmoothProgram']):
            raise ValueError(f'Candidate enabled in original observation: {path}')
        r = data['result']
        inventory = r['programInventory']
        world = [x for x in inventory['links'] if x['context'] == 0]
        fingerprints = {tuple(s['hash'] for s in x['shaders']) for x in world}
        rows.append({'biome': biome, 'quality': quality, 'report': path.name,
                     'chunks': r['chunks'], 'linksAllContexts': len(inventory['links']),
                     'worldLinks': len(world), 'worldUniqueFingerprintPairs': len(fingerprints),
                     'worldLateLinks': sum(bool(x['afterReady']) for x in world),
                     'readyMsDiagnosticOnly': r['loading']['readyMs'],
                     'nonX4000Entries': [x for x in data['errors'] if 'warning X4000' not in x]})
if missing:
    raise SystemExit('Incomplete original matrix; no summary written: ' + ', '.join(missing))
result = {'scope': '18 original diagnostic opening loads, not interleaved speed comparisons or full gameplay validation. Fingerprints do not establish cache equivalence.', 'rows': rows}
(root / 'original-profile-matrix.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
print(json.dumps(rows, indent=2))

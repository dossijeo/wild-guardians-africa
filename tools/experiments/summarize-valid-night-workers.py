"""Verify actual home arrivals in corrected night fixtures, not just ready rigs."""
import hashlib
import json
from pathlib import Path

root = Path('docs/qa/global-visual-lab/current-review-20261025')
manifest = json.loads((root / 'low-night-fixtures.json').read_text(encoding='utf-8'))
rows = []
for item in manifest['fixtures']:
    biome = item['biome']
    source_bytes = Path(item['source']).read_bytes()
    fixture_bytes = Path(item['output']).read_bytes()
    assert hashlib.sha256(source_bytes).hexdigest() == item['sourceSha256']
    assert hashlib.sha256(fixture_bytes).hexdigest() == item['outputSha256']
    source = json.loads(json.loads(source_bytes.decode('utf-8'))['timing']['navigationContext']['state'])
    fixture = json.loads(json.loads(fixture_bytes.decode('utf-8'))['timing']['navigationContext']['state'])
    assert {k: v for k, v in source.items() if k != 'time'} == {k: v for k, v in fixture.items() if k != 'time'}
    report_path = root / f'{biome}-valid-night-active-roundtrips.json'
    if not report_path.exists():
        rows.append({'biome': biome, 'passed': False, 'status': 'missing completed report', 'workers': []})
        continue
    report = json.loads(report_path.read_text(encoding='utf-8'))
    result = report['result']
    stream = result['streaming']
    errors = [e for e in report['errors'] if 'X4000' not in e]
    villages = {v['id']: v for v in fixture['villages']}
    workers = {w['id']: w for w in fixture['workers']}
    arrivals = []
    for actual in stream['workersAfter']:
        village = villages[workers[actual['id']]['villageId']]
        home = village.get('entry', village)
        arrivals.append({'id': actual['id'], 'status': actual['status'],
                         'atHome': actual['status'] == 'home' and
                         abs(actual['x'] - home['x']) < 1e-6 and abs(actual['z'] - home['z']) < 1e-6})
    passed = (not errors and stream['farSettled'] and stream['pausedFrames'] == 0
              and len(stream['legs']) == 12 and stream['actorsReadyFrames'] == 12
              and len(arrivals) == len(workers) and all(w['atHome'] for w in arrivals))
    rows.append({'biome': biome, 'passed': passed, 'sourceSha256': item['sourceSha256'],
                 'fixtureSha256': item['outputSha256'], 'errors': errors, 'workers': arrivals,
                 'elapsed': [stream['initialElapsed'], stream['elapsed']],
                 'created': stream['created'], 'pausedLegSamples': stream['pausedFrames'],
                 'nativeCounts': [leg['resident'] for leg in stream['legs']],
                 'graphicsCounts': [len(leg['keys']) for leg in stream['legs']],
                 'memoryBytes': [leg['memoryBytes'] for leg in stream['legs']],
                 'terrainCamera': stream['options']['terrainCamera'], 'hardware': stream['hardware']})

(root / 'valid-night-six-biome-workers.json').write_text(json.dumps({
    'scope': 'Correct UTF-8 source state, night/low, six active round trips per biome. '
             'Pauses sampled at leg boundaries. Actual worker home positions checked. '
             'No AB performance or artwork equivalence claim.', 'runs': rows,
}, indent=2) + '\n', encoding='utf-8', newline='\n')
for row in rows:
    print(row['biome'], 'PASS' if row['passed'] else 'INCOMPLETE', row['workers'])
assert all(row['passed'] for row in rows), 'Inspect incomplete movement/streaming evidence'

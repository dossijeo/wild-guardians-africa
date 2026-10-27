"""Validate the stationary A/B/A/B mask protocol before reporting costs."""
import json
from pathlib import Path
from urllib.parse import urlsplit, parse_qsl
root = Path('docs/qa/global-visual-lab/current-review-20261025')
rows = []
reference = None
for name in ('a1', 'b1', 'a2', 'b2'):
    report = json.loads((root / f'sabana-resident-mask-cost-{name}.json').read_text(encoding='utf-8'))
    stream = report['result']['streaming']
    query = dict(parse_qsl(urlsplit(report['url']).query))
    enabled = query.pop('groundResidentMask')
    assert enabled == ('1' if name.startswith('b') else '0')
    assert not [e for e in report['errors'] if 'X4000' not in e]
    assert stream['created'] == 0 and stream['farSettled']
    assert stream['elapsed'] == stream['initialElapsed']
    assert stream['summary']['frames']['count'] == 360
    assert stream['gpu']['supported'] and stream['gpu']['disjoint'] == 0
    state = {'query': query, 'hardware': stream['hardware'], 'camera': stream['cameraOrigin'],
             'target': stream['targetOrigin'], 'options': stream['options'],
             'workersBefore': stream['workersBefore'], 'workersAfter': stream['workersAfter'],
             'initialElapsed': stream['initialElapsed']}
    if reference is None:
        reference = state
    assert state == reference, name
    rows.append({'run': name, 'mask': enabled, 'presentationMs': stream['summary']['frames'],
                 'gpuElapsedMs': stream['gpu']['summary'], 'cpuScopes': stream['summary'],
                 'hardware': stream['hardware']})
(root / 'sabana-resident-mask-cost-summary.json').write_text(json.dumps({
    'scope': 'Stationary, paused, 360 frames after 60 warm frames, no recording. GPU elapsed includes pipeline bubbles. No FPS improvement claim. Dynamic hole-fill work is not measured here.',
    'protocolVerified': True, 'runs': rows}, indent=2) + '\n', encoding='utf-8', newline='\n')
for row in rows:
    print(row['run'], 'GPU', round(row['gpuElapsedMs']['mean'], 3),
          'RAF', round(row['presentationMs']['mean'], 3),
          'p95', round(row['presentationMs']['p95'], 3))

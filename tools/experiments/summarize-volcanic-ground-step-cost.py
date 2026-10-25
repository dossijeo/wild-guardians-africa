"""Validate the stationary A/B/A/B ground precision protocol before reporting costs."""
import json, sys
from pathlib import Path
from urllib.parse import urlsplit, parse_qsl
root = Path('docs/qa/global-visual-lab/current-review-20261025')
prefix = sys.argv[1] if len(sys.argv) > 1 else 'volcanes-ground-step-cost'
assert prefix in ('volcanes-ground-step-cost', 'volcanes-oblique-cost', 'sabana-seam-cost', 'gran-rio-seam-cost')
savanna = prefix == 'sabana-seam-cost'
river = prefix == 'gran-rio-seam-cost'
rows = []
reference = None
for name in ('a1', 'b1', 'a2', 'b2'):
    report = json.loads((root / f'{prefix}-{name}.json').read_text(encoding='utf-8'))
    stream = report['result']['streaming']
    query = dict(parse_qsl(urlsplit(report['url']).query))
    step = report['groundStep']
    assert step == (16 if name.startswith('b') else 32)
    assert query['groundResidentMask'] == '1'
    assert report['biome'] == ('sabana' if savanna else 'gran-rio' if river else 'volcanes') and report['quality'] == ('media' if river else 'baja')
    assert not [e for e in report['errors'] if 'X4000' not in e]
    assert stream['created'] == 0 and stream['farSettled']
    if prefix in ('volcanes-oblique-cost', 'sabana-seam-cost', 'gran-rio-seam-cost'):
        assert stream['options']['pose']
        assert stream['cameraOrigin'] == stream['options']['pose']['camera']
        assert stream['targetOrigin'] == stream['options']['pose']['target']
        assert not stream['posePreparation']['stream']['busy']
        assert stream['posePreparation']['stream']['queued'] == 0
    assert stream['elapsed'] == stream['initialElapsed']
    assert stream['summary']['frames']['count'] == (372 if savanna or river else 360)
    assert stream['gpu']['supported'] and stream['gpu']['disjoint'] == 0
    state = {'query': query, 'hardware': stream['hardware'], 'camera': stream['cameraOrigin'],
             'target': stream['targetOrigin'], 'options': stream['options'],
             'workersBefore': stream['workersBefore'], 'workersAfter': stream['workersAfter'],
             'initialElapsed': stream['initialElapsed']}
    if reference is None:
        reference = state
    assert state == reference, name
    rows.append({'run': name, 'groundStep': step, 'presentationMs': stream['summary']['frames'],
                 'gpuElapsedMs': stream['gpu']['summary'], 'cpuScopes': stream['summary'],
                 'hardware': stream['hardware'], 'posePreparation': stream.get('posePreparation')})
(root / f'{prefix}-summary.json').write_text(json.dumps({
    'scope': 'Stationary, paused, 360 authored frames after 60 warm frames (Sabana and Gran Rio add 12 idle confirmation frames), no recording. GPU elapsed includes pipeline bubbles. No FPS improvement claim. Only ground geometry sampling changes. Moving camera and generation cost are not measured here.',
    'protocolVerified': True, 'runs': rows}, indent=2) + '\n', encoding='utf-8', newline='\n')
for row in rows:
    print(row['run'], 'GPU', round(row['gpuElapsedMs']['mean'], 3),
          'RAF', round(row['presentationMs']['mean'], 3),
          'p95', round(row['presentationMs']['p95'], 3))

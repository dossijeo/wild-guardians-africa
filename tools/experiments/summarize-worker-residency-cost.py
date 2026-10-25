"""Summarize interleaved actor-residency runs without accepting invalid controls."""
import json
from pathlib import Path

root = Path('docs/qa/global-visual-lab/current-review-20261025')
rows = []
for name in ('a1', 'b1', 'a2', 'b2'):
    path = root / f'manglares-worker-residency-cost-{name}.json'
    if not path.exists():
        rows.append({'run': name, 'complete': False})
        continue
    report = json.loads(path.read_text(encoding='utf-8'))
    result = report['result']
    stream = result['streaming']
    errors = [e for e in report['errors'] if 'X4000' not in e]
    valid = (not errors and stream['pausedFrames'] == 0 and
             stream['actorsReadyFrames'] == 180 and stream['farSettled'] and
             stream['elapsed'] > stream['initialElapsed'])
    rows.append({'run': name, 'complete': True, 'validControl': valid,
                 'enabled': result['workerResidency']['enabled'],
                 'hardware': stream['hardware'], 'options': stream['options'],
                 'camera': stream['cameraOrigin'], 'target': stream['targetOrigin'],
                 'created': stream['created'], 'pausedFrames': stream['pausedFrames'],
                 'actorsReadyFrames': stream['actorsReadyFrames'], 'errors': errors,
                 'cpuAndPresentation': stream['summary'],
                 'gpu': stream['gpu'], 'native': stream['final'],
                 'retained': result['workerResidency']['retained']})
complete = all(row['complete'] for row in rows)
comparable = complete and all(row['validControl'] for row in rows)
if comparable:
    reference = rows[0]
    comparable = (all(row['enabled'] == row['run'].startswith('b') for row in rows)
                  and all(all(row[k] == reference[k] for k in
                              ('hardware', 'options', 'camera', 'target', 'created')) for row in rows))
output = {'complete': complete, 'protocolComparable': comparable,
          'scope': 'Single A/B/A/B active daytime pilot. Same authored camera frames, not wall-clock-identical simulation states. GPU elapsed queries include pipeline bubbles. No automatic improvement claim.',
          'runs': rows}
(root / 'manglares-worker-residency-cost-summary.json').write_text(
    json.dumps(output, indent=2) + '\n', encoding='utf-8', newline='\n')
for row in rows:
    print(row['run'], 'complete' if row['complete'] else 'pending',
          row.get('validControl'), row.get('created'))
print('Protocol comparable:', comparable)

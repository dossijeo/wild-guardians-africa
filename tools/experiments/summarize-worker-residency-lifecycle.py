"""Verify bounded round trips and exit; no FPS or exhaustive leak claim."""
import json
from pathlib import Path

root = Path('docs/qa/global-visual-lab/current-review-20261025')
results = []
for biome in ('sabana', 'manglares'):
    exit_name = f'{biome}-worker-retention-exit' + ('-current' if biome == 'sabana' else '')
    exit_report = json.loads((root / f'{exit_name}.json').read_text(encoding='utf-8'))
    travel = json.loads((root / f'{biome}-worker-retention-roundtrips.json').read_text(encoding='utf-8'))
    for report in (exit_report, travel):
        assert not [e for e in report['errors'] if 'X4000' not in e], report['errors']
    closed = exit_report['result']['exit']
    assert closed['before'] == 2 and closed['worldDisposed'] and closed['menu']
    assert closed['nativeRetentionBefore']['retained'] > 0
    assert closed['nativeRetentionAfter'] == {'demand': 0, 'retained': 0}
    assert closed['workers'] == closed['lateInstalls'] == 0
    assert closed['nativeStatus'] == 5 and closed['schedulerAfterExit']['pending'] == 0
    stream = travel['result']['streaming']
    assert stream['initialElapsed'] == stream['elapsed'], 'This is the paused lifetime control'
    assert stream['farSettled'] and stream['options']['completeLegs']
    legs = stream['legs']
    assert len(legs) == 6
    for leg in legs:
        assert leg['resident'] == len(leg['keys']) + len(leg['nativeOnly'])
    for parity in (0, 1):
        repeated = legs[parity::2]
        assert repeated[0]['keys'] == repeated[1]['keys'] == repeated[2]['keys']
        assert len({l['resident'] for l in repeated}) == 1
        assert len({l['resources']['textures'] for l in repeated}) == 1
        assert len({l['resources']['programs'] for l in repeated}) == 1
        assert repeated[-1]['resources']['geometries'] <= repeated[0]['resources']['geometries']
    results.append({'biome': biome, 'exit': closed,
                    'roundTrips': [{k: v for k, v in leg.items() if k != 'keys'} for leg in legs]})

(root / 'worker-residency-lifecycle-summary.json').write_text(json.dumps({
    'scope': 'Two biomes, three paused round trips each, and exit after quality change with native work. '
             'Resource counts are not memory bytes. No AB performance or exhaustive leak conclusion.',
    'runs': results,
}, indent=2) + '\n', encoding='utf-8', newline='\n')
print('Validated two exits and six round trips; see scope and raw reports.')

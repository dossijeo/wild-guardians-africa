"""Summarize complete serial runs; RAF intervals are not GPU execution times."""
import argparse
import json
import math
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--prefix', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2] / 'docs/qa/loading-production-variants'

def cadence(frames):
    values = sorted(b['timestamp'] - a['timestamp'] for a, b in zip(frames, frames[1:]))
    if not values:
        raise ValueError('Missing frame samples')
    return {**{f'p{p}': values[max(0, math.ceil(len(values)*p/100)-1)] for p in [50,95,99]},
            'max': max(values), 'intervalCount': len(values)}

rows = []
for run in ['a1', 'b1', 'a2', 'b2']:
    data = json.loads((root / f'{args.prefix}-{run}.json').read_text(encoding='utf-8'))
    r = data['result']
    if r.get('programInventory'):
        raise ValueError('Timing run contains GL inventory instrumentation')
    post = r['postReady']
    post_frames = ([post['lastLoadingFrame']] if post.get('lastLoadingFrame') else []) + post['frames']
    rows.append({'run': run, 'biome': data['biome'], 'quality': data['quality'],
                 'readyMs': r['loading']['readyMs'], 'chunks': r['chunks'],
                 'loadingCadence': cadence(r['loading']['frames']),
                 'postReadyCadenceIncludingBoundary': cadence(post_frames),
                 'phases': {x['label']: x['ms'] for x in r['loading']['phases']},
                 'consoleEntries': data['errors']})
if len({(r['biome'], r['quality'], r['chunks']) for r in rows}) != 1:
    raise ValueError('Run conditions differ')
pairs = [{'pair': i+1, 'readySavedMs': a['readyMs']-b['readyMs'],
          'worldCompileWallSavedMs': a['phases']['warm-compile-world']-b['phases']['warm-compile-world']}
         for i,(a,b) in enumerate(zip(rows[::2],rows[1::2]))]
output = {'scope': 'Serial A/B/A/B; phase wall time includes waits, RAF cadence is not GPU time. Post-ready includes the last loading-frame boundary.',
          'runs': rows, 'pairs': pairs}
(root / f'{args.prefix}-summary.json').write_text(json.dumps(output, indent=2)+'\n', encoding='utf-8')
print(json.dumps(pairs, indent=2))

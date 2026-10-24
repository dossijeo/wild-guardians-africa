"""Temporal attribution only: overlapping spans do not establish ownership."""
import argparse
import json
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('report', type=Path)
args = p.parse_args()
r = json.loads(args.report.read_text(encoding='utf-8'))['result']
links = [x for x in r['programInventory']['links'] if x['context'] == 0]
spans = [s for s in r['farPreparationSpans'] if s['label'].startswith('far-gpu:compile:')]
rows = []
for s in spans:
    matches = [x['id'] for x in links if s['start'] <= x['start'] <= s['end']]
    rows.append({'label': s['label'], 'start': s['start'], 'end': s['end'],
                 'durationMs': s['duration'], 'beforeReady': s['end'] <= r['postReady']['readyAt'],
                 'temporallyMatchingLinks': matches,
                 'overlappingCompileSpans': sum(t is not s and t['start'] < s['end'] and s['start'] < t['end'] for t in spans)})
empty = [x for x in rows if not x['temporallyMatchingLinks']]
result = {'scope': 'Temporal correlation, not GPU duration or exclusive attribution. No-link spans may still check existing programs and cannot automatically be removed.',
          'compileSpans': len(rows), 'spansWithoutNewLinks': len(empty),
          'noLinkWallSumMs': sum(x['durationMs'] for x in empty),
          'noLinkWallMaxMs': max((x['durationMs'] for x in empty), default=0), 'rows': rows}
destination = args.report.with_name(args.report.stem + '-links.json')
destination.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k != 'rows'}, indent=2))

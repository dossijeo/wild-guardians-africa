"""Compare equivalent profile inventories; diagnostic times are not speed claims."""
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--quality', choices=['baja', 'media', 'alta'], required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2] / 'docs/qa/loading-production-variants'
rows = []
for biome in ['sabana', 'gran-rio', 'manglares', 'desierto', 'volcanes', 'gran-canon']:
    row = {'biome': biome}
    for label, suffix in [('original', 'baseline'), ('candidate', 'pruned')]:
        path = root / f'{biome}-{suffix}-{args.quality}-inventory.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        if data['biome'] != biome or data['quality'] != args.quality:
            raise ValueError(f'Unexpected conditions in {path}')
        result = data['result']
        links = result['programInventory']['links']
        row[label] = {
            'chunks': result['chunks'], 'links': len(links),
            'lateLinks': sum(bool(link['afterReady']) for link in links),
            'lateContexts': sorted(link['context'] for link in links if link['afterReady']),
            'readyMs': result['loading']['readyMs'],
            'consoleEntries': len(data['errors']),
            'nonX4000Entries': [entry for entry in data['errors'] if 'warning X4000' not in entry],
        }
    row['sameCounts'] = all(row['original'][key] == row['candidate'][key]
                            for key in ['chunks', 'links', 'lateLinks', 'lateContexts'])
    rows.append(row)
output = {'scope': 'Single diagnostic runs: program-count comparison only, not performance or visual equivalence.',
          'quality': args.quality, 'biomes': rows}
destination = root / f'comparison-{args.quality}-inventory.json'
destination.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
print(json.dumps(output, indent=2))

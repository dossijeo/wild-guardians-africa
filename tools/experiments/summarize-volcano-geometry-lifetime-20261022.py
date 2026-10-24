import json
from collections import Counter
from pathlib import Path

root = Path('docs/qa/global-visual-lab/volcano-geometry-lifetime-20261022')
records = json.loads((root / 'geometries.json').read_text(encoding='utf-8'))['records']
def census(snapshot):
    return Counter(json.dumps(g, sort_keys=True) for g in snapshot['geometries'])
def difference(a, b):
    return [{'count': n, 'geometry': json.loads(k)} for k, n in (a-b).items()]
result = {'records': [], 'repeats': []}
previous = {}
for r in records:
    a, b = census(r['first']), census(r['late'])
    assert not r['errors']
    assert sum(a.values()) == r['first']['count']
    assert sum(b.values()) == r['late']['count']
    key = (r['quality'], r['phase'])
    result['records'].append({'quality': key[0], 'phase': key[1],
        'first': sum(a.values()), 'late': sum(b.values()),
        'removedDuringWait': difference(a,b), 'addedDuringWait': difference(b,a)})
    if key in previous:
        result['repeats'].append({'quality': key[0], 'phase': key[1],
            'onlyFirst': difference(previous[key],a), 'onlyRepeat': difference(a,previous[key])})
    previous[key] = a
result['complete'] = len(records) == 8
(root/'summary.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(result,indent=2))

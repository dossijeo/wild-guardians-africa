import json
from collections import defaultdict
from pathlib import Path
p=Path('docs/qa/global-visual-lab/savanna-draw-attribution')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));out=[]
assert len(d['records'])==2
for r in d['records']:
 assert not r['errors'] and len(r['frames'])==3
 for f in r['frames']:
  a=f['attribution'];assert not a['glError'] and not f['glError']
  assert sum(x['calls'] for x in a['rows'])==a['total']['calls']
  assert sum(x['triangles'] for x in a['rows'])==a['total']['triangles']
  grouped=defaultdict(lambda:dict(calls=0,triangles=0))
  for x in a['rows']:
   key=' / '.join([x['target'],x['object'],x['material'],'ground' if x['ground'] else 'other'])
   for k in ['calls','triangles']:grouped[key][k]+=x[k]
  out.append(dict(phase=r['phase'],view=f['i'],total=a['total'],groups=sorted([dict(group=k,**v) for k,v in grouped.items()],key=lambda x:-x['triangles'])))
(p/'summary.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n')
for x in out:
 print(x['phase'],x['view'],x['total'])
 for g in x['groups'][:6]:print(g)

from pathlib import Path
from collections import Counter
import json
root=Path('docs/qa/global-visual-lab/sky-draw-diagnostic-20261021')
d=json.loads((root/'captures.json').read_text());a,b=d['records']
assert a['variant']=='base' and b['variant']=='combined'
assert not a['errors'] and not b['errors']
assert len(a['frames'])==len(b['frames'])==24
checks=[]
for i,(fa,fb) in enumerate(zip(a['frames'],b['frames'])):
 for k in ['camera','target','time','calls','triangles']:assert fa[k]==fb[k],(i,k)
 # These four WebGL2 draw entry points are used by the current Three renderer.
 ca=Counter((x['name'],tuple(x['args'])) for x in fa['draws'])
 cb=Counter((x['name'],tuple(x['args'])) for x in fb['draws'])
 assert ca==cb,i
 checks.append(dict(frame=i,drawCalls=len(fa['draws']),sceneCalls=fa['calls'],sameDrawOrder=fa['draws']==fb['draws']))
(root/'audit.json').write_bytes((json.dumps(checks,indent=2)+'\n').encode())
print('24 matched draw-command multisets; order recorded separately.')

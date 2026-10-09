import json,hashlib,math
from pathlib import Path
p=Path(__file__).resolve().parent;r=json.loads((p/'report.json').read_text());v=r['current'];cancel='cancel' in p.name;f=[x['interval'] for x in r['frames']]
assert r['closed'] and r['cancelled']==cancel and v['error'] is None
if cancel:
 assert not v['ready'] and v['progress']<1
 assert r==json.loads((p/'after-wait.json').read_text())
else:
 assert v['ready'] and v['progress']==1 and not v['pending'] and r['downloads']['failures']==0
 a,b=r['cameraPoses'];assert all(a[k]==b[k] for k in ['eye','quaternion','target'])
result={'source':'3133870e docs-only; production runtime37094d08','scope':'Actual menu manual cancellation during GPU preparation; stableafter5s' if cancel else 'Actual New Volcanes/MusgumV4; native world/HUD inspected by root','progress':v['progress'],'elapsedProgressMs':v['elapsed'],'frames':{'count':len(f),'min':min(f),'max':max(f),'p95':sorted(f)[math.ceil(.95*len(f))-1],'over50':sum(x>50 for x in f),'over100':sum(x>100 for x in f)},'files':[{'name':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(p.iterdir()) if f.name in ['report.json','console.json','ready.jpg','menu.jpg','after-wait.json']]}
(p/'manifest.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

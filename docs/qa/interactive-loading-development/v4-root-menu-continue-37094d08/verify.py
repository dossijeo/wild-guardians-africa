import json,hashlib,math,statistics
from pathlib import Path
p=Path(__file__).resolve().parent;r=json.loads((p/'report.json').read_text());v=r['current'];f=[x['interval'] for x in r['frames']]
assert r['closed'] and not r['cancelled'] and v['ready'] and v['progress']==1 and not v['estimated'] and not v['pending']
assert r['downloads']['pending']==r['downloads']['failures']==0
assert any(x['mode']=='worker' for x in r['snapshotDecode'])
a,b=r['cameraPoses'];assert a['phase']=='before-cinematic' and b['phase']=='cinematic-completed'
assert all(a[k]==b[k] for k in ['eye','quaternion','target'])
q=sorted(f);spans=r['loadingSpans'];markers={s['label']:s for s in spans if s['label'].startswith('app-')}
result={'source':'37094d08','scope':'Actual menu Continue V4 small day1 Savanna/Mapungubwe1500 slot, not dense/browser-mobile/controlpaired/physicalmemory proof','frames':{'count':len(f),'min':min(f),'max':max(f),'p95':q[math.ceil(.95*len(q))-1],'over50':sum(x>50 for x in f),'over100':sum(x>100 for x in f)},'elapsedProgressMs':v['elapsed'],'snapshotDecode':r['snapshotDecode'],'syncAbove50':[{k:s.get(k) for k in ['label','start','end','duration','scope']} for s in spans if s.get('duration',0)>50 and s.get('scope','').startswith('Synchronous')],'lifecycleMarkers':markers,'files':[{'name':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(p.iterdir()) if f.name in ['report.json','console.json','ready.jpg']]}
(p/'manifest.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k in ['frames','elapsedProgressMs','snapshotDecode','syncAbove50']},indent=2))

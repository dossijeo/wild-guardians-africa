from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent
expected='7bd6dbc14d0962b37931d21869c658a827a55a0c43f72c335c9af1481c4c0fdb'
results=[];camera=None
for arm in ['A1','B1','B2','A2']:
 p=root/(arm+'-report.json');d=json.loads(p.read_text(encoding='utf-8'))
 assert d['done'] and not d['errors']
 assert d['snapshot']['sha256']==expected and d['snapshot']['seed']=='712' and d['snapshot']['plants']==0
 events={e['label']:e for e in d['events']}
 click=events['native-continue-click-received'];assert click['trusted'] and click['surface']=='same-origin native-menu iframe'
 ready=events['verified-world-ready'];controls=events['controls-ready'];assert ready['camera']==controls['camera']
 if camera is None:camera=ready['camera']
 assert ready['camera']==camera
 assert abs((ready['at']-click['at'])-d['readyMs'])<.01
 assert abs((controls['at']-d['started'])-d['totalMs'])<.01
 assert 0<=d['started']-click['at']<1
 results.append({'arm':arm,'readyMs':d['readyMs'],'totalMs':d['totalMs'],'postReadyMs':d['totalMs']-d['readyMs'],'frameSummary':d['frameSummary'],'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
print(json.dumps({'verified':'Actual iframe click, exact controlled snapshot SHA, events chronology and exact camera at readiness/completion across four arms. Original RAF/outliers retained.','arms':results,'scope':'A main d6c4adfc versus B41f57d03; feature readiness regression remains open. No RAM/VRAM or statistical equivalence claim.'},indent=2))

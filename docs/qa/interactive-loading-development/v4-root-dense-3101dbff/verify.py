import json,hashlib
from pathlib import Path
p=Path(__file__).resolve().parent;r=json.loads((p/'report.json').read_text());cancel='cancel' in p.name
c=json.loads((p/'cleanup.json').read_text()) if not cancel else r
f=r['frames'];summary={'count':len(f),'max':max(f),'over50':sum(x>50 for x in f),'over100':sum(x>100 for x in f)}
assert summary==r['frameSummary'] and r['done'] and not r['errors']
assert c['disposed'] and c['contextLost'] and c['audioVoicesAfterStop']==0
if cancel:assert r['cancelled'] and r['cancellationDiagnostic']
else:
 assert r['cameraPreserved'] and r['logicalUnchanged'] and r['restoredLogicalUnchanged']
 assert r['progress']['ready'] and not r['progress']['pending'] and r['downloads']['pending']==0
 assert r['archivedSave']['sha256']=='b485768f1cc172c5b174138f2c678e2bfa2d0b544d5316a3e9cb3dddf33f9103'
result={'source':'3101dbffe55cc93fa695c4be75069db9e3778dab','scope':'Early cancel before visible diorama' if cancel else 'Dense V4 fixture restore; synchronous deserialize, not Worker or menu; instrumented, not paired performance','frames':summary,'initializationMs':r.get('initializationMs'),'totalMs':r.get('totalMs'),'archivedSave':r.get('archivedSave'),'cancellationDiagnostic':r.get('cancellationDiagnostic'),'files':[{'path':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(p.iterdir()) if f.name in ['report.json','cleanup.json','console.json','ready.jpg']]}
(p/'manifest.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

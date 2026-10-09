import hashlib,json
from pathlib import Path
p=Path(__file__).resolve().parent
r=json.loads((p/'report.json').read_text());c=json.loads((p/'cleanup.json').read_text())
frames=r['frames'];summary={'count':len(frames),'max':max(frames),'over50':sum(x>50 for x in frames),'over100':sum(x>100 for x in frames)}
assert summary==r['frameSummary']
assert r['done'] and r['cameraPreserved'] and r['logicalUnchanged'] and not r['errors']
assert r['progress']['ready'] and r['progress']['progress']==1 and not r['progress']['pending']
assert c['disposed'] and c['contextLost'] and c['audioVoicesAfterStop']==0
assert r['downloads']['pending']==r['downloads']['networkPending']==r['downloads']['failures']==0
models={}
for suffix,expected in [('8f6c9ef7472a2d7f8ffda7f08a78f8027f91d14a8f92b8eeca4084b0f379da36.glb',14308628),('2fdb3468b7646ebe16d0f3d3d25538ce5b20d6dee1d3830256d2f62599826dcc.glb',26536168)]:
 rows=[x for x in r['downloads']['requests'] if x['url'].endswith(suffix)]
 network=[x for x in rows if x['cache']=='network'];cache=[x for x in rows if x['cache']=='application-cache']
 assert len(rows)==2 and len(network)==1 and network[0]['loaded']==expected,rows
 assert len(cache)==1 and cache[0]['loaded']==0 and cache[0]['cache']=='application-cache',rows
 models[suffix]={'records':len(rows),'networkBodies':len(network),'decodedBodyBytes':network[0]['loaded'],'reuseEvidence':cache[0]['cache']}
result={'source':'3101dbffe55cc93fa695c4be75069db9e3778dab','nativeRootTab':951,'scope':'Instrumented fixture Run, New Savanna/Mapungubwe media; not menu click or paired performance; no physical RAM/VRAM measurement','initializationMs':r['initializationMs'],'totalMs':r['totalMs'],'frames':summary,'models':models,'downloads':{k:v for k,v in r['downloads'].items() if k!='requests'},'preparationExclusiveWaitProxyMs':r['initializationMs']-r['downloads']['observedMs'],'proxyLimit':'Wall readiness minus union of observed transfer intervals; overlaps removed once, not CPU work or a new calibrated recipe','files':[{'path':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(p.iterdir()) if f.name in ['report.json','cleanup.json','console.json','ready.jpg']]}
(p/'manifest.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'frames':summary,'models':models,'preparationExclusiveWaitProxyMs':result['preparationExclusiveWaitProxyMs'],'passed':True},indent=2))

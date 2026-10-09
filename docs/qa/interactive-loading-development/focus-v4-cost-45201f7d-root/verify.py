import json,hashlib,statistics,math
from pathlib import Path
p=Path(__file__).resolve().parent
def describe(values):
 values=sorted(values);return {'count':len(values),'median':statistics.median(values),'p95':values[max(0,math.ceil(.95*len(values))-1)],'max':max(values)}
rows={}
for phase in ['day','night']:
 for arm in ['A1','B1','B2','A2']:
  label=phase+arm;r=json.loads((p/(label+'-report.json')).read_text());c=json.loads((p/(label+'-cleanup.json')).read_text());v=r['visualCost'];g=v['gpu'];frames=v['frames'];measured=[f for f in frames if f['measured']]
  assert v['done'] and len(frames)==v['frame']==540 and len(measured)==300 and len(g['samples'])==300
  assert not any(g[k] for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','pending'])
  assert set(s['frame'] for s in g['samples'])==set(range(120,420))
  assert c['disposed'] and c['resources']=={'geometries':0,'textures':0,'programs':0}
  assert not r.get('error') and not c.get('error')
  assert r['pose']=={'fov':40,'eye':[4.8,3.1,6.4],'angleDegrees':0,'held':False,'reducedMotion':True}
  intervals=[f['rafInterval'] for f in frames if f['rafInterval'] is not None]
  rows[label]={'gpuMs':describe([s['ms'] for s in g['samples']]),'measuredDrawCpuMs':describe([f['drawCpuMs'] for f in measured]),'measuredOverlayCpuMs':describe([f['overlayCpuMs'] for f in measured]),'allDrawCpuMs':describe([f['drawCpuMs'] for f in frames]),'allRafMs':describe(intervals),'allRafOver50':sum(x>50 for x in intervals),'allRafOver100':sum(x>100 for x in intervals),'readyResources':v['ready']['renderer'],'cleanup':c['resources']}
comparisons={}
for phase in ['day','night']:
 pairs=[]
 for a,b in [('A1','B1'),('A2','B2')]:
  av=rows[phase+a]['gpuMs']['median'];bv=rows[phase+b]['gpuMs']['median'];delta=bv-av;percent=delta/av*100
  pairs.append({'reference':a,'candidate':b,'deltaMs':delta,'deltaPercent':percent,'materialCriterion':delta>.5 and percent>5})
 comparisons[phase]={'pairs':pairs,'criterionActivated':all(x['materialCriterion'] for x in pairs),'referenceDriftMs':rows[phase+'A2']['gpuMs']['median']-rows[phase+'A1']['gpuMs']['median']}
result={'baseSource':'3101dbffe55cc93fa695c4be75069db9e3778dab','candidateFocusPatch':'45201f7d1afcde98ccb70ea73041b191d7fa214c','rows':rows,'comparisons':comparisons,'scope':'GPU synchronous diorama draws only; same V4 assets/presentation, no CSS/readiness/world/cold-cache/mobile scope. p95 nearest-rank, medians exact; all recorded RAF and CPU rows retained; null first interval is undefined, not an omitted outlier.','limits':'Practical >5% AND >0.5ms criterion in both orders; not statistical equivalence, cost neutrality or physical RAM/VRAM approval. Reference daytime drift retained.','files':[{'name':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(p.glob('*.json')) if f.name not in ['manifest.json','summary.json']]}
(p/'summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'comparisons':comparisons,'gpuMedians':{k:v['gpuMs']['median'] for k,v in rows.items()},'passed':True},indent=2))

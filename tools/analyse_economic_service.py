# Paired first-cohort evidence. Reads preserved native history only.
import gzip, hashlib, json
from pathlib import Path
base=Path('docs/qa/economic-candidates-a518')
out={'scope':'Ten-day observational pairing, no 100-night/matrix acceptance. First-observed transition times at native callback cadence; queue ages are lower bounds. Actor-seconds are not global elapsed seconds.','cases':[]}
for case,reference in [('baseline-cohort','baseline'),('seed-half-cohort','seed-half-harvest-quarter')]:
 folder=base/case
 summary=json.loads((folder/'service-summary.json').read_text())
 cohort=json.loads((folder/'first-cohort-transitions.json').read_text())
 refhash=hashlib.sha256((base/reference/'state.json').read_bytes()).hexdigest()
 assert summary['completeFinalStateParity'] is True and summary['finalStateSha256']==refhash
 trace=[json.loads(line) for line in gzip.open(folder/'service-trace.jsonl.gz','rt')]
 rows=[]
 for pid in cohort['plantIds']:
  transitions=[x for x in cohort['transitions'] if x['id']==pid]
  def first(fn):
   x=next((x for x in transitions if fn(x)),None)
   return {'day':x['day'],'time':round(x['time'],6),'elapsed':round(x['elapsed'],6)} if x else None
  rows.append({'plantId':pid,'placementFirstObserved':first(lambda x:True),
   'firstWater':first(lambda x:x['water'][0]['status']=='manual'),
   'checkpointDue':first(lambda x:x['water'][1]['status']=='due'),
   'checkpointWater':first(lambda x:x['water'][1]['status']=='manual'),
   'mature':first(lambda x:x['mature']), 'harvestRequested':first(lambda x:x['harvestRequested']),
   'picked':first(lambda x:x['crate'] is not None),
   'delivered':first(lambda x:x['crate'] and x['crate']['delivered'])})
 snapshots=[]
 for t in [60,100,150,200,250,299]:
  s=min((s for s in trace if s['day']==1),key=lambda s:abs(s['time']-t))
  snapshots.append({key:s[key] for key in ['time','living','firstWaterPending','mature','deliveredTotal']}|{'queue':{kind:sum(x['kind']==kind for x in s['tasks']) for kind in ['initial','water','harvest']}})
 out['cases'].append({'case':case,'source':summary['provenance']['gitHead'],'gates':summary['gates'],
  'stateSha256':refhash,'firstDay':summary['rows'][0],'cohort':rows,'day1Snapshots':snapshots,
  'artifactHashes':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in folder.iterdir() if f.is_file()}})
(base/'service-pair-comparison.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'cases':[{'case':c['case'],'firstDay':c['firstDay'],'cohort':c['cohort']} for c in out['cases']]}))

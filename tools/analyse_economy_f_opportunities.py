import gzip,json,hashlib
from pathlib import Path
p=Path('docs/qa/economic-candidates-a518/f-opportunity-diagnostic')
d=json.loads((p/'diagnostic.json').read_text(encoding='utf-8'));dec=[json.loads(x) for x in gzip.open(p/'decisions.jsonl.gz','rt')];states=[json.loads(x) for x in gzip.open(p/'service-states.jsonl.gz','rt')]
assert d['fullStateParity'];assert d['finalStateSha256']=='5fa1a0bebd54299c4abf45f425bc361c46fba12fc5f8c0864145b7528206920f'
bands=[]
for lo,hi in [(1,3),(4,7),(8,10)]:
 a=[x for x in d['daily'] if lo<=x['day']<=hi];native=[x['nativeDay'] for x in a];categories={}
 for row in a:
  for k,v in row['categories'].items():categories[k]=categories.get(k,0)+v
 bands.append({'days':[lo,hi],'inactivitySeconds':sum(x['idle']['budget']+x['idle']['space']+x['idle']['shift-end'] for x in native),'daylightSeconds':len(native)*300,'categories':categories,
  'physicalDeliveries':sum(x['delivered'] for x in native),'paidWages':sum(x['wages'] for x in native),
  'idleWithSeedAndMinimum100Cash':sum(x['idleWithSeedPlusMinimum100Cash'] for x in a),
  'idleWithFullProtectedPlantCash':sum(x['idleWithFullControlReservesSeedCash'] for x in a),
  'idleWithOneAdditionalWorkerRawCash':sum(x['idleWithNativeExtraWorkerCash'] for x in a),
  'idleWithAdditionalWorkerAndExpandedTomorrowReservesCash':sum(x['idleWithExtraWorkerAndExpandedTomorrowReservesCash'] for x in a)})
 for b in bands:b['fraction']=b['inactivitySeconds']/b['daylightSeconds']
service=[]
for day in range(1,11):
 a=[x for x in states if x['day']==day];phases={};elapsed=0;gaps=0
 for prev,x in zip(a,a[1:]):
  dt=x['time']-prev['time']
  if dt>1.000001:gaps+=dt;continue
  assert dt>0;elapsed+=dt
  for k,n in prev['phases'].items():phases[k]=phases.get(k,0)+n*dt
 first=next((x for x in a if x['deliveredTotal']>(a[0]['deliveredTotal'] if a else 0)),None)
 selected=[]
 for t in [10,60,100,150,200,250,299]:
  x=min(a,key=lambda x:abs(x['time']-t));selected.append(x)
 service.append({'day':day,'observedPeacefulElapsedSeconds':elapsed,'unsampledAttackGapSeconds':gaps,'phaseActorSecondsApprox':phases,'firstObservedDeliveryTime':first['time'] if first else None,'maximumInitialQueue':max(x['initialTasks'] for x in a),'maximumWaterQueue':max(x['waterTasks'] for x in a),'maximumHarvestQueue':max(x['harvestTasks'] for x in a),'checkpoints':selected})
assert sum(sum(b['categories'].values()) for b in bands)==880
out={'source':d['provenance']['gitHead'],'finalStateParity':True,'bands':bands,'service':service,'gates':d['gates'],
 'opportunityInterpretation':'Native additional-hiring availability is recorded independently after a tick; raw affordability does not mean preserving control reserves, desired staff or route/plant legality. Full-protected cash is pre-tick arithmetic on the exact controller decision. Policy middayHiring:false stays unchanged and no action was performed for this diagnostic.',
 'durationInterpretation':'Decision seconds match native budget accounting. Actor phase totals are approximate left-endpoint employee-seconds outside observed attacks, not elapsed global time. No interpolation through missing attack intervals.',
 'files':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(p.iterdir()) if f.is_file()}}
(p/'opportunity-analysis.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print(json.dumps({'bands':bands,'gates':d['gates'],'service':[{'day':x['day'],'firstObservedDeliveryTime':x['firstObservedDeliveryTime'],'maximumInitialQueue':x['maximumInitialQueue'],'phases':x['phaseActorSecondsApprox']} for x in service]}))

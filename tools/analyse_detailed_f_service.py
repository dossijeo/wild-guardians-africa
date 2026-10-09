"""Terminal-only analysis of scalar F10 service observations, never replay."""
import gzip,hashlib,json,pathlib,statistics,sys
p=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True);sha=lambda b:hashlib.sha256(b).hexdigest()
receipt=json.loads((p/'receipt.json').read_text());status=json.loads((p/'status.json').read_text());assert status['status']=='terminal'
assert receipt['first10NativePrefixExact'] and receipt['fullFinalStateParity'];assert receipt['stateSha256']=='5fa1a0bebd54299c4abf45f425bc361c46fba12fc5f8c0864145b7528206920f'
for name,expected in receipt['files'].items():assert sha((p/name).read_bytes())==expected,name
data=json.loads(gzip.decompress((p/'lifecycle.json.gz').read_bytes()));frames=[json.loads(line) for line in gzip.decompress((p/'frames.jsonl.gz').read_bytes()).splitlines()]
assert len(frames)==receipt['rows']['frames'];assert len(data['tasks'])==receipt['rows']['tasks']
stat=lambda xs:{'count':len(xs),'median':statistics.median(xs) if xs else None,'p90':sorted(xs)[max(0,int(len(xs)*.9+.999999)-1)] if xs else None,'max':max(xs) if xs else None,'sum':sum(xs)}
earlyTasks=[t for t in data['tasks'] if t['firstObservedDay']<=10];terminalTasks=[t for t in data['tasks'] if t['firstObservedDay']>10];kinds={}
for kind in ['initial','water','harvest','crate','repair']:
 tasks=[t for t in earlyTasks if t['kind']==kind];complete=[t for t in tasks if t['removal'] and t['removal']['evidence']]
 kinds[kind]={'tasksObserved':len(tasks),'evidencedCompletionOrPickup':len(complete),'removedUnknownCensored':sum(bool(t['removal'] and not t['removal']['evidence']) for t in tasks),'stillPresentAtStop':sum(t['removal'] is None for t in tasks),
 'observedDaylightUnreservedTaskSeconds':stat([t['daylightSeconds']['unreserved'] for t in tasks]),'observedDaylightReservedTaskSeconds':stat([t['daylightSeconds']['reserved'] for t in tasks]),
 'firstObservedToFirstReservationUpperEndpointSeconds':stat([t['firstReservationInterval'][1]-t['firstObservedAt'] for t in tasks if t['firstReservationInterval']]),
 'firstObservedToEvidencedRemovalUpperEndpointSeconds':stat([t['removal']['interval'][1]-t['firstObservedAt'] for t in complete]),
 'longestObservedDaylightUnreserved':sorted([{'id':t['id'],'targetId':t['targetId'],'createdOrder':t.get('created'),'firstObservedDay':t['firstObservedDay'],'daylight':t['daylightSeconds'],'removal':t['removal']} for t in tasks],key=lambda t:t['daylight']['unreserved'],reverse=True)[:5]}
days=[d for d in data['days'] if d['day']<=10]
walking={};stamina=[]
for day in range(1,11):
 rows=[f for f in frames if f['day']==day and f['time']<300 and not f['raid']];sampleCounts={'walking':0,'walkingQuotaExhausted':0,'walkingRunningFlagTrue':0}
 for frame in rows:
  for w in frame['workerSamples']:
   if w['contractDay']!=day or w['status']!='walking':continue
   sampleCounts['walking']+=1;sampleCounts['walkingQuotaExhausted']+=int(w['runRemaining'] is not None and w['runRemaining']<=1e-9);sampleCounts['walkingRunningFlagTrue']+=int(w['running'] is True)
 stamina.append({'day':day,'oneSecondSnapshotWorkerCounts':sampleCounts,'scope':'Unweighted worker-sample counts before300, no interpolation or unique-person interpretation; runRemaining/running are actual copied fields.'})
for row in days:
 for phase,value in row['movement'].items():
  if not phase.startswith('walking:'):continue
  agg=walking.setdefault(phase,{k:0 for k in value})
  for k,v in value.items():agg[k]+=v
result={'producerSource':receipt['source'],'observerFiles':receipt['observerFiles'],'terminalReceiptSha256':sha((p/'receipt.json').read_bytes()),'stateParity':True,'first10PrefixExact':True,
 'gates':receipt['gates'],'activity':receipt['activity'],'measuredWallMs':receipt['wallMs'],'taskKinds':kinds,'days':days,'gaps':data['gaps'],
 'observedTaskIDs':len(data['tasks']),'earlyTaskIDs':len(earlyTasks),'terminalDay11FirstObservedTaskIDs':len(terminalTasks),'terminalDay11Callbacks':sum(f['day']==11 for f in frames),
 'walkingMotionSummary':walking,'staminaSnapshots':stamina,
 'possibleEventBufferSaturationFrames':sum(f['possibleEventBufferSaturation'] for f in frames),
 'unknowns':data['unknowns']+['Individual delivered-crate event times are not retained in these frames; crate pickup and carry phase do not prove a particular paid-delivery latency.','Aggregate movement uses straight endpoint displacement per callback, so zero displacement does not identify private search/collision/yield cause.','Creation-order FIFO is preserved in production; observational task ages are sampled lower bounds and censored after raid/task replacement, not native creation timestamps.'],
 'scope':'One native exact F10 detailed read-only control, not late100 proof. No strategy/seed/parameter/domain alteration or balance promotion. Durations are observed queue/actor-seconds and first-observed intervals; not global/substep-perfect time. Failed early idle gate preserved.'}
(out/'detailed-service-analysis.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'tasks':{k:{field:v[field] for field in ['tasksObserved','evidencedCompletionOrPickup','removedUnknownCensored','stillPresentAtStop','firstObservedToFirstReservationUpperEndpointSeconds']} for k,v in kinds.items()},'gates':receipt['gates'],'wallMs':receipt['wallMs']}))

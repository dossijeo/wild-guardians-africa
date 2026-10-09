"""Reanalyse retained F10 observations; no simulation and no invented task IDs."""
import gzip,hashlib,json,pathlib,subprocess
root=pathlib.Path('docs/qa/economic-candidates-a518');p=root/'f-opportunity-diagnostic';out=root/'f-service-reuse';out.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest();original={x.name:sha(x.read_bytes()) for x in p.iterdir() if x.is_file()}
old=json.loads((p/'opportunity-analysis.json').read_text());diag=json.loads((p/'diagnostic.json').read_text())
for name,expected in old['files'].items():assert sha((p/name).read_bytes())==expected,name
report=json.loads(gzip.decompress((root/'f100-terminal/gran-canon-saheliana-report.json.gz').read_bytes()))
assert diag['provenance']['gitHead']=='2346fbd791df2da2c7faef7db11fdb6f9672c8a6'
hashes=diag['provenance']['sourceHashes'];assert hashes==report['provenance']['sourceHashes'];source=diag['provenance']['gitHead']
batch=subprocess.check_output(['git','cat-file','--batch'],input=''.join(source+':'+f+'\n' for f in hashes).encode());cursor=0
for path,expected in hashes.items():
 e=batch.index(b'\n',cursor);header=batch[cursor:e].decode().split();assert header[1]=='blob';n=int(header[2]);start=e+1;assert sha(batch[start:start+n])==expected,path;cursor=start+n+1
assert cursor==len(batch)
rawState=(root/'harvest-triple-half-structure-damage/state.json').read_bytes()
assert sha(rawState)==diag['finalStateSha256']=='5fa1a0bebd54299c4abf45f425bc361c46fba12fc5f8c0864145b7528206920f'
assert diag['fullStateParity'];assert [x['nativeDay'] for x in diag['daily']]==report['daily'][:10]
states=[json.loads(x) for x in gzip.decompress((p/'service-states.jsonl.gz').read_bytes()).splitlines()]
decisions=[json.loads(x) for x in gzip.decompress((p/'decisions.jsonl.gz').read_bytes()).splitlines()]
assert len(states)==2999 and len(decisions)==3000
rows=[]
for day in range(1,11):
 samples=[x for x in states if x['day']==day];native=report['daily'][day-1]
 phase={};globalSeconds=0;gaps=[]
 for left,right in zip(samples,samples[1:]):
  dt=right['time']-left['time'];assert dt>0
  if dt>1.00000001:gaps.append({'from':left['time'],'to':right['time'],'seconds':dt});continue
  globalSeconds+=dt
  for key,count in left['phases'].items():phase[key]=phase.get(key,0)+count*dt
 aggregate={k:sum(v for phaseKey,v in phase.items() if phaseKey.split(':')[0]==k) for k in ['walking','acting','carrying','idle','arriving','waiting','fleeing','returning','incapacitated']}
 before=sum(report['daily'][i]['delivered'] for i in range(day-1));first=next((x['time'] for x in samples if x['deliveredTotal']>before),None)
 fields=['living','firstWaterPending','initialTasks','waterTasks','harvestTasks']
 rows.append({'day':day,'staff':native['staff'],'physicalDeliveries':native['delivered'],'firstObservedDeliveryTime':first,'samples':len(samples),
 'globalContiguousObservedSeconds':globalSeconds,'excludedGaps':gaps,'phaseActorSeconds':phase,'actorSecondsByStatus':aggregate,
 'peak':{k:max(x[k] for x in samples) for k in fields},'endOfDaylight':{k:samples[-1][k] for k in fields},
 'endPhases':samples[-1]['phases'],'missingMeasurements':{'taskReservation':None,'blockedTasks':None,'individualQueueWait':None,'individualServiceLatency':None,'physicalPathMetres':None}})
assert original=={x.name:sha(x.read_bytes()) for x in p.iterdir() if x.is_file()}
result={'observerSource':source,'producerSource':report['provenance']['gitHead'],'commonSourceHashesVerified':len(hashes),'changedSourceHashes':0,
 'priorFullStateParityReceiptVerified':True,'stateSha256':sha(rawState),'first10NativeDailyPrefixExact':True,'rawGzipJSONRows':{'states':len(states),'decisions':len(decisions)},
 'originalInputsUnchanged':True,'inputHashes':original,'rows':rows,
 'scope':'Reused original F10 compressed observations only. Left-endpoint phase counts give approximate actor-seconds for contiguous <=1s daylight observations; no interpolation through excluded gaps, no global/actor-time equivalence. No IDs/reservations/blocked/individual waiting/route lengths exist in this trace; none reconstructed. No new simulation, commands, parameter or policy changes. Early10 only, original100 remains rejected.'}
(out/'service-reuse-analysis.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'rows':[{'day':x['day'],'delivery':x['physicalDeliveries'],'phase':x['actorSecondsByStatus'],'end':x['endOfDaylight']} for x in rows],'verifiedSourceHashes':len(hashes),'analysisSha256':sha((out/'service-reuse-analysis.json').read_bytes())}))

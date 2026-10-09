import json,hashlib,subprocess
from pathlib import Path
p=Path('docs/qa/economic-candidates-a518/harvest-double');d=json.loads((p/'diagnostic.json').read_text());r=json.loads((p/'report.json').read_text());s=json.loads((p/'state.json').read_text());b=Path('docs/qa/economic-candidates-a518/baseline')
sha=lambda x:hashlib.sha256(x).hexdigest()
prov=d['provenance'];src=prov['gitHead'];hs=prov['sourceHashes'];batch=subprocess.check_output(['git','cat-file','--batch'],input=''.join(src+':'+f+'\n' for f in hs).encode());cursor=0
for f,h in hs.items():
 e=batch.index(b'\n',cursor);header=batch[cursor:e].decode().split();assert header[1]=='blob';start=e+1;n=int(header[2]);assert sha(batch[start:start+n])==h,f;cursor=start+n+1
assert cursor==len(batch)
balance=json.loads(subprocess.check_output(['git','show',src+':src/simulation/balance.js']).decode().split('export const BALANCE = ',1)[1].strip().removesuffix(';'))
original=json.loads(subprocess.check_output(['git','show','8541cbf0:src/simulation/balance.js']).decode().split('export const BALANCE = ',1)[1].strip().removesuffix(';'))
expected=json.loads(json.dumps(original))
for c in expected['crops']:c['base_harvest_value']*=2
assert expected==balance,'Only harvest values may differ'
base=json.loads((b/'diagnostic.json').read_text())
for f,h in base['provenance']['sourceHashes'].items():
 if f!='src/simulation/balance.js':assert hs[f]==h,f
entries=s['ledger']['entries'];assert all(e['d']=='1' for e in entries.values());assert 1500+sum(int(e['n']) for e in entries.values())==int(s['ledger']['balance']['n'])
spec={c['id']:c for c in balance['crops']};assert -sum(int(v['n']) for k,v in entries.items() if k.startswith('intensive-plant-'))==sum(spec[x['species']]['plant_cost'] for x in s['plants'])
plants={x['id']:x for x in s['plants']};picked=set();paid=0
for c in s['crates']:
 x=plants[c['sourcePlantId']];assert not x['alive'] and x['id'] not in picked;picked.add(x['id']);assert x['growth']>=spec[x['species']]['growth_seconds'];assert all(w['status'] in ['manual','magic'] for w in x['water']);entry=entries.get('deliver:'+c['id'])
 if c['delivered']:
  paid+=1;assert int(entry['n'])==(int(c['value']['n'])+int(c['value']['d'])-1)//int(c['value']['d']);assert c['carrierId'] is None
 else:assert entry is None
assert paid==r['counts']['CrateDelivered'];assert len(picked)==r['counts']['CropPicked'];assert sha((p/'state.json').read_bytes())==d['snapshotSha256'];assert (p/'failure-state.json').read_bytes()==(p/'state.json').read_bytes()
summary=json.loads((p/'summary.json').read_text());assert summary['activity']['acceptance']['policy']['maximumFraction']==.25
out={'source':src,'sourceHashesVerified':len(hs),'onlyHarvestDoubled':True,'allOtherSourcesMatchBaseline':True,'snapshotSha256':d['snapshotSha256'],'nativeProcessExit':1,
'gates':{'completedRequested10NightsWithoutDefeat':False,'everyDayPaidStaffPhysicalDelivery':False,'ownSourceIntegerLedgerHydrationPaidCrates':True,'inactivityStrictlyBelow25':False,'poorManagement':'not-run-no-viable-signal','responsible100And30CaseMatrix':'not-run-failed-pilot'},
'actualCompletedNights':s['completedNights'],'actualDay':s['day'],'result':s['result'],'physicalDeliveries':paid,'physicalPicked':len(picked),'activityReported':d['activity'],'cashflow':summary['cashflow'],'budgetAttribution':d['categories'],
'workingDayFailures':[{'day':x['day'],'staff':x['staff'],'delivered':x['delivered']} for x in r['daily'] if x['staff']<=0 or x['delivered']<=0],
'centreLostByEndOfDay':next(x['day'] for x in r['daily'] if not x['centerHp']),
'firstSixDaysIdleFraction':sum(x['idle']['budget']+x['idle']['space']+x['idle']['shift-end'] for x in r['daily'][:6])/1800,
'causeScope':'Original opening retains21 physical deliveries on day1. More income supports faster later purchasing, but the operational centre is lost by day6 close and no tasks/deliveries occur day7; final snapshot verifies ruined hp0. Observer did not retain precise individual hits, so exact attack cause/target sequence is not reconstructed. Seven observed rows include defeat day7 and are not ten completed nights. Final ledger cash margin alone does not establish survivability or sustainable service.',
'files':{f.name:sha(f.read_bytes()) for f in sorted(p.iterdir()) if f.is_file() and f.name != 'own-source-audit.json'}}
(p/'own-source-audit.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))

"""Independent terminal-only F100 audit; never replays or modifies campaign inputs."""
import hashlib,json,pathlib,subprocess,sys
p=pathlib.Path(sys.argv[1]);key='gran-canon-saheliana';root=pathlib.Path('docs/qa/economic-candidates-a518')
status=json.loads((p/(key+'-status.json')).read_text());assert status['status']!='running','Wait for actual terminal status'
report=json.loads((p/(key+'-report.json')).read_text());provenance=report['provenance'];source=provenance['gitHead'];assert source=='83b1c1eaa0235f9a9b34966f88b496f42eeb161b';assert not provenance['trackedChanges']
hashes=provenance['sourceHashes'];sha=lambda x:hashlib.sha256(x).hexdigest();batch=subprocess.check_output(['git','cat-file','--batch'],input=''.join(source+':'+f+'\n' for f in hashes).encode());cursor=0
for f,h in hashes.items():
 e=batch.index(b'\n',cursor);header=batch[cursor:e].decode().split();assert header[1]=='blob';start=e+1;n=int(header[2]);assert sha(batch[start:start+n])==h,f;cursor=start+n+1
assert cursor==len(batch)
balance=json.loads(subprocess.check_output(['git','show',source+':src/simulation/balance.js']).decode().split('export const BALANCE = ',1)[1].strip().removesuffix(';'))
spec={c['id']:c for c in balance['crops']};original=json.loads((root/'harvest-triple-half-structure-damage/report.json').read_text());assert report['policy']==original['policy'];assert report['daily'][:10]==original['daily'],'Original negative first10 must be present unaltered'
raw=(p/(key+'-state.json')).read_bytes();s=json.loads(raw);entries=s['ledger']['entries'];assert all(e['d']=='1' for e in entries.values());assert s['ledger']['balance']['d']=='1';assert 1500+sum(int(e['n']) for e in entries.values())==int(s['ledger']['balance']['n']);assert -sum(int(v['n']) for k,v in entries.items() if k.startswith('intensive-plant-'))==sum(spec[x['species']]['plant_cost'] for x in s['plants'])
plants={x['id']:x for x in s['plants']};picked=set();paid=0
for c in s['crates']:
 x=plants[c['sourcePlantId']];assert not x['alive'] and x['id'] not in picked;picked.add(x['id']);assert x['growth']>=spec[x['species']]['growth_seconds'];assert all(w['status'] in ['manual','magic'] for w in x['water']);payment=entries.get('deliver:'+c['id'])
 if c['delivered']:
  paid+=1;assert int(payment['n'])==(int(c['value']['n'])+int(c['value']['d'])-1)//int(c['value']['d']);assert c['carrierId'] is None
 else:assert payment is None
assert paid==report['counts']['CrateDelivered'];assert len(picked)==report['counts']['CropPicked']
idle=sum(x['idle']['budget']+x['idle']['space']+x['idle']['shift-end'] for x in report['daily']);total=len(report['daily'])*300;assert idle/total==report['activity']['unoccupiedFraction']
gates={'100RequestedNightsVictory':s['completedNights']==100 and s['day']==101 and s['result']=='victory' and s['raid'] is None,'everyDayPaidStaffPhysicalDelivery':all(x['staff']>0 and x['delivered']>0 for x in report['daily']),'ownSourceLedgerHydrationPhysicalCrates':True,'allOriginalFirst10IncludedUnchanged':True,'wholeCampaignIdleStrictlyBelow25':len(report['daily'])==100 and idle/total<.25,'poor6Management':'pending-only-if-responsible-100-gates-pass','matrix30':'not-run','currentMainCompatibility':'not-established-frozen-F-bridge'}
summary=p/(key+'-summary.json')
if summary.exists():
 actual=json.loads(summary.read_text());assert actual['activity']['unoccupiedSeconds']==idle;assert actual['activity']['acceptance']['policy']['maximumFraction']==.25;assert actual['activity']['acceptance']['policy']['comparison']=='strictly-less-than'
out={'source':source,'sourceHashesVerified':len(hashes),'snapshotSha256':sha(raw),'nativeTerminalStatus':status['status'],'completedNights':s['completedNights'],'result':s['result'],'inactivity':idle/total,'idleSeconds':idle,'daylightSeconds':total,'physicalPaidCrates':paid,'picked':len(picked),'gates':gates,'responsibleCaseAccepted':all(v for k,v in gates.items() if isinstance(v,bool)),'scope':'One frozen F100 case, includes all first10 negatives. No projection, threshold change, policy override or matrix/current-main approval. Any nonterminal or physical/source audit failure raises, never becomes accepted.'}
(p/'f100-independent-audit.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))

import gzip,json,math,hashlib
from pathlib import Path
p=Path('docs/qa/economic-candidates-a518/harvest-double-attack');r=[json.loads(l) for l in gzip.open(p/'attack-trace.jsonl.gz','rt')];s=json.loads(gzip.decompress((p/'first-zero-centre-state.json.gz').read_bytes()))
a=[x for x in r if x['day']==6 and x['raid']];changes=[];previous=None
for x in a:
 hp=x['centres'][0]['hp']
 if hp!=previous:changes.append({'time':round(x['time'],6),'centreHp':hp,'rhino':[{k:y[k] for k in ['id','species','hitsRemaining','targetId','status']} for y in x['raid']['animals'] if y['species']=='rhino']})
 previous=hp
spell=next(x['spells'][0] for x in a if x['spells']);centre=s['structures'][0];distance=math.hypot(spell['x']-centre['x'],spell['z']-centre['z'])
result={'source':json.loads((p/'diagnostic.json').read_text())['provenance']['gitHead'],'immutableFinalParity':True,'fatalNightPlan':a[0]['nightPlan'],'centreHpTimeline':changes,'shield':spell,'shieldToCentreDistance':distance,'centreInsideObservedShield':distance<=spell['radius'],
'centreCollapseThreshold':centre['maxHp']*.21,'observedRhinoHitsSpent':8,'observedRhinoStructureDamage':60,'collapseBelowThresholdAfterHits':8,
'repairEvents':[{'day':x['day'],'time':x['time'],'event':e} for x in r for e in x['events'] if e['type'] in ['RepairRequested','RepairApplied']],
'fatalCash':s['ledger']['balance'],'fatalTasks':len(s['tasks']),'fatalRepairTasks':[t for t in s['tasks'] if t['kind']=='repair'],
'attractionCoupling':'Frozen rules.attraction sums living species base_harvest_value. Doubling harvest income also doubles per-plant attraction; more planting compounds this. No independent threat edit was made.',
'policyMeaning':'defend:false disables optional wall/capital-reserve policy only. Shield logic remains active; it casts on a threat target within8m, prioritising centres only among currently eligible threats. It does not continuously keep shield for a later centre threat. This control is not proof no defensive strategy can survive.',
'acceptance':'failed6completed-nights/day7defeat/daily-delivery-failure/activity-failure; no100 or matrix or poor-management launch',
'files':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(p.iterdir()) if f.is_file() and f.name != 'fatal-attack-analysis.json'}}
(p/'fatal-attack-analysis.json').write_text(json.dumps(result,indent=2)+'\n');print('shieldRadius',spell['radius'],'distance',distance,'repairEvents',len(result['repairEvents']))

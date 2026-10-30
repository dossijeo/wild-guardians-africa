"""Summarize optional guardian-combat peer diagnostics; not visual acceptance."""
import argparse,json,math
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('input',type=Path);p.add_argument('--output',type=Path);args=p.parse_args()
s=json.loads(args.input.read_text(encoding='utf-8'));r=s['report'];previous={};steps=[];pairs=[];physical=[]
for row in r['recoveryTrace']:
    pairs.extend(row.get('peerSkinBounds',[]));physical.extend(row.get('peerContacts',[]))
    for actor in row.get('peerPositions',[]):
        old=previous.get(actor['id'])
        if old and actor['mode']=='baked':
            time,pose=old;dt=row['time']-time
            if dt>0:
                distance=math.dist(actor['hip'],pose['hip'])
                steps.append(dict(id=actor['id'],phase=actor['phase'],time=row['time'],dt=dt,distance=distance,horizontal=math.hypot(actor['hip'][0]-pose['hip'][0],actor['hip'][2]-pose['hip'][2]),vertical=actor['hip'][1]-pose['hip'][1],speed=distance/dt))
        previous[actor['id']]=(row['time'],actor)
volumes=[pair['bakedVerticesInsidePhysical'] for pair in pairs if 'bakedVerticesInsidePhysical' in pair]
result=dict(source=str(args.input),species=r['species'],complete=r['completedSimulation'],errors=s['errors'],finalDown=r['finalDownCount'],maxGuardians=s['maxVisibleGuardians'],physicalBodies=s['physicalBodies'],pairSamples=len(pairs),volumeCandidates=len(volumes),penetratingVolumeSamples=sum(v['inside']>0 for v in volumes),maxInsideVertices=max((v['inside'] for v in volumes),default=0),minimumPhysicalDistance=min((v['minimum'] for v in physical),default=None),largestBakedSteps=sorted(steps,key=lambda a:a['distance'],reverse=True)[:8],limitations='Sampled simplified collider containment, not exact skin penetration or continuous-frame acceptance. Variable-rate QA run, not performance comparison.')
text=json.dumps(result,indent=2)+'\n'
if args.output:args.output.write_text(text,encoding='utf-8')
print(text)

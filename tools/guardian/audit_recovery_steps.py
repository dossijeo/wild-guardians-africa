import json, math, argparse
from pathlib import Path
parser=argparse.ArgumentParser(description='Rank rendered recovery steps; telemetry only, not a continuity proof.')
parser.add_argument('report');args=parser.parse_args()
data=json.loads(Path(args.report).read_text());previous={};steps=[]
for frame in data['report']['peerFrameTrace']:
 current={}
 for actor in frame['actors']:
  key=actor['id'];current[key]=(frame,actor)
  if key not in previous:continue
  before,old=previous[key];dt=frame['time']-before['time']
  if dt<=0 or old['phase']!='recovering' or actor['phase']!='recovering':continue
  displacement=math.dist(actor['hip'],old['hip']);c=actor.get('correction');oc=old.get('correction')
  steps.append(dict(id=key,mode=actor['mode'],time=frame['time'],wallMs=frame['wallMs'],dt=dt,distance=displacement,speed=displacement/dt,correctionDelta=math.dist(c,oc) if c is not None and oc is not None else None,correction=c))
 previous=current
print(json.dumps(dict(scope='Consecutive rendered recovery samples only; excludes phase boundaries. Speed alone does not prove discontinuity.',frames=len(data['report']['peerFrameTrace']),recoveryPairs=len(steps),largest=sorted(steps,key=lambda s:s['distance'],reverse=True)[:12],largestCorrection=sorted(steps,key=lambda s:s['correctionDelta'] if s['correctionDelta'] is not None else -1,reverse=True)[:6]),indent=2))

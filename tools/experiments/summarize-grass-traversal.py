"""Audit repeatable streaming and summarize absolute moving-scene timings."""
import json,sys,statistics,hashlib
from pathlib import Path
root=Path(sys.argv[1]);path=root/'traversal.json';data=json.loads(path.read_text(encoding='utf-8'));records=data['records'];out=[]
def stats(xs):
 xs=sorted(xs);return {'samples':len(xs),'mean':statistics.mean(xs),'p95':xs[min(len(xs)-1,int(len(xs)*.95))],'max':max(xs)}
for biome,phase in sorted({(r['biome'],r['phase']) for r in records}):
 rows=[r for r in records if r['biome']==biome and r['phase']==phase];assert len(rows)==7
 first,last=rows[0]['settled'],rows[-1]['settled'];assert first['signature']==last['signature'];assert first['camera']==last['camera'];assert first['target']==last['target']
 for r in rows:
  s=r['settled'];assert not r['errors'];assert s['chunks']==s['detailChunks'];assert s['count']<=192;assert s['time']==first['time'];assert (s['structures'],s['plants'])==(first['structures'],first['plants']);assert all(0<=p['scale']<=1 for p in s['active'])
 motions=[r['motion'] for r in rows if r['motion']];frames=[f for m in motions for f in m['frames']]
 assert all(f['count']<=192 for f in frames)
 gpu=[s['ms'] for m in motions for s in m['gpu']['samples']];cpu=[x for m in motions for x in m['cpu']]
 out.append({'biome':biome,'phase':phase,'returnCandidatesIdentical':True,'returnCameraIdentical':True,'residentChunksMatch':True,'maxCount':max(f['count'] for f in frames),'framesWithTransitions':sum(f['transitioning']>0 for f in frames),'originStates':sorted({tuple(f['origin']) for f in frames}),'gpuAbsoluteMs':stats(gpu),'cpuSubmissionMs':stats(cpu),'gpuDisjointEvents':sum(m['gpu']['disjointEvents'] for m in motions),'resourceCountsAtStartReturn':{k:[first[k],last[k]] for k in ['textures','geometries']}})
(root/'summary.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n')
# Preserve comparison evidence compactly after exact-string checks above.
for r in records:
 s=r['settled'];value=s['signature']
 if len(value)!=64:s['signature']=hashlib.sha256(value.encode('utf-8')).hexdigest()
data['candidateSignatureFormat']='SHA256 of sorted world-space candidate coordinates and variation seeds'
path.write_text(json.dumps(data,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
print(json.dumps(out,indent=2))

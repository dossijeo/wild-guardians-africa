"""Author-selected zigzag landmarks routed along the unchanged arch mesh edges.
Shallow folds are retained; no geometric smoothing or silhouette change.
"""
from pathlib import Path
import numpy as np,json,heapq
R=Path(__file__).resolve().parents[2];O=R/'docs/qa/global-visual-lab/workshop-finish';f=R/'public/assets/visual-lab/mapu-0-art.bin';n=(f.stat().st_size-7992*12)//32
a=np.fromfile(f,dtype='<f4',count=n*8).reshape(-1,8);t=np.fromfile(f,dtype='<u4',offset=n*32).reshape(-1,3);faces=json.loads((R/'docs/qa/global-visual-lab/workshop-art/refinement-audit.json').read_text())['faceSelections']['1'];p=a[t[faces],:3];_,first,ids=np.unique(np.round(p.reshape(-1,3),6),axis=0,return_index=True,return_inverse=True);v=p.reshape(-1,3)[first];it=ids.reshape(-1,3)
normal=np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-12)
adj={}
for i,tri in enumerate(it):
 for k in range(3):adj.setdefault(tuple(sorted([int(tri[k]),int(tri[(k+1)%3])])),[]).append(i)
q=np.c_[np.arctan2(v[:,0]+.716,v[:,1]+.063)*.12,v[:,2]-.085*(v[:,0]+.716)];graph={i:[] for i in range(len(v))};ang={}
for (i,j),ff in adj.items():
 angle=float(np.degrees(np.arccos(np.clip(normal[ff[0]]@normal[ff[1]],-1,1)))) if len(ff)==2 else 45
 ang[(i,j)]=angle;graph[i].append(j);graph[j].append(i)
anchors=[[-1.45,.018],[-1.32,.001],[-1.25,.016],[-1.15,0],[-1.05,.018],[-.925,0],[-.81,.018],[-.70,.002],[-.61,.023],[-.49,.004],[-.39,.019],[-.28,0],[-.17,.016],[-.065,.001],[.025,.018],[.125,.001],[.224,.018],[.339,.002],[.519,.026],[.645,.003],[.753,.022],[.891,.005],[1.032,.022],[1.148,.005],[1.267,.017],[1.376,.03]]
result=[]
for role,points in [('zigzag',anchors),('border-front',[[x,.025] for x in np.linspace(-1.45,1.4,12)]),('border-back',[[x,-.004] for x in np.linspace(-1.45,1.4,12)])]:
 points=np.array(points)*[.12,1];chosen=[int(np.argmin(np.linalg.norm(q-x,axis=1))) for x in points]
 for start,end in zip(chosen,chosen[1:]):
  delta=q[end]-q[start];den=delta@delta
  if den<1e-12:continue
  dist={start:0};prev={};heap=[(0,start)]
  while heap:
   cost,i=heapq.heappop(heap)
   if i==end:break
   if cost>dist[i]:continue
   for j in graph[i]:
    if ang[tuple(sorted([i,j]))]<3:continue
    mid=(q[i]+q[j])/2
    d=np.linalg.norm(mid-q[start]-np.clip((mid-q[start])@delta/den,0,1)*delta);angle=ang[tuple(sorted([i,j]))]
    value=cost+np.linalg.norm(v[i]-v[j])*(1+(d/.004)**2)*(1+(max(0,18-angle)/12)**2)
    if value<dist.get(j,float('inf')):dist[j]=value;prev[j]=i;heapq.heappush(heap,(value,j))
  if end not in dist:raise RuntimeError('Disconnected trace')
  j=end
  while j!=start:
   i=prev[j];result.append({'ends':[v[i].tolist(),v[j].tolist()],'angle':ang[tuple(sorted([i,j]))],'role':role});j=i
result=[e for e in result if e['role']=='zigzag']+[e for e in json.loads((R/'docs/qa/global-visual-lab/workshop-art/arch-paint-edges.json').read_text()) if e['role']=='border']
(O/'arch-traced-edges.json').write_text(json.dumps({'anchors':anchors,'edges':result,'minimumCreaseAngle':min(x['angle'] for x in result)},indent=2)+'\n');print('edges',len(result),'low angle',sum(x['angle']<12 for x in result))

import json,numpy as np
from pathlib import Path
pack=json.loads(Path('public/content/biome-savanna.json').read_text(encoding='utf-8'));raw=Path('public'+pack['binary']['url']).read_bytes();lod=pack['assets'][8]['lods'][0]
def array(key,width):
 d=lod[key];return np.frombuffer(raw,dtype=d['type'],count=d['count'],offset=d['offset']).reshape(-1,width)
pos=array('position',3);idx=array('index',3);normal=array('normal',3)
unique,inverse=np.unique(np.round(pos,5),axis=0,return_inverse=True);parent=list(range(len(unique)))
def find(i):
 while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
 return i
for tri in inverse[idx]:
 for b in tri[1:]:parent[find(int(b))]=find(int(tri[0]))
components=len({find(int(i)) for i in inverse})
data=dict(slot=8,name=pack['assets'][8]['name'],sourceComponents=pack['assets'][8]['sourceComponents'],vertices=len(pos),triangles=len(idx),connectedComponentsAfterPositionWeld1e5=components,bounds=[pos.min(0).tolist(),pos.max(0).tolist()],heightPercentiles=np.percentile(pos[:,1],[0,25,50,75,100]).tolist(),lowHeightNormals=[dict(below=h,vertices=int((pos[:,1]<h).sum()),normalYPercentiles=np.percentile(normal[pos[:,1]<h,1],[0,25,50,75,100]).tolist())for h in [.01,.02,.03,.04,.06]],mask=dict(fullBelowLocalHeight=.025,zeroAboveLocalHeight=.055),note='Read-only diagnostic; connected topology is not semantic segmentation. No source geometry modified.')
root=Path('docs/qa/global-visual-lab/native-grass-root-mask');root.mkdir(parents=True,exist_ok=True);(root/'geometry-audit.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(data,indent=2))

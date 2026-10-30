"""Blender background bake for packed wall states; no source geometry changes."""
import sys,json,hashlib
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from vertex_visibility import bake_visibility
ROOT=Path(__file__).resolve().parents[2];path=ROOT/'public/content/walls.json';pack=json.loads(path.read_text())
blob=bytearray();records=[]
for key,piece in pack['pieces'].items():
 raw={k:(ROOT/'public'/piece[k]['url'].lstrip('/')).read_bytes() for k in ['p','n','i','faceRegions']}
 pos=np.frombuffer(raw['p'],dtype='<f4').reshape((-1,3));normal=np.frombuffer(raw['n'],dtype='<f4').reshape((-1,3));tri=np.frombuffer(raw['i'],dtype='<u2').reshape((-1,3));regions=np.frombuffer(raw['faceRegions'],dtype='<u2')
 groups=np.full(len(pos),-1,dtype=int)
 for face,ids in enumerate(tri):
  for i in ids:
   if groups[i]<0:groups[i]=regions[face]
 values,radius,stats=bake_visibility(pos,normal,tri,radius_fraction=.04,groups=groups)
 records.append(dict(key=key,offset=len(blob),count=len(values),source=piece['p']['url'],hashes={k:hashlib.sha256(v).hexdigest() for k,v in raw.items()},radius=radius,mean=float(values.mean()),**stats));blob.extend(values.tobytes())
folder=ROOT/'public/content/lighting/global-ao';(folder/'walls.bin').write_bytes(blob)
(folder/'walls.json').write_text(json.dumps(dict(binary='/content/lighting/global-ao/walls.bin',byteLength=len(blob),outputSHA256=hashlib.sha256(blob).hexdigest(),manifestSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),samples=32,records=records),indent=2),encoding='utf-8')
print('WALL_AO_COMPLETE',len(records),len(blob),flush=True)

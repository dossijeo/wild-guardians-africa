"""Blender: transfer stage visibility onto authored V4 bridge vertices, offline."""
import hashlib,json,sys
from pathlib import Path
import numpy as np
from mathutils.kdtree import KDTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from bake_model_ao import GLB
ROOT=Path(__file__).resolve().parents[2]
folder=ROOT/'public/content/lighting/global-ao'
meta=json.loads((folder/'model-crops.json').read_text())
stages=GLB(ROOT/'public'/meta['source'].lstrip('/'))
raw=(ROOT/'public'/meta['binary'].lstrip('/')).read_bytes()
assert hashlib.sha256(stages.raw).hexdigest()==meta['sourceSHA256']
assert hashlib.sha256(raw).hexdigest()==meta['outputSHA256']
recipe=json.loads((ROOT/'public/content/crop-bridges.json').read_text())
assert recipe['recipeVersion']==4
bridges=GLB(ROOT/'public'/recipe['bakedAsset'].lstrip('/'))
records={(r['mesh'],r['primitive']):r for r in meta['records']}
models={}
for node in stages.doc['nodes']:
 if 'mesh' not in node:continue
 mi=node['mesh'];e=node['extras'];a=stages.doc['meshes'][mi]['primitives'][0]['attributes']
 pos=stages.accessor(a['POSITION']);uv=stages.accessor(a['TEXCOORD_0']);normal=stages.accessor(a['NORMAL']);r=records[mi,0]
 kd=KDTree(len(pos))
 for i,p in enumerate(pos):kd.insert(p,i)
 kd.balance();models[e['cropIndex']*5+e['stage']-1]=(kd,uv,normal,np.frombuffer(raw,dtype=np.uint8,count=r['count'],offset=r['offset']))
blob=bytearray();report=[]
for mi,mesh in enumerate(bridges.doc['meshes']):
 e=mesh['extras'];a=mesh['primitives'][0]['attributes'];pos=bridges.accessor(a['POSITION']);uv=bridges.accessor(a['TEXCOORD_0']);normal=bridges.accessor(a['NORMAL']);part=bridges.accessor(a['_APART'])
 values=[];maximum=0;reversed_count=0
 for p,t,n,role in zip(pos,uv,normal,part):
  kd,source_uv,source_normal,source_values=models[e['a'] if role[0]<.5 else e['b']]
  candidates=[(i,d) for _,i,d in kd.find_range(p,3e-5) if np.max(np.abs(source_uv[i]-t))<1e-6]
  if not candidates:raise ValueError('Unmatched V4 bridge vertex: '+mesh['name'])
  # V4 protection offsets reverse corners by 0.000015. Preserve source AO;
  # never bake the overlapping A/B topology as though both stages coexist.
  i,d=max(candidates,key=lambda pair:(float(np.dot(source_normal[pair[0]],n)),-pair[1]))
  reversed_count+=int(np.dot(source_normal[i],n)<0);maximum=max(maximum,d);values.append(int(source_values[i]))
 report.append(dict(mesh=mi,primitive=0,name=mesh['name'],offset=len(blob),count=len(values),maxCorrespondenceDistance=maximum,reversedNormalMatches=reversed_count,a=e['a'],b=e['b']))
 blob.extend(bytes(values))
name='model-crop-bridges';(folder/(name+'.bin')).write_bytes(blob)
out=dict(profile='crop-bridges',source=recipe['bakedAsset'],sourceSHA256=hashlib.sha256(bridges.raw).hexdigest(),binary='/content/lighting/global-ao/'+name+'.bin',outputSHA256=hashlib.sha256(blob).hexdigest(),byteLength=len(blob),stageAOHash=meta['outputSHA256'],records=report,scope='Stage AO transferred by role, UV, position and normal; all vertices matched within 0.00003. No cross-stage bake.')
(folder/(name+'.json')).write_text(json.dumps(out,indent=2),encoding='utf-8')
print('CROP_BRIDGE_AO_COMPLETE',len(report),len(blob),max(r['maxCorrespondenceDistance'] for r in report),flush=True)

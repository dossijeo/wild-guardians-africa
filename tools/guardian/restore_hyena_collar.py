"""Restore necklace rest geometry from original artist GLB using UV face identity.
No guessed smoothing: all selected vertices must match the source, and unaffected
head geometry must prove a uniform coordinate transform to submillimeter error.
"""
import bpy,json,numpy as np,argparse,sys,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--original',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
from mathutils import Vector
from collections import defaultdict
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(Path(a.original).resolve()))
src=bpy.data.objects['Mesh_0'];lookup=defaultdict(list);faceLookup=defaultdict(list)
for f in src.data.polygons:
 corners=[(tuple(round(x,6) for x in src.data.uv_layers[0].data[li].uv),tuple(src.matrix_world@src.data.vertices[src.data.loops[li].vertex_index].co)) for li in f.loop_indices]
 faceLookup[tuple(sorted(c[0] for c in corners))].append(corners)
for loop in src.data.loops:
 uv=src.data.uv_layers[0].data[loop.index].uv;lookup[tuple(round(x,6) for x in uv)].append(tuple(src.matrix_world@src.data.vertices[loop.vertex_index].co))
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
m=bpy.data.objects['Mesh_0'];uv=m.data.uv_layers['UVMap'];pairs=defaultdict(list)
for loop in m.data.loops:
 key=tuple(round(x,6) for x in uv.data[loop.index].uv)
 if key in lookup:pairs[loop.vertex_index]+=lookup[key]
exact=defaultdict(list)
for f in m.data.polygons:
 signature=tuple(sorted(tuple(round(x,6) for x in uv.data[li].uv) for li in f.loop_indices))
 candidates=faceLookup.get(signature,[])
 if len(candidates)==1:
  for li in f.loop_indices:
   key=tuple(round(x,6) for x in uv.data[li].uv)
   exact[m.data.loops[li].vertex_index]+=[pos for u,pos in candidates[0] if u==key]
for i,ps in exact.items():pairs[i]=ps
head=m.vertex_groups['Head'].index;neck=m.vertex_groups['Neck'].index
fit=[]
for i,ps in pairs.items():
 v=m.data.vertices[i]
 if any(g.group==head and g.weight>.99 for g in v.groups):
  raw=np.array(ps)
  if np.max(np.ptp(raw,axis=0))<1e-5:fit.append((raw.mean(axis=0),tuple(m.matrix_world@v.co)))
x=np.array([p[0] for p in fit]);y=np.array([p[1] for p in fit]);scale=np.sum((x-x.mean(0))*(y-y.mean(0)))/np.sum((x-x.mean(0))**2);offset=np.median(y-x*scale,axis=0)
print('FIT',len(fit),scale,offset,'max',np.max(np.linalg.norm(y-x*scale-offset,axis=1)))
body=m.data.attributes['bodySurface'];nonbody={i for f in m.data.polygons if not body.data[f.index].value for i in f.vertices};targets=[];unmatched=[]
for i in nonbody:
 v=m.data.vertices[i]
 if any(g.group==neck and g.weight>.999 for g in v.groups):
  ps=np.array(pairs.get(i,[]))
  if ps.size and np.max(np.ptp(ps,axis=0))<1e-5:
   q=Vector(ps.mean(0)*scale+offset);targets.append((i,q,(q-m.matrix_world@v.co).length))
  else:unmatched.append(i)
assert not unmatched, f'Unmatched collar vertices: {unmatched}'
assert len(targets)==1298, 'Collar selection changed; re-inspect before editing'
print('REPAIR',len(targets),'max',max(t[2] for t in targets))
report={'scale':float(scale),'offset':offset.tolist(),'fitCount':len(fit),'maxFitError':float(np.max(np.linalg.norm(y-x*scale-offset,axis=1))),'vertices':len(targets),'maxCorrection':max(t[2] for t in targets)}
assert report['maxFitError']<1e-4
report['originalSha256']=hashlib.sha256(Path(a.original).read_bytes()).hexdigest()
report['selection']='non-body components with rigid Neck weights; complete source UV-face correspondence'
report['jawMorphDeltaOnCollar']=0
report['original']=str(Path(a.original).resolve())
for i,q,dist in targets:
 local=m.matrix_world.inverted()@q;m.data.vertices[i].co=local
 for key in m.data.shape_keys.key_blocks:key.data[i].co=local
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
Path(a.output).with_suffix('.collar.json').write_text(json.dumps(report,indent=2)+'\n')

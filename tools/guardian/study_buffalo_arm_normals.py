"""Local arm-normal trial; retains the registered rear-mane edit and rig payloads."""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
root=Path.cwd();source=root/'content/source/actors/buffalo/expressive-candidate.blend';output=root/'test-results/buffalo-arm-normals.blend'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='46439b046b4fb42735a085933b2e6f135676577e910a0c28cdc6159e77375315','Use the registered rear-mane input from commit b728aa23e, not a recursively edited output'
bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects['Mesh_0'];m=o.data
original=[n.vector.copy() for n in m.corner_normals];keys=[tuple(v.co) for v in m.vertices];sums={k:Vector() for k in keys}
for p in m.polygons:
 for i in p.vertices:sums[keys[i]]+=p.normal*p.area
for n in sums.values():n.normalize()
arm_groups={g.index for g in o.vertex_groups if g.name in ['LeftArm','LeftForeArm','LeftShoulder','RightArm','RightForeArm','RightShoulder']}
assert len(arm_groups)==6
weights=[]
for v in m.vertices:
 t=max(0,min(1,(sum(g.weight for g in v.groups if g.group in arm_groups)-.1)/.7));weights.append(t*t*(3-2*t))
normals=[original[i].lerp(sums[keys[l.vertex_index]],weights[l.vertex_index]).normalized() for i,l in enumerate(m.loops)]
for p in m.polygons:p.use_smooth=True
m.normals_split_custom_set(normals);m.update();bpy.ops.wm.save_as_mainfile(filepath=str(output),compress=True)
output.with_suffix('.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'affectedCorners':sum(weights[l.vertex_index]>0 for l in m.loops),'scope':'Arm/forearm/shoulder normal trial, weighted transition; no positions, UV, skin, shape positions edited; not installed'},indent=2))
for stem,blend in [('buffalo-arm-candidate',output),('buffalo-arm-baseline',root/'content/source/actors/buffalo/expressive-pre-mane.blend')]:
 bpy.ops.wm.open_mainfile(filepath=str(blend))
 bpy.ops.export_scene.gltf(filepath=str(root/'test-results'/f'{stem}.glb'),export_format='GLB',export_animations=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)

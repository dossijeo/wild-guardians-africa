import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
root=Path.cwd();source=root/'content/source/actors/buffalo/expressive-pre-mane.blend';output=root/'test-results/buffalo-mane-normals.blend'
bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects['Mesh_0'];m=o.data
original=[n.vector.copy() for n in m.corner_normals];keys=[tuple(v.co) for v in m.vertices];sums={k:Vector() for k in keys}
for p in m.polygons:
 for i in p.vertices:sums[keys[i]]+=p.normal*p.area
for n in sums.values():n.normalize()
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
changed=0;normals=[]
for i,l in enumerate(m.loops):
 v=m.vertices[l.vertex_index].co;w=smooth(.02,.14,v.y)*smooth(.65,.95,v.z)*(1-smooth(.34,.5,abs(v.x-.075)))
 normals.append(original[i].lerp(sums[keys[l.vertex_index]],w).normalized())
 if w:changed+=1
for p in m.polygons:p.use_smooth=True
m.normals_split_custom_set(normals);m.update();bpy.ops.wm.save_as_mainfile(filepath=str(output),compress=True)
output.with_suffix('.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'affectedCorners':changed,'positionsChanged':0,'scope':'Isolated rear mane normal study; no production registration','mask':'rear Y .02-.14; height Z .65-.95; center X .075, radius .34-.5'},indent=2))

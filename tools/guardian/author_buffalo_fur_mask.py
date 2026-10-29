"""Export a soft dorsal-fur lighting mask without repainting the face or albedo."""
import bpy,hashlib,json
from pathlib import Path
root=Path.cwd();source=root/'content/source/actors/buffalo/expressive-pre-fur.blend'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='fe7d2241c34bd9c470856d3fc0f8f2e61104190819468ef6d5fa551e72074a8f', 'Use the arm-normal source from commit 62d53c8dc'
bpy.ops.wm.open_mainfile(filepath=str(source));m=bpy.data.objects['Mesh_0'].data
attr=m.attributes.new('_FUR_LIGHT','FLOAT','POINT')
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
for v in m.vertices:attr.data[v.index].value=smooth(.02,.14,v.co.y)*smooth(.65,.95,v.co.z)*(1-smooth(.34,.5,abs(v.co.x-.075)))
bpy.ops.wm.save_as_mainfile(filepath=str(root/'test-results/buffalo-fur-mask.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(root/'test-results/buffalo-fur-mask.glb'),export_format='GLB',export_animations=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True,export_attributes=True)
(root/'test-results/buffalo-fur-mask-authoring.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'attribute':'_FUR_LIGHT','range':[min(d.value for d in attr.data),max(d.value for d in attr.data)],'affectedVertices':sum(d.value>0 for d in attr.data)},indent=2))

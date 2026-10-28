"""Remove defective facial normal/roughness shading while retaining skin albedo and body material."""
import bpy,sys,argparse,json
from pathlib import Path
p=argparse.ArgumentParser()
for n in ('input','output','source-glb'):p.add_argument('--'+n,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
body=bpy.data.objects['Mesh0'];head=next(g.index for g in body.vertex_groups if g.name.replace('mixamorig:','').replace('mixamorig','')=='Head')
material=body.data.materials[0].copy();material.name='Kofi head continuous skin shading'
bs=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for channel in ('Normal','Roughness','Metallic'):
 for link in list(bs.inputs[channel].links):material.node_tree.links.remove(link)
bs.inputs['Roughness'].default_value=.82;bs.inputs['Metallic'].default_value=0
slot=len(body.data.materials);body.data.materials.append(material);changed=[]
for f in body.data.polygons:
 weights=[sum(g.weight for g in body.data.vertices[i].groups if g.group==head) for i in f.vertices]
 if min((body.matrix_world@body.data.vertices[i].co).z for i in f.vertices)>1.10 and sum(weights)/len(weights)>.65:
  f.material_index=slot;changed.append(f.index)
# Smooth split normals across UV-duplicate vertices without welding geometry.
from mathutils import Vector
body.data.update()
old=[tuple(n.vector) for n in body.data.corner_normals]
sums={}
def position_key(i):return tuple(round(v,6) for v in body.data.vertices[i].co)
for index in changed:
 f=body.data.polygons[index];f.use_smooth=True
 for i in f.vertices:
  key=position_key(i);sums[key]=sums.get(key,Vector())+f.normal*f.area
for index in changed:
 f=body.data.polygons[index]
 for loop in f.loop_indices:
  n=sums[position_key(body.data.loops[loop].vertex_index)]
  if n.length_squared>1e-16:old[loop]=tuple(n.normalized())
body.data.normals_split_custom_set(old)
out=Path(a.output);bpy.ops.wm.save_as_mainfile(filepath=str(out.resolve()),compress=True)
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb').resolve()),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False)
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_source_animations import restore
restore(a.source_glb,out.with_suffix('.glb'))
out.with_suffix('.material.json').write_text(json.dumps({'modifiedPolygons':len(changed),'material':material.name,'baseColor':'unchanged','bodyMaterial':'unchanged','positionsTopologySkinningMorphs':'unchanged','headNormals':'area-weighted across coincident UV vertices','roughness':.82,'normalMap':'disabled on head only','selection':changed},indent=2),encoding='utf-8')

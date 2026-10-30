"""Blender Decimate candidates. Originals are never edited. Run from repo root."""
import bpy, bmesh, json, pathlib, sys, struct
root=pathlib.Path.cwd()
entries=json.loads((root/'content/source/character-lod/sources.json').read_text())
out=root/'public/content/character-lod';out.mkdir(parents=True,exist_ok=True)
selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
reports=[]
def tris(mesh): return sum(len(p.vertices)-2 for p in mesh.polygons)
def audit(mesh):
 bm=bmesh.new();bm.from_mesh(mesh)
 result={'boundaryEdges':sum(e.is_boundary for e in bm.edges),'nonManifoldInterior':sum(not e.is_manifold and not e.is_boundary for e in bm.edges),'degenerateFaces':sum(f.calc_area()<1e-12 for f in bm.faces)}
 bm.free();return result
for entry in entries:
 if selected and entry['id'] not in selected: continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(root/entry['decoded']))
 raw=(root/entry['decoded']).read_bytes();doc=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
 source_names={n.get('name') for n in doc['nodes'] if 'mesh' in n}
 # Blender may generate an Icosphere as an armature display helper. It is not
 # character geometry and must never consume budget or enter the GLB.
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and o.name=='Icosphere' and o.name not in source_names: bpy.data.objects.remove(o,do_unlink=True)
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 total=sum(tris(o.data) for o in meshes);details=[]
 def importance(obj):
  name=obj.name.lower();factor=.035 if 'lid' in name else .25 if 'oral' in name else .2 if name.startswith(('prop_','can_')) else 1
  return tris(obj.data)*factor
 weighted=sum(importance(o) for o in meshes)
 budgets={o.name:max(8,round(1750*importance(o)/weighted)) for o in meshes}
 for obj in meshes:
  bpy.context.view_layer.objects.active=obj
  before=tris(obj.data); topology=audit(obj.data)
  # Facial shape topology cannot survive collapse; the high-detail actor still
  # evaluates these channels. Far drawing uses the same animated skeletal pose.
  if obj.data.shape_keys: obj.shape_key_clear()
  # GLB splits vertices at UV/normal seams. Collapse on that split graph opens
  # cracks all over the surface. Weld coincident positions first; Blender keeps
  # UV coordinates on face corners, so atlas seams remain intact.
  bm=bmesh.new();bm.from_mesh(obj.data)
  bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
  bm.to_mesh(obj.data);bm.free();obj.data.update()
  welded=audit(obj.data)
  budget=budgets[obj.name]
  mod=obj.modifiers.new('LOD_Decimate','DECIMATE');mod.ratio=min(1,budget/max(1,before));mod.use_collapse_triangulate=True
  bpy.ops.object.modifier_move_to_index(modifier=mod.name,index=0)
  bpy.ops.object.modifier_apply(modifier=mod.name)
  # Remove only zero-area faces. Intentional mouth/leaf boundaries must not be
  # blindly capped: doing so produces black mouth plugs and sealed foliage.
  bm=bmesh.new();bm.from_mesh(obj.data)
  bmesh.ops.dissolve_degenerate(bm,dist=1e-7,edges=list(bm.edges))
  loose=[e for e in bm.edges if not e.link_faces]
  if loose: bmesh.ops.delete(bm,geom=loose,context='EDGES')
  isolated=[v for v in bm.verts if not v.link_edges]
  if isolated: bmesh.ops.delete(bm,geom=isolated,context='VERTS')
  junctions=[e for e in bm.edges if len(e.link_faces)>2]
  # Coincident sheets can meet in the source. Separate their topological
  # junction without moving a vertex, deleting a surface or capping a mouth.
  if junctions: bmesh.ops.split_edges(bm,edges=junctions)
  bm.to_mesh(obj.data);bm.free();obj.data.update()
  details.append({'mesh':obj.name,'before':before,'after':tris(obj.data),'topologyBefore':topology,'topologyWelded':welded,'separatedJunctions':len(junctions),'topologyAfter':audit(obj.data)})
 for image in bpy.data.images:
  if image.size[0] and max(image.size)>256:
   scale=256/max(image.size);image.scale(max(1,round(image.size[0]*scale)),max(1,round(image.size[1]*scale)));image.pack()
 bpy.ops.wm.save_as_mainfile(filepath=str(root/'content/source/character-lod'/ (entry['id']+'.blend')),compress=True)
 bpy.ops.export_scene.gltf(filepath=str(out/(entry['id']+'.glb')),export_format='GLB',export_animations=False,export_skins=True,export_morph=False,export_attributes=True,export_tangents=True,export_image_format='AUTO')
 report={**entry,'originalTriangles':total,'triangles':sum(tris(o.data) for o in meshes),'meshes':details,'textureMax':256}
 (out/(entry['id']+'.json')).write_text(json.dumps(report,indent=2))
 reports.append(report);print('LOD_RESULT',entry['id'],report['triangles'],flush=True)

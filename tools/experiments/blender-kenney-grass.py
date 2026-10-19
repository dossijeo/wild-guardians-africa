from pathlib import Path
import bpy,bmesh,json,hashlib
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'docs/qa/global-visual-lab/kenney-grass/source/grass_large.glb';OUT=ROOT/'docs/qa/global-visual-lab/kenney-grass';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SRC));objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];
if len(objects)>1:bpy.ops.object.join()
obj=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
# Clean split normals/UV vertices so the audit measures actual solid topology.
bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));boundaries=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges);bm.to_mesh(obj.data);bm.free()
lo=Vector(tuple(min(v.co[i] for v in obj.data.vertices) for i in range(3)));hi=Vector(tuple(max(v.co[i] for v in obj.data.vertices) for i in range(3)));scale=.44/(hi.z-lo.z)
for v in obj.data.vertices:v.co=(v.co-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z)))*scale
obj.location=(0,0,0);obj.name='KenneyDryGrass'
solid=obj.modifiers.new('Volumetric blade thickness','SOLIDIFY');solid.thickness=.008;solid.offset=0;solid.use_even_offset=True;bpy.ops.object.modifier_apply(modifier=solid.name);mesh=obj.data
bm=bmesh.new();bm.from_mesh(mesh);boundaries=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges);bm.free()
attr=mesh.color_attributes.new(name='GrassColor',type='BYTE_COLOR',domain='CORNER')
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
for poly in mesh.polygons:
 for i in poly.loop_indices:
  z=mesh.vertices[mesh.loops[i].vertex_index].co.z;t=max(0,min(1,z/.44));root=(.37,.36,.14);tip=(.76,.68,.34);attr.data[i].color=tuple(linear(a+(b-a)*t) for a,b in zip(root,tip))+(1,)
mesh.materials.clear();mat=bpy.data.materials.new('Dry grass nonmetallic');mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.96;bsdf.inputs['Metallic'].default_value=0
node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='GrassColor';mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color']);mesh.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kenney-dry-grass.blend'));dst=ROOT/'public/assets/visual-lab/kenney-dry-grass.glb';bpy.ops.export_scene.gltf(filepath=str(dst),export_format='GLB',use_selection=True)
mesh.calc_loop_triangles();audit={'source':'Kenney Nature Kit 2.1 / grass_large.glb','sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'license':'CC0 1.0','triangles':len(mesh.loop_triangles),'boundaryEdges':boundaries,'nonmanifoldEdges':nonmanifold,'dimensions':list(obj.dimensions),'textures':0,'materials':1,'metallic':0,'bytes':dst.stat().st_size,'adaptations':'Blender: weld equivalent vertices, outward normals, height 0.44 m, solidify blades 0.008 m, vertex gradient, nonmetallic rough material. Original game models untouched.'}
(OUT/'mesh-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8');print(audit)

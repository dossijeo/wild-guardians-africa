"""Authored replacement study for savanna plant_02; originals stay immutable."""
import bpy, math, json
from pathlib import Path
R=Path(__file__).resolve().parents[2];O=R/'docs/qa/global-visual-lab/native-short-grass';O.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# angle, crown height, outward reach, half-width: composed as an open dry fan,
# then interrupted by a smaller upright group. No random placement/noise.
leaves=[(0,.27,.47,.018),(19,.31,.41,.016),(43,.24,.44,.022),(62,.35,.35,.015),(86,.29,.43,.020),(108,.26,.44,.018),(132,.33,.37,.016),(155,.25,.48,.021),(177,.31,.41,.018),(199,.28,.45,.019),(221,.34,.36,.015),(244,.25,.43,.021),(268,.30,.42,.018),(291,.27,.45,.020),(315,.33,.37,.016),(338,.26,.46,.018),(11,.42,.18,.012),(49,.39,.23,.014),(96,.44,.16,.010),(143,.38,.25,.013),(188,.43,.17,.011),(237,.40,.21,.012),(281,.44,.15,.010),(327,.39,.24,.013),(34,.35,.30,.014),(122,.36,.28,.014),(214,.37,.27,.013),(306,.35,.31,.014)]
def linear(v):
 return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
palette=[tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4)) for h in ['9a962f','b8a652','817d3b','c2b25e']]
roots=[(-.17,-.10),(.17,-.03),(0,.19)]
mat=bpy.data.materials.new('Dry straw with muted olive roots');mat.use_nodes=True;mat.use_backface_culling=False
bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.95
node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='BladeColor';mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
audit=[]
for lod,selection,steps in [(0,list(range(28)),6),(1,list(range(0,16))+list(range(16,24,2)),5),(2,list(range(0,16,2))+[16,19,22,25],4)]:
 verts=[];faces=[];colors=[]
 for j in selection:
  angle,height,reach,width=leaves[j];a=math.radians(angle);d=(math.cos(a),math.sin(a));side=(-d[1],d[0]);base=len(verts);rx,rz=roots[j%3]
  # Each blade arches outward but retains a raised centre fold. A broad base
  # gives the clump weight; the pointed tip removes the squared-card silhouette.
  for k in range(steps):
   t=k/steps;rad=.015+reach*.65*t**1.7;y=height*math.sin(t*math.pi*.59);w=width*2.2*(.35+.65*math.sin(math.pi*t))
   for q in [-1,0,1]:verts.append((rx+d[0]*rad+side[0]*q*w,rz+d[1]*rad+side[1]*q*w,y+(1-abs(q))*.009*math.sin(math.pi*t)))
  verts.append((rx+d[0]*(.015+reach*.65),rz+d[1]*(.015+reach*.65),height*.90));tip=len(verts)-1
  for k in range(steps-1):
   r=base+k*3;n=r+3;faces.extend([(r,n,r+1),(r+1,n,n+1),(r+1,n+1,r+2),(r+2,n+1,n+2)]);colors.extend([(j,k/steps)]*4)
  r=base+(steps-1)*3;faces.extend([(r,tip,r+1),(r+1,tip,r+2)]);colors.extend([(j,1.)]*2)
 mesh=bpy.data.meshes.new('Short grass LOD '+str(lod));mesh.from_pydata(verts,[],faces);mesh.update();attr=mesh.color_attributes.new(name='BladeColor',type='BYTE_COLOR',domain='CORNER')
 for face,(j,t) in zip(mesh.polygons,colors):
  face.use_smooth=False;root=palette[j%4];color=tuple(v*(.82+.18*t) for v in root)
  for loop in face.loop_indices:attr.data[loop].color=(*color,1)
 obj=bpy.data.objects.new('ShortGrass_LOD'+str(lod),mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mat);obj.select_set(True)
 audit.append({'lod':lod,'blades':len(selection),'triangles':len(faces),'verticesBeforeExport':len(verts)})
bpy.ops.wm.save_as_mainfile(filepath=str(O/'native-short-grass.blend'))
path=O/'native-short-grass.glb';bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True)
(O/'blender-audit.json').write_text(json.dumps({'leaves':leaves,'lods':audit,'bytes':path.stat().st_size,'textures':0,'materials':1,'originalSlot':'plant_02','originalTriangles':[2922,1747,552]},indent=2)+'\n',newline='\n')

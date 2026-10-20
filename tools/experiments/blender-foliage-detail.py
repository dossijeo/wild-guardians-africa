"""Bake an authored, periodic mosaic of closed relief leaves; no external assets."""
from pathlib import Path
import bpy, bmesh, math, random, json
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/qa/global-visual-lab/foliage-detail';OUT.mkdir(parents=True,exist_ok=True)
ASSET=ROOT/'public/assets/visual-lab/foliage-detail-normal.png'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(712);verts=[];faces=[]
for leaf in range(72):
 x,y=rng.uniform(-.5,.5),rng.uniform(-.5,.5);a=rng.uniform(0,math.tau)
 length,width=rng.uniform(.12,.23),rng.uniform(.045,.085);height=rng.uniform(.015,.04);z=rng.uniform(.015,.075)
 top=[(-length/2,0,0)]
 for t in [.25,.5,.75]:
  for side in [-1,0,1]:top.append(((t-.5)*length,side*width*.5*math.sin(math.pi*t),height*math.sin(math.pi*t)+(1-abs(side))*.009))
 top.append((length/2,0,0))
 tf=[(0,1,2),(0,2,3)]
 for r in [1,4]:
  for s in [0,1]:tf.extend([(r+s,r+s+3,r+s+1),(r+s+1,r+s+3,r+s+4)])
 tf.extend([(7,10,8),(8,10,9)])
 boundary=[0,1,4,7,10,9,6,3]
 local=tf+[tuple(i+11 for i in reversed(f)) for f in tf]
 for k,p in enumerate(boundary):
  q=boundary[(k+1)%len(boundary)];local.extend([(p,q,q+11),(p,q+11,p+11)])
 for ox in [-1,0,1]:
  for oy in [-1,0,1]:
   start=len(verts)
   for bottom in [False,True]:
    for lx,ly,lz in top:verts.append((x+ox+math.cos(a)*lx-math.sin(a)*ly,y+oy+math.sin(a)*lx+math.cos(a)*ly,z+lz-(.006 if bottom else 0)))
   faces.extend(tuple(start+i for i in f) for f in local)
mesh=bpy.data.meshes.new('Closed leaf relief');mesh.from_pydata(verts,[],faces);mesh.update()
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));boundary_count=sum(e.is_boundary for e in bm.edges);bm.to_mesh(mesh);bm.free()
source=bpy.data.objects.new('Periodic leaf source',mesh);bpy.context.collection.objects.link(source)
for poly in mesh.polygons:poly.use_smooth=True
bpy.ops.mesh.primitive_plane_add(size=4,location=(0,0,-.02));base=bpy.context.object;base.name='Flat source background'
bpy.ops.mesh.primitive_plane_add(size=1,location=(0,0,-.05));target=bpy.context.object;target.name='Bake target only; not game geometry'
image=bpy.data.images.new('Authored foliage tangent normal',width=512,height=512,alpha=False);image.colorspace_settings.name='Non-Color'
mat=bpy.data.materials.new('Bake target');mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;mat.node_tree.nodes.active=node;target.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1
scene.render.bake.use_selected_to_active=True;scene.render.bake.cage_extrusion=.25;scene.render.bake.max_ray_distance=.4;scene.render.bake.normal_space='TANGENT';scene.render.bake.margin=0
bpy.ops.object.select_all(action='DESELECT')
for obj in [source,base,target]:obj.select_set(True)
bpy.context.view_layer.objects.active=target
bpy.ops.object.bake(type='NORMAL')
image.filepath_raw=str(ASSET);image.file_format='PNG';image.save()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'foliage-detail.blend'))
(OUT/'source.json').write_text(json.dumps({'source':'Authored in Blender; no third-party assets','seed':712,'uniqueLeaves':72,'periodicCopies':9,'sourceTriangles':len(faces),'boundaryEdges':boundary_count,'textureSize':[512,512],'nominalRGBA8MipBytes':1398101,'gameGeometryAdded':0,'assetBytes':ASSET.stat().st_size},indent=2)+'\n',encoding='utf-8',newline='\n')

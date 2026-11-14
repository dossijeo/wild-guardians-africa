"""Localized facial surfaces, retaining the original atlas and mask silhouette."""
import bpy,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def create_face(body,rig):
 from pathlib import Path
 root=Path(__file__).resolve().parents[2]
 body.shape_key_clear()
 body.shape_key_add(name='Basis')
 for name,amount in [('surprise',.004),('focus',-.003),('joy',.002)]:
  key=body.shape_key_add(name=name)
  for v,p in zip(body.data.vertices,key.data):
   x,y,z=v.co
   if y>-.04:continue
   for cx,cz in [(-.067,.27),(.052,.286)]:
    center=cz+(.035 if name!='joy' else -.024)
    w=math.exp(-((x-cx)/.039)**4-((z-center)/.019)**4)
    p.co.z+=amount*w

 body.data.calc_loop_triangles();tree=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get());uv=body.data.uv_layers.active.data
 def sample(x,z):
  hit,normal,index,d=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
  if hit is None:return -.14,(.5,.5)
  poly=body.data.polygons[index]
  # Interpolate the actual UV triangle at the ray hit.
  ids=list(poly.vertices);a,b,c=[body.data.vertices[i].co for i in ids[:3]]
  v0=b-a;v1=c-a;v2=hit-a;d00=v0.dot(v0);d01=v0.dot(v1);d11=v1.dot(v1);den=d00*d11-d01*d01
  if abs(den)<1e-15:return hit.y,tuple(uv[poly.loop_start].uv)
  vb=(d11*v2.dot(v0)-d01*v2.dot(v1))/den;vc=(d00*v2.dot(v1)-d01*v2.dot(v0))/den;va=1-vb-vc
  coords=[uv[poly.loop_start+i].uv for i in range(3)];tex=coords[0]*va+coords[1]*vb+coords[2]*vc
  return hit.y,tuple(tex)
 # Bake a continuous frontal atlas, avoiding UV-island interpolation across new faces.
 original=body.data.materials[0]
 bake=bpy.data.materials.new('Atlas emission');bake.use_nodes=True
 nodes=bake.node_tree.nodes;nodes.clear();output=nodes.new('ShaderNodeOutputMaterial');emission=nodes.new('ShaderNodeEmission');image=nodes.new('ShaderNodeTexImage');image.image=bpy.data.images['Image_0'];bake.node_tree.links.new(image.outputs['Color'],emission.inputs['Color']);bake.node_tree.links.new(emission.outputs[0],output.inputs[0])
 body.data.materials[0]=bake
 bake_scene=bpy.data.scenes.new('Face atlas baking');bake_scene.collection.objects.link(body);bake_scene.collection.objects.link(rig)
 camera_data=bpy.data.cameras.new('Atlas camera');camera=bpy.data.objects.new('Atlas camera',camera_data);bake_scene.collection.objects.link(camera);camera.location=(0,-2,.26);camera.rotation_euler=(math.pi/2,0,0);camera_data.type='ORTHO';camera_data.ortho_scale=.32;bake_scene.camera=camera
 bake_scene.render.engine='CYCLES';bake_scene.cycles.samples=1;bake_scene.render.resolution_x=1024;bake_scene.render.resolution_y=1024;bake_scene.render.resolution_percentage=100;bake_scene.render.film_transparent=True;bake_scene.view_settings.view_transform='Standard';bake_scene.render.image_settings.file_format='PNG';bake_scene.render.filepath=str(root/'art/guardian/face-atlas.png')
 bpy.ops.render.render(write_still=True,scene=bake_scene.name)
 atlas=bpy.data.images.load(bake_scene.render.filepath);atlas.pack();body.data.materials[0]=original;bpy.data.scenes.remove(bake_scene)
 facial=bpy.data.materials.new('Original wood facial atlas');facial.use_nodes=True;image=facial.node_tree.nodes.new('ShaderNodeTexImage');image.image=atlas;bs=facial.node_tree.nodes.get('Principled BSDF');facial.node_tree.links.new(image.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.8
 def atlas_uv(x,z):return ((x+.16)/.32,(z-.10)/.32)
 verts=[];tex=[];faces=[];materials=[];labels=[]
 def vertex(p,t,label):verts.append(p);tex.append(t);labels.append(label);return len(verts)-1
 def face(ids,material=0):faces.append(ids);materials.append(material)
 N=64;R=7
 # The outer border lands exactly on the existing wood. The inner border is a carved rim.
 def mouth(theta,r,shape='X'):
  cs=math.cos(theta);sn=math.sin(theta)
  params={'X':(.044,.0025,0),'A':(.043,.0003,0),'B':(.042,.004,0),'C':(.043,.010,0),'D':(.043,.018,0),'E':(.029,.009,.001),'F':(.020,.010,.004),'G':(.039,.004,0),'H':(.042,.012,0)}
  width,height,project=params[shape]
  ox=.065*cs;oz=.219+.19*ox+5.8*ox*ox+(.011 if sn>0 else .033)*sn
  ix=width*cs;iz=.219+.19*ix+5.8*ix*ix+height*sn-(height-.0025)*.24
  oy=sample(ox,oz)[0]-.0007
  return (ox*(1-r)+ix*r,oy*(1-r)+(-.147-project)*r,oz*(1-r)+iz*r)
 for ring in range(R):
  r=ring/(R-1)
  for i in range(N):
   theta=i*math.tau/N;p=mouth(theta,r);sx,sy,sz=p
   # Sample wood just outside the old painted mouth edge for the inner lip.
   if r>.6:sz+=.009 if math.sin(theta)>=0 else -.009
   vertex(p,atlas_uv(sx,sz),('mouth',theta,r))
 for ring in range(R-1):
  for i in range(N):a=ring*N+i;b=ring*N+(i+1)%N;face((a,b,b+N,a+N))
 center=vertex((0,-.1465,.22),(.5,.5),('cavity',0,0))
 for i in range(N):face(((R-1)*N+i,(R-1)*N+(i+1)%N,center),1)
 # Eyelids are thin painted wood shells; no flesh-colored additions.
 for side,cx,cz in [('L',-.067,.27),('R',.052,.286)]:
  start=len(verts)
  for row in range(7):
   r=row/6
   for i in range(33):
    u=-1+2*i/32;x=cx+.042*u
    top=cz-.006+.034*math.sqrt(max(0,1-u*u))+.14*(x-cx)
    bottom=cz-.032+.14*(x-cx)
    y=sample(x,top)[0]-.001
    p=(x,y,top-.00015*r)
    vertex(p,atlas_uv(x,top+.009),('lid',side,cx,cz,u,r,top,bottom))
  for row in range(6):
   for i in range(32):a=start+row*33+i;face((a,a+1,a+34,a+33),4)
 # Teeth and tongue are small carved inserts, revealed only by the relevant visemes.
 for kind,width,height in [('teeth',.027,.0025),('tongue',.011,.0035)]:
  base=len(verts)
  vertex((0,-.149,.219),(.5,.5),(kind,0,0))
  for i in range(32):
   angle=i*math.tau/32;x=width*math.cos(angle);z=height*math.sin(angle)
   vertex((x*.00001,-.149,.219+z*.00001),(.5,.5),(kind,x,z))
  for i in range(32):face((base,base+1+i,base+1+(i+1)%32),2 if kind=='teeth' else 3)
 mesh=bpy.data.meshes.new('Localized face topology');mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new('GuardianFace',mesh);bpy.context.collection.objects.link(obj)
 mesh.materials.append(facial)
 for name,color in [('Carved mouth interior',(.012,.006,.003,1)),('Ivory wood teeth',(.72,.62,.42,1)),('Carved tongue',(.22,.09,.045,1)),('Painted wooden eyelids',(.025,.22,.20,1))]:
  mat=bpy.data.materials.new(name);mat.diffuse_color=color;mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Roughness'].default_value=.8;mesh.materials.append(mat)
 layer=mesh.uv_layers.new()
 for poly,matid in zip(mesh.polygons,materials):
  poly.material_index=matid;poly.use_smooth=True
  for li in poly.loop_indices:layer.data[li].uv=tex[mesh.loops[li].vertex_index]
 obj.vertex_groups.new(name='Head').add(list(range(len(verts))),1,'REPLACE');mod=obj.modifiers.new('Head skin','ARMATURE');mod.object=rig;obj.parent=rig
 obj.shape_key_add(name='Basis')
 for shape in 'ABCDEFGHX':
  key=obj.shape_key_add(name='viseme_'+shape)
  for p,label in zip(key.data,labels):
   if label[0]=='mouth':p.co=mouth(label[1],label[2],shape)
   elif label[0]=='cavity':p.co.y=-.1465-(.004 if shape=='F' else .001 if shape=='E' else 0)
   elif label[0]=='teeth' and shape in 'BGH':p.co.x=label[1];p.co.y=-.149;p.co.z=.221+.19*label[1]+5.8*label[1]**2+label[2]+(.003 if shape=='H' else -.001 if shape=='G' else 0)
   elif label[0]=='tongue' and shape=='H':p.co.x=label[1];p.co.y=-.1495;p.co.z=.219+.19*label[1]+label[2]
 for side in ['L','R']:
  key=obj.shape_key_add(name='blink_'+side)
  for p,label in zip(key.data,labels):
   if label[0]!='lid' or label[1]!=side:continue
   _,_,cx,cz,u,r,top,bottom=label
   p.co.z=top*(1-r)+(bottom-.001)*r
   # Shell stays in front of the original globe throughout its arc.
   p.co.y=-.121+.007*u*u+.004*(1-r)
 for side,cx,cz in [('L',-.067,.27),('R',.052,.286)]:
  key=body.shape_key_add(name='blink_'+side)
  for v,p in zip(body.data.vertices,key.data):
   x,y,z=v.co;r=((x-cx)/.039)**2+((z-cz)/.029)**2
   if r<1.1 and y<-.06:p.co.y+=.045*max(0,min(1,(1.1-r)*4))
 return obj

"""Build the floating Guardian rig from the preserved source, in Blender 4.5 LTS."""
import bpy, math, pathlib, json
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2]
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def activate(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'art/guardian/original.glb'))
body=next(o for o in bpy.context.scene.objects if o.type=='MESH');body.name='Guardian';activate(body);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# Retain UVs, material maps and the original geometry. Reduce only texture resolution.
for image in list(bpy.data.images):
 if image.type=='IMAGE' and image.size[0]>0:
  size=2048 if image.name=='Image_0' else 1024;image.scale(size,size);image.pack()
arm=bpy.data.armatures.new('GuardianRig');rig=bpy.data.objects.new('GuardianRig',arm);bpy.context.collection.objects.link(rig);activate(rig);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
 b=arm.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=arm.edit_bones[parent]
 return b
bone('Root',(0,0,-.05),(0,0,.02));bone('Torso',(0,0,.02),(0,0,.13),'Root');bone('Head',(0,0,.13),(0,0,.3),'Torso')
for sign,side in [(-1,'L'),(1,'R')]:
 bone('Shoulder.'+side,(sign*.04,0,.10),(sign*.105,0,.065),'Torso')
 bone('Arm.'+side,(sign*.105,0,.065),(sign*.155,-.025,-.015),'Shoulder.'+side)
 bone('Forearm.'+side,(sign*.155,-.025,-.015),(sign*.215,-.04,-.075),'Arm.'+side)
 bone('Hand.'+side,(sign*.215,-.04,-.075),(sign*.275,-.045,-.09),'Forearm.'+side)
 x,z=(-.067,.27) if sign<0 else (.052,.286)
 bone('Eye.'+side,(x,-.055,z),(x,-.10,z),'Head')
for name,x,y in [('FL',-.075,-.08),('FR',.075,-.08),('BL',-.09,.07),('BR',.09,.07)]:
 for i in range(3):bone('Mantle.'+name+'.'+str(i),(x,y,.015-i*.12),(x,y,-.105-i*.12),'Torso' if i==0 else 'Mantle.'+name+'.'+str(i-1))
bpy.ops.object.mode_set(mode='OBJECT')
for b in arm.bones:body.vertex_groups.new(name=b.name)
# The mask is rigid; flexible neck and shoulder transitions are localized.
for v in body.data.vertices:
 x,y,z=v.co;ax=abs(x);side='L' if x<0 else 'R';weights={}
 head=smooth(.115,.175,z)
 head=max(head,smooth(.105,.165,ax)*smooth(.045,.115,z))
 arm_inner=.065+.65*max(0,.055-z)
 armw=smooth(arm_inner,arm_inner+.035,ax)*(1-smooth(.10,.145,z))*max(smooth(-.15,-.10,z),smooth(.18,.22,ax)*smooth(-.18,-.15,z))*(1-head)
 if armw:
  fore=smooth(.135,.185,ax);hand=smooth(.205,.235,ax)
  weights['Arm.'+side]=armw*(1-fore);weights['Forearm.'+side]=armw*fore*(1-hand);weights['Hand.'+side]=armw*fore*hand
 weights['Head']=head
 remain=max(0,1-head-armw)
 mantle=(1-smooth(-.035,.035,z))*max(smooth(.025,.065,y),1-smooth(-.085,-.055,y),smooth(.10,.16,ax))*(1-smooth(.18,.23,ax))
 mantle*=smooth(-.42,-.28,z)*max(smooth(-.29,-.19,z),smooth(.07,.14,ax))
 if mantle and remain:
  row=max(0,min(2,(-z-.035)/.12));i=int(row);f=row-i
  name=('F' if y<0 else 'B')+side
  weights['Mantle.'+name+'.'+str(i)]=remain*mantle*(1-f)
  if i<2:weights['Mantle.'+name+'.'+str(i+1)]=remain*mantle*f
 weights['Torso']=remain*(1-mantle)
 # Eye motion is confined to the visible globe and softly pinned at the socket.
 for s,cx,cz in [('L',-.067,.27),('R',.052,.286)]:
  r=((x-cx)/.034)**2+((z-cz)/.026)**2
  eye=(1-smooth(.48,1.03,r))*(1-smooth(-.055,-.025,y))
  if eye>0:weights={'Head':1-eye,'Eye.'+s:eye};break
 weights={k:w for k,w in weights.items() if w>.0001};weights=dict(sorted(weights.items(),key=lambda kv:-kv[1])[:4]);total=sum(weights.values())
 for k,w in weights.items():body.vertex_groups[k].add([v.index],w/total,'REPLACE')
# Small disconnected ornaments are rigid pieces, not rubber beads.
parents=list(range(len(body.data.vertices)))
def find(i):
 while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
 return i
def union(a,b):parents[find(a)]=find(b)
positions={}
for v in body.data.vertices:
 key=tuple(round(c,5) for c in v.co)
 if key in positions:union(v.index,positions[key])
 else:positions[key]=v.index
for e in body.data.edges:union(*e.vertices)
islands={}
for v in body.data.vertices:islands.setdefault(find(v.index),[]).append(v)
for vertices in islands.values():
 if len(vertices)>500:continue
 weights={}
 for v in vertices:
  for g in v.groups:weights[g.group]=weights.get(g.group,0)+g.weight
 selected=sorted(weights.items(),key=lambda kv:-kv[1])[:4];total=sum(w for g,w in selected);indices=[v.index for v in vertices]
 for group in body.vertex_groups:group.remove(indices)
 for g,w in selected:body.vertex_groups[g].add(indices,w/total,'REPLACE')
mod=body.modifiers.new('Guardian skin','ARMATURE');mod.object=rig;body.parent=rig
import sys
sys.path.insert(0,str(ROOT/'tools/guardian'))
from face_geometry import create_face
face=create_face(body,rig)
# Offline cloth study: pinned low-resolution mantle proxy under wind and small gravity.
scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=97
verts=[];faces=[];N=9
for j in range(N):
 for i in range(N):verts.append((-.14+i*.035,.085,.02-j*.043))
for j in range(N-1):
 for i in range(N-1):a=j*N+i;faces.append((a,a+1,a+N+1,a+N))
mesh=bpy.data.meshes.new('Cloth study proxy');mesh.from_pydata(verts,[],faces);proxy=bpy.data.objects.new('Cloth study - offline only',mesh);bpy.context.collection.objects.link(proxy)
pin=proxy.vertex_groups.new(name='Pinned shoulders');pin.add(list(range(N)),1,'REPLACE')
cloth=proxy.modifiers.new('Physical cloth study','CLOTH');cloth.settings.quality=6;cloth.settings.mass=.15;cloth.settings.vertex_group_mass=pin.name;cloth.settings.tension_stiffness=18;cloth.settings.compression_stiffness=18;cloth.settings.shear_stiffness=8;cloth.settings.bending_stiffness=.5;cloth.settings.air_damping=3;cloth.settings.effector_weights.gravity=.025;cloth.point_cache.frame_start=1;cloth.point_cache.frame_end=97
bpy.ops.object.effector_add(type='WIND',location=(0,-1,-.1));wind=bpy.context.object;wind.name='Study breeze';wind.rotation_euler=(math.pi/2,0,.15);wind.field.strength=12;wind.field.noise=1
samples=[]
for frame in range(1,98):
 scene.frame_set(frame);deps=bpy.context.evaluated_depsgraph_get();evaluated=proxy.evaluated_get(deps);m=evaluated.to_mesh();samples.append([list(v.co) for v in m.vertices]);evaluated.to_mesh_clear()
(ROOT/'docs/guardian/cloth-study.json').write_text(json.dumps({'fps':24,'frames':97,'proxyVertices':81,'gravityFactor':.025,'windStrength':12,'maxDisplacement':max((Vector(samples[f][i])-Vector(verts[i])).length for f in range(97) for i in range(81))},indent=2))
# Bake the measured cloth displacement to the mantle chains, with a periodic envelope.
rig.animation_data_create();action=bpy.data.actions.new('Mantle_Breeze');rig.animation_data.action=action
for frame in range(1,98):
 phase=(frame-1)/96;envelope=math.sin(math.pi*phase)**2
 for name in ['FL','FR','BL','BR']:
  for i in range(3):
   col=2 if name.endswith('L') else 6;row=min(8,2+i*2);idx=row*N+col
   delta=Vector(samples[frame-1][idx])-Vector(verts[idx]);pb=rig.pose.bones['Mantle.'+name+'.'+str(i)]
   # Parent-space directions convert Blender world displacements into bone coordinates.
   delta=pb.bone.matrix_local.to_3x3().inverted()@delta
   pb.location=delta*envelope*.12;pb.keyframe_insert('location',frame=frame,group=pb.name)
track=rig.animation_data.nla_tracks.new();track.name='Mantle_Breeze';track.strips.new('Mantle_Breeze',1,action);rig.animation_data.action=None
spell=action.copy();spell.name='Mantle_Spell'
for curve in spell.fcurves:
 for key in curve.keyframe_points:
  key.co.y*=2.5;key.handle_left.y*=2.5;key.handle_right.y*=2.5
track=rig.animation_data.nla_tracks.new();track.name='Mantle_Spell';track.strips.new('Mantle_Spell',1,spell)
for pb in rig.pose.bones:pb.location=(0,0,0)
# Separate body clips never write facial morphs or mantle bones.
for clip,amp in [('Idle',.015),('Explain',.065),('Warning',.035),('Enthusiasm',.10),('Invoke',.22),('Cast',.28)]:
 action=bpy.data.actions.new(clip);rig.animation_data.action=action
 for frame in range(1,98,4):
  t=(frame-1)/96;wave=math.sin(t*math.tau);pulse=math.sin(math.pi*t)**2
  for name in ['Root','Torso','Head','Shoulder.L','Shoulder.R','Arm.L','Arm.R','Forearm.L','Forearm.R']:
   pb=rig.pose.bones[name];pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0)
   if name=='Root':pb.location=(0,.004*wave,0);pb.keyframe_insert('location',frame=frame,group=name)
   if name=='Torso':pb.rotation_euler.z=amp*.25*wave
   if name=='Head':pb.rotation_euler.y=amp*.55*wave;pb.rotation_euler.x=amp*.4*pulse
   if name.startswith('Arm'):pb.rotation_euler.y=amp*pulse*(-1 if name.endswith('L') else 1)
   if name.startswith('Forearm'):pb.rotation_euler.x=amp*.8*pulse
   if name.startswith('Shoulder'):pb.rotation_euler.z=amp*.2*wave
   pb.keyframe_insert('rotation_euler',frame=frame,group=name)
 track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);rig.animation_data.action=None
 for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
for track in rig.animation_data.nla_tracks:track.mute=track.name not in ['Idle','Mantle_Breeze']
proxy.hide_render=True;proxy.hide_set(True);wind.hide_set(True)
scene.frame_set(1);activate(body);rig.select_set(True);face.select_set(True)
output=ROOT/'public/content/guardian';output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/guardian/guardian.blend'))
# Export actions by NLA track; only selected runtime objects are included.
for track in rig.animation_data.nla_tracks:track.mute=False
bpy.ops.export_scene.gltf(filepath=str(output/'guardian.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_morph=True,export_skins=True,export_image_format='JPEG',export_jpeg_quality=88,export_extras=True,export_tangents=True)
exec((ROOT/'tools/guardian/finalize_glb.py').read_text(encoding='utf-8-sig'),{'__file__':str(ROOT/'tools/guardian/finalize_glb.py')})
print('Guardian build complete',flush=True)

"""Art-directed secondary motion, baked offline; no runtime simulation."""
import bpy, math, json
from mathutils import Vector
TAU=math.tau

def refine(body,rig,islands,samples,verts,root):
 scene=bpy.context.scene
 # Spatially identify detached leaves and wood chips from the preserved source.
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
 parts=[]
 for vs in islands.values():
  if not 15<=len(vs)<=150:continue
  lo=Vector(tuple(min(v.co[i] for v in vs) for i in range(3)))
  hi=Vector(tuple(max(v.co[i] for v in vs) for i in range(3)))
  c=(lo+hi)/2
  kind='Feather' if abs(c.x)>.13 and lo.z>.05 and hi.z-lo.z>.06 else 'Wood' if hi.z<-.22 else None
  if kind:parts.append((kind,vs,lo,hi,c))
 parts.sort(key=lambda p:(p[0],p[4].x,p[4].z))
 bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 controls=[]
 for n,(kind,vs,lo,hi,c) in enumerate(parts):
  name=f'{kind}.{n:02d}';b=rig.data.edit_bones.new(name)
  # Leaves hang from the high end; chips orbit their centre as rigid wood.
  anchor=Vector((c.x,c.y,hi.z)) if kind=='Feather' else c
  b.head=anchor;b.tail=anchor+Vector((0,0,-.04));b.parent=rig.data.edit_bones['Head' if kind=='Feather' else 'Torso']
  tip=None
  if kind=='Feather':
   tip=name+'.Tip';t=rig.data.edit_bones.new(tip);t.head=(anchor+c)/2;t.tail=Vector((c.x,c.y,lo.z));t.parent=b
  controls.append((name,tip,kind,[v.index for v in vs],lo,hi,c))
 bpy.ops.object.mode_set(mode='OBJECT')
 for name,tip,kind,vs,lo,hi,c in controls:
  g=body.vertex_groups.new(name=name);tg=body.vertex_groups.new(name=tip) if tip else None
  for index in vs:
   v=body.data.vertices[index]
   for group in list(body.vertex_groups):
    if group not in [g,tg]:group.remove([v.index])
   f=max(0,min(1,(hi.z-v.co.z)/(hi.z-lo.z)-.25)) if tip else 0
   f=f*f*(3-2*f)
   g.add([v.index],1-f,'REPLACE')
   if f:tg.add([v.index],f,'REPLACE')
 # Replace the very short pulse loop with a long seamless travelling breeze.
 for track in list(rig.animation_data.nla_tracks):
  if track.name in ['Idle','Mantle_Breeze','Mantle_Spell']:
   actions=[s.action for s in track.strips];rig.animation_data.nla_tracks.remove(track)
   for a in actions:
    if a.users==0:bpy.data.actions.remove(a)
 for tr in rig.animation_data.nla_tracks:tr.mute=True
 def new(name):
  for pb in rig.pose.bones:pb.location=(0,0,0);pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0)
  a=bpy.data.actions.new(name);rig.animation_data.action=a;return a
 def finish(a):
  for fc in a.fcurves:
   for k in fc.keyframe_points:k.interpolation='LINEAR'
  tr=rig.animation_data.nla_tracks.new();tr.name=a.name;tr.strips.new(a.name,1,a);tr.mute=True;rig.animation_data.action=None
 # The physical study supplies per-height amplitude. Waves add loop continuity,
 # propagation and independent panel phase, rather than periodically stopping wind.
 measured=[]
 for row in [2,4,6]:
  idx=row*9+4;measured.append(max((Vector(s[idx])-Vector(verts[idx])).length for s in samples))
 for clip,gain in [('Mantle_Breeze',1),('Mantle_Spell',1.65)]:
  a=new(clip)
  for f in range(1,290,2):
   t=(f-1)/288;w=TAU*t
   for panel,name in enumerate(['FL','FR','BL','BR']):
    for i in range(3):
     pb=rig.pose.bones[f'Mantle.{name}.{i}'];lag=panel*.85-i*.7
     # Increasing deflection toward the hem; translations are local increments.
     amp=min(.007,.0018+measured[i]*.025)*gain
     world=Vector((amp*.55*math.sin(w*2+lag),amp*math.sin(w*2+lag-.5)+amp*.32*math.sin(w*3+lag),amp*.25*math.sin(w*2+lag+.7)))
     pb.location=pb.bone.matrix_local.to_3x3().inverted()@world
     pb.rotation_euler=(gain*(.018+i*.014)*math.sin(w*2+lag),gain*.018*math.sin(w*3+lag+.8),gain*.024*math.sin(w*2+lag+1.1))
     for prop in ['location','rotation_euler']:pb.keyframe_insert(prop,frame=f,group=pb.name)
   for j,(name,tip,kind,vs,lo,hi,c) in enumerate(controls):
    pb=rig.pose.bones[name];phase=j*1.31
    pb.rotation_euler=(gain*.10*math.sin(w*2+phase),gain*.07*math.sin(w*3+phase+.5),gain*.08*math.sin(w*2+phase+1))
    if kind=='Wood':
     world=Vector((.006*math.sin(w+phase),.005*math.sin(w*2+phase),.009*math.sin(w*2+phase+.7)))
     pb.location=pb.bone.matrix_local.to_3x3().inverted()@world;pb.keyframe_insert('location',frame=f,group=name)
    pb.keyframe_insert('rotation_euler',frame=f,group=name)
    if tip:
     p=rig.pose.bones[tip];p.rotation_mode='XYZ';p.rotation_euler=(gain*.12*math.sin(w*2+phase-.65),0,gain*.06*math.sin(w*3+phase));p.keyframe_insert('rotation_euler',frame=f,group=tip)
  finish(a)
 a=new('Float')
 for f in range(1,290,2):
  w=TAU*(f-1)/288;pb=rig.pose.bones['Root']
  world=Vector((.007*math.sin(w),.004*math.sin(w*2+.4),.012*math.sin(w*2)))
  pb.location=pb.bone.matrix_local.to_3x3().inverted()@world
  pb.rotation_euler=(.012*math.sin(w+.5),.018*math.sin(w),.014*math.sin(w*2+.7))
  for prop in ['location','rotation_euler']:pb.keyframe_insert(prop,frame=f,group='Root')
 finish(a)
 a=new('Idle')
 for f in range(1,290,2):
  w=TAU*(f-1)/288
  for name in ['Torso','Head','Shoulder.L','Shoulder.R','Arm.L','Arm.R','Forearm.L','Forearm.R','Hand.L','Hand.R']:
   pb=rig.pose.bones[name];side=-1 if name.endswith('L') else 1;phase=.7 if side<0 else 2.0
   if name=='Torso':angles=(.012*math.sin(w*2+.3),.018*math.sin(w),.022*math.sin(w+.7))
   elif name=='Head':angles=(.018*math.sin(w*2-.8),.025*math.sin(w-.6),-.014*math.sin(w+.2))
   elif name.startswith('Arm.'):angles=(.035*math.sin(w*2+phase),side*(.10+.045*math.sin(w+phase)),.035*math.sin(w*2+phase-.7))
   elif name.startswith('Forearm.'):angles=(.06+.045*math.sin(w+phase-.8),side*.035*math.sin(w*2+phase),.025*math.sin(w+phase))
   elif name.startswith('Hand.'):angles=(.025*math.sin(w*2+phase-1),.035*math.sin(w+phase-.8),.035*math.sin(w+phase))
   else:angles=(.008*math.sin(w+phase),.01*math.sin(w*2+phase),.018*math.sin(w+phase))
   pb.rotation_euler=angles;pb.keyframe_insert('rotation_euler',frame=f,group=name)
 finish(a)
 # Keep a soft arm baseline in dialogue clips too; root drift belongs only to Float.
 for tr in rig.animation_data.nla_tracks:
  if tr.name in ['Idle','Float','Mantle_Breeze','Mantle_Spell']:continue
  for strip in tr.strips:
   for fc in strip.action.fcurves:
    offset=0
    if 'Arm.L' in fc.data_path and fc.array_index==1:offset=-.10
    if 'Arm.R' in fc.data_path and fc.array_index==1:offset=.10
    if 'Forearm.' in fc.data_path and fc.array_index==0:offset=.06
    for k in fc.keyframe_points:k.co.y+=offset;k.handle_left.y+=offset;k.handle_right.y+=offset
 for pb in rig.pose.bones:pb.location=(0,0,0);pb.rotation_euler=(0,0,0)
 scene.frame_end=289
 (root/'docs/guardian/ethereal-motion.json').write_text(json.dumps({'loopSeconds':12,'bones':len(rig.data.bones),'physicalAmplitude':measured,'parts':[{'bone':n,'tip':tip,'kind':kind,'vertices':len(vs),'center':list(c)} for n,tip,kind,vs,lo,hi,c in controls],'method':'Physical amplitude study plus authored periodic travelling waves, baked to bones; rigid wood and two-bone feathers.'},indent=2))

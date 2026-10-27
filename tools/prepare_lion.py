"""Repair lion feet/mane, free rear cloth and add an independently animated tail.
Secondary motion is simulated offline and baked into the six production clips.
"""
import argparse,sys,json,math,hashlib
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector,Matrix,Quaternion,Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
from lion_secondary_motion import solve_secondary,ClothPanel
args=argparse.ArgumentParser();args.add_argument('--input',required=True);args.add_argument('--output',required=True);args.add_argument('--report',required=True);args.add_argument('--blend-dir')
a=args.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(__file__).resolve().parents[1]
old_path=root/'public/assets/5ac817bcc5a8147c69f0e9876d2e37a94228272b14b85be1d1ecbfd6e2d0527b.glb'
report={'locomotionStance':{'method':'Two-bone IK, ipsilateral pelvis-space foot tracks, forward knee pole','lateralDonorMotionRetained':.15},'sourceSha256':hashlib.sha256(Path(a.input).read_bytes()).hexdigest(),'sourceBytes':Path(a.input).stat().st_size,'blender':bpy.app.version_string,'animationSource':str(old_path.relative_to(root)),'secondaryMotion':[]}
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=a.input)
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent==rig)
rig.animation_data_clear()
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
rig.data.pose_position='REST';bpy.context.view_layer.update()
report['before']={'vertices':len(mesh.data.vertices),'faces':len(mesh.data.polygons),'bones':len(rig.data.bones)}
# Dedicated waist-parented cloth chains and a five-segment tail.
cloth_names=[];tail_names=[];bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for side,(xmin,xmax) in zip(['L','R'],[(-.155,-.008),(.008,.155)]):
 columns=[];grid_rest=ClothPanel(xmin,xmax).rest.reshape(9,5,3)
 for column,t in zip(['Inner','Outer'],[.25,.75]):
  names=[];parent=rig.data.edit_bones['Hips'];x=xmin+(xmax-xmin)*t
  for j,(top,bottom) in enumerate(zip([.455,.335,.215],[.335,.215,.135])):
   name=f'ClothRear_{side}_{column}_{j+1:02d}';b=rig.data.edit_bones.new(name);col=1 if column=='Inner' else 3;r0=[0,3,6][j];r1=[3,6,8][j];b.head=grid_rest[r0,col];b.tail=grid_rest[r1,col];b.parent=parent;b.use_connect=False;parent=b;names.append(name)
  columns.append(names)
 cloth_names.append(columns)
tail_points=[(0,.132,.445),(0,.134,.345),(0,.134,.235),(.025,.153,.145),(.12,.22,.115),(.235,.25,.12)]
parent=rig.data.edit_bones['Hips']
for j,(head,tip) in enumerate(zip(tail_points[:-1],tail_points[1:])):
 name=f'Tail_{j+1:02d}';b=rig.data.edit_bones.new(name);b.head=head;b.tail=tip;b.parent=parent;b.use_connect=j>0;parent=b;tail_names.append(name)
bpy.ops.object.mode_set(mode='OBJECT')
for names in [n for panel in cloth_names for n in panel]+[tail_names]:
 for name in names:mesh.vertex_groups.new(name=name)
for p in rig.pose.bones:p.rotation_mode='QUATERNION'
bm=bmesh.new();bm.from_mesh(mesh.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.verts.ensure_lookup_table();bm.verts.index_update();bm.normal_update()
deform=bm.verts.layers.deform.verify();seen=set();parts=[]
for v in bm.verts:
 if v.index in seen:continue
 todo=[v];part=[];seen.add(v.index)
 while todo:
  q=todo.pop();part.append(q)
  for e in q.link_edges:
   n=e.other_vert(q)
   if n.index not in seen:seen.add(n.index);todo.append(n)
 parts.append(part)
assert len(parts)==73,'Lion source topology changed; re-inspect anatomical selections'
main=set(parts[1]);head_group=mesh.vertex_groups['Head'].index
# Close rear mane openings only, preserving mouth and all intentional gaps.
edges=set(e for e in bm.edges if e.is_boundary);patches=[]
while edges:
 todo=[edges.pop()];group=[]
 while todo:
  e=todo.pop();group.append(e)
  for v in e.verts:
   for n in v.link_edges:
    if n in edges:edges.remove(n);todo.append(n)
 vs=set(v for e in group for v in e.verts);center=sum((v.co for v in vs),Vector())/len(vs)
 if center.y>.15 and center.z>.6:
  faces=bmesh.ops.holes_fill(bm,edges=group,sides=0)['faces']
  if not faces:faces=[bm.faces.new(list(vs))]
  for f in faces:f.material_index=1
  patches.append({'edges':len(group),'faces':len(faces),'center':list(center)})
assert len(patches)==2,patches
report['manePatches']=patches
feet=[]
for side,sign in [('Left',1),('Right',-1)]:
 foot=mesh.vertex_groups[side+'Foot'].index;ankle=rig.data.bones[side+'Foot'].head_local.copy()
 candidates=[f for f in bm.faces if f.calc_center_median().x*sign>.03 and f.calc_center_median().z<.06 and f.normal.z<-.5]
 seed=max(candidates,key=lambda f:f.calc_area());cluster=[f for f in candidates if f.normal.dot(seed.normal)>.98]
 normal=sum((f.normal*f.calc_area() for f in cluster),Vector()).normalized();rotation=(-normal).rotation_difference(Vector((0,0,1)))
 verts=[v for v in bm.verts if v.co.x*sign>.025 and v.co.z<ankle.z+.08 and v[deform].get(foot,0)>.01]
 for v in verts:
  t=max(0,min(1,(ankle.z+.08-v.co.z)/.065));q=Quaternion().slerp(rotation,t);v.co=ankle+q@(v.co-ankle)
 floor=min(v.co.z for v in verts);sole=[v for v in verts if v.co.z<floor+.01]
 for v in sole:v.co.z=floor;v[deform].clear();v[deform][foot]=1
 feet.append({'side':side,'vertices':len(verts),'soleVertices':len(sole),'floor':floor,'correctionDegrees':math.degrees(rotation.angle)})
report['feet']=feet
# Tail selection follows the tube and tuft behind the body, not either thigh.
tail_vertices=[v for v in main if v.co.y>.105 and (v.co.z<.445 or (v.co.z<.475 and abs(v.co.x)<.065))]
for v in tail_vertices:
 distances=[]
 for j,(a0,b0) in enumerate(zip(tail_points[:-1],tail_points[1:])):
  aa=Vector(a0);bb=Vector(b0);t=max(0,min(1,(v.co-aa).dot(bb-aa)/(bb-aa).length_squared));distances.append(((v.co-aa-(bb-aa)*t).length,j,t))
 _,j,t=min(distances);weights={mesh.vertex_groups[tail_names[j]].index:1}
 if j<4 and t>.5:weights={mesh.vertex_groups[tail_names[j]].index:1-(t-.5),mesh.vertex_groups[tail_names[j+1]].index:t-.5}
 pin=max(0,min(1,(v.co.z-.40)/.045))
 v[deform].clear()
 for g,w in weights.items():v[deform][g]=w*(1-pin)
 if pin>0:v[deform][mesh.vertex_groups['Hips'].index]=pin
report['tail']={'vertices':len(tail_vertices),'bones':tail_names,'legInfluences':0,'waistPinnedRoot':True,'waistBulbVertices':sum(v.co.z>=.445 for v in tail_vertices),'waistBulbWeights':'Hips 1.0; no thigh influences'}
# Separate posterior cloth faces from the fused source leg surface. Retain UVs.
tag=bm.faces.layers.int.new('rear_cloth')
selected=[]
for f in bm.faces:
 c=f.calc_center_median()
 if all(v in main for v in f.verts) and c.y>.044 and c.y<.105 and abs(c.x)<.17 and c.z<.46 and (c.z>.24 or (c.z>.12 and abs(c.x)<.042)):selected.append(f)
assert len(selected)>100,len(selected)
for f in selected:f[tag]=1
cbm=bm.copy();ctag=cbm.faces.layers.int['rear_cloth'];bmesh.ops.delete(cbm,geom=[f for f in cbm.faces if not f[ctag]],context='FACES_ONLY');bmesh.ops.delete(cbm,geom=[v for v in cbm.verts if not v.link_faces],context='VERTS');cd=cbm.verts.layers.deform.verify()
bmesh.ops.bisect_plane(cbm,geom=list(cbm.verts)+list(cbm.edges)+list(cbm.faces),dist=.000001,plane_co=(0,0,0),plane_no=(1,0,0),clear_inner=False,clear_outer=False)
bmesh.ops.split_edges(cbm,edges=[e for e in cbm.edges if all(abs(v.co.x)<.000002 for v in e.verts)])
for v in cbm.verts:
 panel=0 if sum(f.calc_center_median().x for f in v.link_faces)<0 else 1;xmin,xmax=[(-.155,-.008),(.008,.155)][panel];u=max(0,min(1,((v.co.x-xmin)/(xmax-xmin)-.25)/.5));z=v.co.z;centers=[.395,.275,.175]
 if z>=centers[0]:layers=[(0,1)]
 elif z<=centers[-1]:layers=[(2,1)]
 else:
  for j in [0,1]:
   if centers[j]>=z>=centers[j+1]:t=(centers[j]-z)/(centers[j]-centers[j+1]);layers=[(j,1-t),(j+1,t)];break
 pin=max(0,min(1,(z-.425)/.03));v[cd].clear()
 for column,wc in [(0,1-u),(1,u)]:
  for j,w in layers:
   if wc*w*(1-pin)>0:v[cd][mesh.vertex_groups[cloth_names[panel][column][j]].index]=wc*w*(1-pin)
 if pin>0:v[cd][mesh.vertex_groups['Hips'].index]=pin
cloth_data=bpy.data.meshes.new('RearCloth');cbm.to_mesh(cloth_data);cbm.free();cloth=bpy.data.objects.new('RearCloth',cloth_data);bpy.context.collection.objects.link(cloth);cloth.parent=rig
for g in mesh.vertex_groups:cloth.vertex_groups.new(name=g.name)
mod=cloth.modifiers.new('Secondary motion','ARMATURE');mod.object=rig
clothmat=mesh.data.materials[0].copy();clothmat.name='Rear cloth';clothmat.use_backface_culling=False;cloth.data.materials.append(clothmat)
# Transfer nearby retained leg skin weights and UVs onto the hidden fur caps.
uv_layer=bm.loops.layers.uv.active
source_skin=[(v.co.copy(),dict(v[deform]),v.link_loops[0][uv_layer].uv.copy()) for v in main if .16<v.co.z<.50 and v.co.y<.044 and abs(v.co.x)>.015 and v.link_loops]
cap_uv={}
bmesh.ops.delete(bm,geom=selected,context='FACES_ONLY');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
# Fur surfaces under the removed fused flaps: posterior thigh half-shells.
for side,sign in [('Left',1),('Right',-1)]:
 rows=[];up=rig.data.bones[side+'UpLeg'].head_local;low=rig.data.bones[side+'Leg'].head_local
 for j,z in enumerate(np.linspace(.47,.205,10)):
  radius=float(np.interp(z,[.205,.25,.34,.41,.47],[.035,.044,.052,.050,.045]));center=up.lerp(low,max(0,min(1,(up.z-z)/(up.z-low.z))));row=[]
  for angle in np.linspace(-math.pi*.49,math.pi*.49,11):
   v=bm.verts.new((center.x+radius*math.sin(angle),center.y+radius*math.cos(angle),z));pin=max(0,min(1,(z-.425)/.045));knee=max(0,min(1,(.31-z)/.085));candidates=sorted((item for item in source_skin if item[0].x*sign>0),key=lambda item:(item[0]-v.co).length_squared)[:3];weights={};total=0
   for co,source_weights,uv in candidates:
    factor=1/max((co-v.co).length_squared,.00001);total+=factor
    for g,w in source_weights.items():weights[g]=weights.get(g,0)+w*factor
   weights=dict(sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4]);total=sum(weights.values())
   for g,w in weights.items():v[deform][g]=w/total
   cap_uv[v]=candidates[0][2];row.append(v)
  rows.append(row)
 for arow,brow in zip(rows[:-1],rows[1:]):
  for i in range(10):
   f=bm.faces.new([arow[i],brow[i],brow[i+1],arow[i+1]]);f.material_index=0;f.smooth=True
   for loop in f.loops:loop[uv_layer].uv=cap_uv[loop.vert]
report['cloth']={'faces':len(cloth.data.polygons),'vertices':len(cloth.data.vertices),'bones':[n for p in cloth_names for c in p for n in c],'legInfluences':0,'separatePanels':True,'boneScale':'Rigid transforms only; no nonuniform inherited scale','attachment':'Waist/Hips top edge; independent two-column, three-segment chains per rear panel','bodyUnderCloth':'Posterior thigh fur half-shells close the fused source surface underneath freed panels'}
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh.data);bm.free();mesh.data.update();mesh.data.set_sharp_from_angle(angle=math.radians(55));cloth.data.set_sharp_from_angle(angle=math.radians(55))
for name,color in [('Mane repairs',(.38,.045,.009,1)),('Fur under cloth',(.16,.070,.019,1))]:
 mat=bpy.data.materials.new(name);mat.use_nodes=True;node=mat.node_tree.nodes['Principled BSDF'];node.inputs['Base Color'].default_value=color;node.inputs['Roughness'].default_value=.9;mesh.data.materials.append(mat)
tail_indices=[v.index for v in mesh.data.vertices if any(mesh.vertex_groups[g.group].name.startswith('Tail_') and g.weight>.01 for g in v.groups)]
tuft_indices=[i for i in tail_indices if mesh.data.vertices[i].co.x>.17]
sole_ids=[v.index for v in mesh.data.vertices if any(abs(v.co.z-f['floor'])<1e-6 and any(g.group==mesh.vertex_groups[f['side']+'Foot'].index and g.weight>.999 for g in v.groups) for f in feet)]
assert len(sole_ids)>12,len(sole_ids)
rig.data.pose_position='POSE'
new_objects=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(old_path))
old=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE' and o!=rig)
old_clips={}
# Importer slots are assigned to NLA strips, one per original GLTF animation.
for track in old.animation_data.nla_tracks:
 for strip in track.strips:old_clips[strip.action.name]=strip.action
if old.animation_data.action:old_clips[old.animation_data.action.name]=old.animation_data.action
native=['Running','Walking','Charged_Upward_Slash','Right_Hand_Sword_Slash','Weapon_Combo','Weapon_Combo_2']
print('SOURCE ACTIONS',list(old_clips),flush=True)
def lookup(name):
 return next(act for key,act in old_clips.items() if key==name or key.startswith(name+'.'))
mapping={b.name:'mixamorig:'+b.name for b in rig.data.bones}
mapping['Head_top']='mixamorig:HeadTop_End'
new_rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
old_rest={b.name:b.matrix_local.copy() for b in old.data.bones}
for track in old.animation_data.nla_tracks:track.mute=True
ratio=rig.data.bones['Hips'].head_local.z/old.data.bones['mixamorig:Hips'].head_local.z
# Native runtime expects geometry in Y-up units with soles close to zero.
lowest=min(v.co.z for v in mesh.data.vertices);height=max(v.co.z for v in mesh.data.vertices)-lowest
scale=1.81/height
report['scale']=scale;report['hipTranslationRatio']=ratio
report['retarget']={'armBindCalibration':'T-pose replacement to A-pose donor using animated limb directions','bakeFps':96,'preserved':'Own target limb lengths, authored finger hierarchy and native clip duration'}
report['headPosture']={'correctionDegrees':0,'preserved':'Native head motion; no anatomical head adjustment'}
# Evaluate donor on its original 24 fps frame coordinates; write target keys
# at four times those coordinates and export at 96 fps, preserving duration.
scene=bpy.context.scene;scene.render.fps=96
rig.animation_data_create();new_actions=[];report['clips']=[]
endpoints={side+bone:(side+child,side+donor) for side in ['Left','Right'] for bone,child,donor in [('Shoulder','Arm','Arm'),('Arm','ForeArm','ForeArm'),('ForeArm','Hand','Hand'),('Hand','HandMiddle4','HandMiddle4')]}
for name in native:
 action=lookup(name);old.animation_data.action=action
 first,last=action.frame_range;first=float(first);last=float(last)
 samples=[]
 target=bpy.data.actions.new('retarget_'+name);target.use_fake_user=True;rig.animation_data.action=target
 frames=sorted(set([first,last]+[f/4 for f in range(math.ceil(first*4),math.floor(last*4)+1)]))
 for frame in frames:
  scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
  # World-space deltas remove source bind orientation. The target hierarchy
  # retains its own lengths; no source translations are copied onto limbs.
  for p in rig.pose.bones:
   source=old.pose.bones.get(mapping[p.name])
   if source is None:
    p.matrix_basis=Matrix.Identity(4)
    continue
   rotation=source.matrix.to_quaternion()@old_rest[source.name].to_quaternion().inverted()@new_rest[p.name].to_quaternion()
   # The donor is bound in an A pose; the replacement is in a T pose.
   # Match animated limb directions, retaining the target lengths and roll.
   if p.name in endpoints:
    child,donor=endpoints[p.name]
    authored=new_rest[child].translation-new_rest[p.name].translation
    posed=(rotation@new_rest[p.name].to_quaternion().inverted())@authored
    wanted=old.pose.bones['mixamorig:'+donor].matrix.translation-source.matrix.translation
    rotation=posed.rotation_difference(wanted)@rotation
   if p.parent:
    head=p.parent.matrix@(new_rest[p.parent.name].inverted()@new_rest[p.name].translation)
   else:
    head=new_rest[p.name].translation+(source.matrix.translation-old_rest[source.name].translation)*ratio
   p.matrix=Matrix.LocRotScale(head,rotation,Vector((1,1,1)))
   bpy.context.view_layer.update()
  # Keep locomotion on two ipsilateral tracks. The humanoid donor narrows
  # this broad lion stance until its ankles cross. Solve both leg segments
  # with their authored lengths and a forward knee pole, preserving stride.
  if name in ['Walking','Running']:
   hip_delta=rig.pose.bones['Hips'].matrix@new_rest['Hips'].inverted()
   for side in ['Left','Right']:
    upper=rig.pose.bones[side+'UpLeg'];lower=rig.pose.bones[side+'Leg'];foot=rig.pose.bones[side+'Foot']
    start=upper.matrix.translation.copy();old_knee=lower.matrix.translation.copy();end=foot.matrix.translation.copy();foot_q=foot.matrix.to_quaternion()
    local=hip_delta.inverted()@end;bind_x=new_rest[side+'Foot'].translation.x
    local.x=bind_x+.15*(local.x-bind_x);end=hip_delta@local
    l1=(new_rest[side+'Leg'].translation-new_rest[side+'UpLeg'].translation).length
    l2=(new_rest[side+'Foot'].translation-new_rest[side+'Leg'].translation).length
    axis=end-start;distance=min(axis.length,(l1+l2)*.998);axis.normalize();end=start+axis*distance
    along=(l1*l1-l2*l2+distance*distance)/(2*distance)
    pole=hip_delta.to_quaternion()@Vector((0,-1,0));pole-=axis*pole.dot(axis);pole.normalize()
    knee=start+axis*along+pole*math.sqrt(max(0,l1*l1-along*along))
    for bone,head,tip,child in [(upper,start,knee,side+'Leg'),(lower,knee,end,side+'Foot')]:
     rest_direction=new_rest[child].translation-new_rest[bone.name].translation
     q=rest_direction.rotation_difference(tip-head)@new_rest[bone.name].to_quaternion()
     bone.matrix=Matrix.LocRotScale(head,q,Vector((1,1,1)));bpy.context.view_layer.update()
    foot.matrix=Matrix.LocRotScale(end,foot_q,Vector((1,1,1)));bpy.context.view_layer.update()
  # The source foot bind axes differ substantially from this rig. Keep each
  # sole horizontal while preserving animated yaw and leg/ankle positions.
  for side in ['Left','Right']:
   p=rig.pose.bones[side+'Foot'];q=p.matrix.to_quaternion()
   normal=(q@new_rest[p.name].to_quaternion().inverted())@Vector((0,0,1))
   corrected=normal.rotation_difference(Vector((0,0,1)))@q
   p.matrix=Matrix.LocRotScale(p.matrix.translation,corrected,Vector((1,1,1)))
   bpy.context.view_layer.update()
  evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
  bottom=min(evaluated.data.vertices[i].co.z for i in sole_ids)
  hips=rig.pose.bones['Hips'];matrix=hips.matrix.copy();matrix.translation.z+=lowest-bottom;hips.matrix=matrix
  bpy.context.view_layer.update()
  # Cache body motion in source units for offline cloth/tail contacts.
  hd=rig.pose.bones['Hips'].matrix@new_rest['Hips'].inverted()
  capsules=[]
  for side in ['Left','Right']:
   for first_b,last_b,radius in [('UpLeg','Leg',.075),('Leg','Foot',.055)]:
    capsules.append((np.array(rig.pose.bones[side+first_b].matrix.translation),np.array(rig.pose.bones[side+last_b].matrix.translation),radius))
  samples.append({'hip':np.array(hd),'capsules':capsules})
  for p in rig.pose.bones:
   p.keyframe_insert('rotation_quaternion',frame=frame*4,group=p.name)
   p.keyframe_insert('location',frame=frame*4,group=p.name)
  if frame==frames[0]:print(name,'first baked',flush=True)
 if a.blend_dir:
  cache=Path(a.blend_dir);cache.mkdir(parents=True,exist_ok=True);np.save(cache/(name+'-primary.npy'),np.array(samples,dtype=object),allow_pickle=True)
 secondary,physics=solve_secondary(samples,(last-first)/24,name in ['Walking','Running'],lowest)
 print(name,'secondary simulated',flush=True)
 for index,frame in enumerate(frames):
  scene.frame_set(round(frame*4));bpy.context.view_layer.update()
  sample=secondary[index]
  for panel,(xmin,xmax) in enumerate([(-.155,-.008),(.008,.155)]):
   grid=sample['cloth'][panel].reshape(9,5,3)
   for column,col in enumerate([1,3]):
    for segment,(r0,r1) in enumerate(zip([0,3,6],[3,6,8])):
     bone=rig.pose.bones[cloth_names[panel][column][segment]];head=Vector(grid[r0,col]);end=Vector(grid[r1,col]);rest=new_rest[bone.name]
     direction=end-head;authored=rig.data.bones[bone.name].tail_local-rig.data.bones[bone.name].head_local
     q=authored.rotation_difference(direction)@rest.to_quaternion()
     bone.matrix=Matrix.LocRotScale(head,q,Vector((1,1,1)))
     bpy.context.view_layer.update()
     for prop in ['location','rotation_quaternion','scale']:bone.keyframe_insert(prop,frame=frame*4,group=bone.name)
  for j,name_tail in enumerate(tail_names):
   bone=rig.pose.bones[name_tail];bone.rotation_quaternion=Euler((float(sample['tail'][j,0]),0,float(sample['tail'][j,1])),'XYZ').to_quaternion()
   bone.keyframe_insert('rotation_quaternion',frame=frame*4,group=bone.name)
  bpy.context.view_layer.update()
  # Muscular tail/ground contact: lift the root only when the baked tuft or
  # tube would pass through the floor during crouching attacks.
  for contact in range(5):
   evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
   min_tail=min(evaluated.data.vertices[i].co.z for i in tail_indices)
   if min_tail>=lowest+.025:break
   tip=sum((evaluated.data.vertices[i].co for i in tuft_indices),Vector())/len(tuft_indices)
   root_tail=rig.pose.bones[tail_names[0]];head=root_tail.matrix.translation.copy();direction=tip-head;wanted=direction+Vector((0,0,lowest+.035-min_tail))
   correction=direction.rotation_difference(wanted)
   root_tail.matrix=Matrix.LocRotScale(head,correction@root_tail.matrix.to_quaternion(),Vector((1,1,1)));bpy.context.view_layer.update()
  rig.pose.bones[tail_names[0]].keyframe_insert('rotation_quaternion',frame=frame*4,group=tail_names[0])
 if name in ['Walking','Running']:
  for layer in target.layers:
   for strip in layer.strips:
    for bag in strip.channelbags:
     for curve in bag.fcurves:
      if any(n in curve.data_path for n in ['ClothRear_','Tail_']):
       keys=curve.keyframe_points
       if keys:keys[-1].co.y=keys[0].co.y;keys[-1].handle_left.y=keys[0].co.y;keys[-1].handle_right.y=keys[0].co.y
 physics['clip']=name;report['secondaryMotion'].append(physics)
 new_actions.append((name,target))
 report['clips'].append({'name':name,'firstFrame':first,'lastFrame':last,'samples':len(frames),'duration':(last-first)/24})
old.animation_data.action=None
for obj in list(bpy.context.scene.objects):
 if obj not in new_objects:bpy.data.objects.remove(obj,do_unlink=True)
rig.animation_data.action=None
for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
for name,action in new_actions:
 track=rig.animation_data.nla_tracks.new();track.name=name
 strip=track.strips.new(name,int(action.frame_range[0]),action);strip.name=name
 strip.action_frame_start=action.frame_range[0];strip.action_frame_end=action.frame_range[1]
 track.mute=True
# Mesh is parented to the armature: transform datablocks once, avoiding a
# doubled parent/child scale. Scale local translation animation lanes as well.
transform=Matrix.Translation((0,0,-lowest*scale))@Matrix.Scale(scale,4)

for obj in [mesh,cloth]:obj.data.transform(transform)
rig.data.transform(transform)
for name,action in new_actions:
 for layer in action.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    for curve in bag.fcurves:
     if curve.data_path.endswith('.location'):
      for key in curve.keyframe_points:
       key.co.y*=scale;key.handle_left.y*=scale;key.handle_right.y*=scale
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
bpy.ops.object.select_all(action='DESELECT')
for obj in [mesh,cloth,rig]:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
# Export each muted NLA track as its own named clip.
for name,action in new_actions:action.name=name
for obj in [mesh,cloth,rig]:obj.select_set(True)
Path(a.output).parent.mkdir(parents=True,exist_ok=True)
if a.blend_dir:
 out=Path(a.blend_dir);out.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(out/'repaired.blend'))
# Canonical working GLB uses a 4K albedo to fit the repository resource limit;
# editable blend and external source retain the original 8K texture.
for image in bpy.data.images:
 if image.size[0]>4096:image.scale(4096,4096)
report['canonicalTextures']='Albedo 8192 to 4096; original normal 4096. Runtime pipeline then downsizes both to 2048 WebP.'
bpy.ops.export_scene.gltf(filepath=a.output,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_materials='EXPORT',export_image_format='AUTO',export_extras=True)
report['after']={'bodyVertices':len(mesh.data.vertices),'clothVertices':len(cloth.data.vertices),'faces':len(mesh.data.polygons)+len(cloth.data.polygons),'bones':len(rig.data.bones),'bytes':Path(a.output).stat().st_size}
Path(a.report).parent.mkdir(parents=True,exist_ok=True);Path(a.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report),flush=True)

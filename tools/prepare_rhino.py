"""Blender headless foot repair and native-animation retarget for rhino.
Preserves source body surfaces, UVs and materials; repairs feet/head and frees the rear garment.
"""
import argparse,sys,json,math,hashlib
from pathlib import Path
import bpy,numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from rhino_cloth_motion import prepare_cloth,simulate,bake
from mathutils import Vector,Matrix,Quaternion
args=argparse.ArgumentParser()
args.add_argument('--head-lift',type=float,default=22,help='Anatomical head pitch correction in degrees; animated turns and nods retained')
args.add_argument('--input',required=True);args.add_argument('--output',required=True);args.add_argument('--report',required=True);args.add_argument('--blend-dir')
a=args.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(__file__).resolve().parents[1]
old_path=root/'public/assets/b396fba7b2c500770a3770222fc6a3b5b9a17fce66933ad53d569ae349affc82.glb'
report={'sourceSha256':hashlib.sha256(Path(a.input).read_bytes()).hexdigest(),'sourceBytes':Path(a.input).stat().st_size,'blender':bpy.app.version_string,'animationSource':str(old_path.relative_to(root)),'scope':'Foot and head repairs retained; rear garment detached from thigh skin, waist rig and offline cloth simulation added. Original underlying body surface retained. Other source surfaces and materials retained.'}
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=a.input)
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent==rig)
rig.animation_data_clear()
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
rig.data.pose_position='REST';bpy.context.view_layer.update()
report['before']={'vertices':len(mesh.data.vertices),'faces':len(mesh.data.polygons),'bones':len(rig.data.bones)}
cloth,cloth_names,cloth_report=prepare_cloth(mesh,rig)
report['cloth']=cloth_report;report['secondaryMotion']=[]
body_before={'vertices':len(mesh.data.vertices),'faces':len(mesh.data.polygons)}
original_positions=[v.co.copy() for v in mesh.data.vertices];normals=[n.vector.copy() for n in mesh.data.corner_normals];rotations={};sole_ids=[];feet=[]
for side,sign in [('Left',1),('Right',-1)]:
 group=mesh.vertex_groups[side+'Foot'];ankle=rig.data.bones[side+'Foot'].head_local.copy()
 candidates=[p for p in mesh.data.polygons if p.center.x*sign>.025 and p.center.z<ankle.z+.04 and p.normal.z<-.4]
 seed=max(candidates,key=lambda p:p.area);plane=sum((p.normal*p.area for p in candidates if p.normal.dot(seed.normal)>.9998),Vector()).normalized()
 soles=[p for p in candidates if p.normal.dot(plane)>.9998]
 ids=set(i for p in soles for i in p.vertices)
 assert len(ids)>20,(side,len(ids))
 rotation=(-plane).rotation_difference(Vector((0,0,1)))
 changed=[]
 for v in mesh.data.vertices:
  foot_weight=next((g.weight for g in v.groups if g.group==group.index),0)
  if v.co.x*sign>.025 and v.co.z<ankle.z+.08 and foot_weight>.01:
   t=max(0,min(1,(ankle.z+.08-v.co.z)/.07));q=rotation.slerp(rotation.__class__(),1-t)
   v.co=ankle+q@(v.co-ankle);rotations[v.index]=q;changed.append(v.index)
 assert all(i in changed for i in ids)
 floor=min(mesh.data.vertices[i].co.z for i in changed)
 # Include heel/toe underside lanes that carry residual calf weights; these
 # must share the rigid sole or they bend below it during the stride.
 ids.update(i for i in changed if mesh.data.vertices[i].co.z<floor+.012)
 assert max(abs(mesh.data.vertices[i].co.z-floor) for i in ids)<.02,'Unexpected sole curvature; re-inspect selection'
 for i in ids:
  v=mesh.data.vertices[i];v.co.z=floor
  for g in list(v.groups):mesh.vertex_groups[g.group].remove([i])
  group.add([i],1,'REPLACE')
 sole_ids.extend(sorted(ids))
 feet.append({'side':side,'vertices':len(changed),'soleVertices':len(ids),'soleNormalBefore':list(plane),'correctionDegrees':math.degrees(rotation.angle),'floor':floor})
mesh.data.update()
mesh.data.normals_split_custom_set([rotations[loop.vertex_index]@normals[i] if loop.vertex_index in rotations else normals[i] for i,loop in enumerate(mesh.data.loops)])
report['feet']=feet
report['preservation']={'verticesOutsideFeetUnchanged':all(v.co==original_positions[v.index] for v in mesh.data.vertices if v.index not in rotations),'bodyTopologyAfterClothSeparationUnchanged':len(mesh.data.vertices)==body_before['vertices'] and len(mesh.data.polygons)==body_before['faces'],'originalBonesRetained':report['before']['bones'],'totalBones':len(rig.data.bones),'customNormals':'Rotated with repaired feet; original elsewhere','materialsAndTextures':'Original source material parameters and texture pixels retained before runtime texture downscale'}
assert report['preservation']['verticesOutsideFeetUnchanged'] and report['preservation']['bodyTopologyAfterClothSeparationUnchanged']
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
scale=3/height
report['scale']=scale;report['hipTranslationRatio']=ratio
report['retarget']={'armBindCalibration':'T-pose replacement to A-pose donor using animated limb directions','bakeFps':96,'preserved':'Own target limb lengths, authored finger hierarchy and native clip duration'}
report['headPosture']={'headLiftDegrees':a.head_lift,'neckLiftDegrees':5,'axis':'Animated torso lateral axis','preserved':'Animated head turns and nods; authored bind skeleton and mesh retained'}
# Evaluate donor on its original 24 fps frame coordinates; write target keys
# at four times those coordinates and export at 96 fps, preserving duration.
scene=bpy.context.scene;scene.render.fps=96
rig.animation_data_create();new_actions=[];report['clips']=[]
endpoints={side+bone:(side+child,side+donor) for side in ['Left','Right'] for bone,child,donor in [('Shoulder','Arm','Arm'),('Arm','ForeArm','ForeArm'),('ForeArm','Hand','Hand'),('Hand','HandMiddle4','HandMiddle4')]}
for name in native:
 action=lookup(name);old.animation_data.action=action
 first,last=action.frame_range;first=float(first);last=float(last)
 target=bpy.data.actions.new('retarget_'+name);target.use_fake_user=True;rig.animation_data.action=target
 samples=[]
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
   if p.name in ['Neck','Head','Head_top']:
    # Lift the neutral gaze in the animated torso frame, keeping the donor
    # motion around that baseline rather than locking the head in world space.
    torso=rig.pose.bones['Spine2'].matrix.to_quaternion()@new_rest['Spine2'].to_quaternion().inverted()
    axis=torso@Vector((1,0,0));lift=5 if p.name=='Neck' else a.head_lift
    rotation=Quaternion(axis,math.radians(-lift))@rotation
   if p.parent:
    head=p.parent.matrix@(new_rest[p.parent.name].inverted()@new_rest[p.name].translation)
   else:
    head=new_rest[p.name].translation+(source.matrix.translation-old_rest[source.name].translation)*ratio
   p.matrix=Matrix.LocRotScale(head,rotation,Vector((1,1,1)))
   bpy.context.view_layer.update()
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
  hd=rig.pose.bones['Hips'].matrix@new_rest['Hips'].inverted();capsules=[]
  for side in ['Left','Right']:
   for start,end,radius in [('UpLeg','Leg',.105),('Leg','Foot',.08)]:capsules.append((np.array(rig.pose.bones[side+start].matrix.translation),np.array(rig.pose.bones[side+end].matrix.translation),radius))
  samples.append({'hip':np.array(hd),'capsules':capsules})
  for p in rig.pose.bones:
   p.keyframe_insert('rotation_quaternion',frame=frame*4,group=p.name)
   p.keyframe_insert('location',frame=frame*4,group=p.name)
  if frame==frames[0]:print(name,'first baked',flush=True)
 motion,physics=simulate(samples,name in ['Walking','Running'],lowest)
 for index,frame in enumerate(frames):
  scene.frame_set(round(frame*4));bpy.context.view_layer.update();bake(rig,cloth_names,new_rest,motion[index],frame*4)
 if name in ['Walking','Running']:
  for layer in target.layers:
   for strip in layer.strips:
    for bag in strip.channelbags:
     for curve in bag.fcurves:
      if 'ClothRear_' in curve.data_path:
       keys=curve.keyframe_points;keys[-1].co.y=keys[0].co.y;keys[-1].handle_left.y=keys[0].co.y;keys[-1].handle_right.y=keys[0].co.y
 physics['clip']=name;report['secondaryMotion'].append(physics);print(name,'cloth baked',flush=True)
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
# Preserve full-resolution textures in the editable Blender source.
if a.blend_dir:
 out=Path(a.blend_dir);out.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(out/'repaired.blend'))
for image in bpy.data.images:
 if image.size[0]>4096:image.scale(4096,4096)
report['canonicalTextures']='Albedo 8192 to 4096 to respect the repository resource limit; runtime pipeline uses 2048 WebP. Editable Blender retains original images.'
bpy.ops.export_scene.gltf(filepath=a.output,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_materials='EXPORT',export_image_format='AUTO',export_extras=True)
report['after']={'vertices':sum(len(o.data.vertices) for o in [mesh,cloth]),'faces':sum(len(o.data.polygons) for o in [mesh,cloth]),'bones':len(rig.data.bones),'bytes':Path(a.output).stat().st_size}
Path(a.report).parent.mkdir(parents=True,exist_ok=True);Path(a.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report),flush=True)

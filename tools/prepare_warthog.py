"""Blender headless repair and world-space retarget of the replacement warthog.

blender -b --python tools/prepare_warthog.py -- --input NEW.glb --output OUT.glb
The seven native clips retain names and exact time ranges. External source is
kept intact. Run compress_web_assets.mjs after installing the resulting GLB.
"""
import argparse, sys, json, math, hashlib
from pathlib import Path
import bpy, bmesh, numpy as np
from mathutils import Vector, Matrix, Quaternion

args=argparse.ArgumentParser()
args.add_argument('--input',required=True);args.add_argument('--output',required=True)
args.add_argument('--blend-dir',help='Optional directory for the editable repaired.blend');args.add_argument('--report',required=True)
args.add_argument('--head-lift',type=float,default=18,help='Anatomical head pitch correction in degrees; animation motion is retained')
a=args.parse_args(sys.argv[sys.argv.index('--')+1:])
root=Path(__file__).resolve().parents[1]
old_path=root/'public/assets/cb7a23479fb9210b6cda1ab13cbddd85b3ebce10cad863f1dd8ae1d9d66e4869.glb'
report={'sourceSha256':hashlib.sha256(Path(a.input).read_bytes()).hexdigest(),'blender':bpy.app.version_string,'animationSource':str(old_path.relative_to(root))}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a.input)
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
rig.animation_data_clear()
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
rig.data.pose_position='REST'
bm=bmesh.new();bm.from_mesh(mesh.data)
report['before']={'vertices':len(bm.verts),'faces':len(bm.faces)}
# Split UV/normal lanes are welded geometrically; loop UVs remain separate.
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
bm.verts.ensure_lookup_table();bm.verts.index_update()
seen=set();parts=[]
for v in bm.verts:
 if v.index in seen:continue
 todo=[v];part=[];seen.add(v.index)
 while todo:
  q=todo.pop();part.append(q)
  for e in q.link_edges:
   n=e.other_vert(q)
   if n.index not in seen:seen.add(n.index);todo.append(n)
 parts.append(part)
# Necklace beads/teeth are distinct connected components. All are rigidly
# attached to Neck; the central pendant is part of the connected torso.
collar_parts=[1,3,4,5,7,10,11,13,14,16]
assert len(parts)==17,'Replacement topology changed: re-inspect necklace selection'
collar=set(v.index for i in collar_parts for v in parts[i])
collar.update(v.index for v in parts[0] if abs(v.co.x)<.043 and v.co.y<-.095 and .305<v.co.z<.415)
deform=bm.verts.layers.deform.verify();neck=mesh.vertex_groups['Neck'].index
report['collar']={'vertices':len(collar),'bone':'Neck','weight':1,'previousLimbInfluences':sum(1 for i in collar if any(mesh.vertex_groups[g].name.endswith(('Arm','Hand','Leg','Foot','Shoulder')) and w>.001 for g,w in bm.verts[i][deform].items()))}
for i in collar:bm.verts[i][deform].clear();bm.verts[i][deform][neck]=1
head_group=mesh.vertex_groups['Head'].index
for i in [2,6,8,9,12,15]:
 for v in parts[i]:v[deform].clear();v[deform][head_group]=1
# Close only genuine rear/top mane holes. Nostril and mouth openings stay authored.
edges=set(e for e in bm.edges if e.is_boundary);patches=[]
while edges:
 todo=[edges.pop()];group=[]
 while todo:
  e=todo.pop();group.append(e)
  for v in e.verts:
   for n in v.link_edges:
    if n in edges:edges.remove(n);todo.append(n)
 vs=set(v for e in group for v in e.verts);center=sum((v.co for v in vs),Vector())/len(vs)
 if (center.y>.07 and center.z>.45) or center.z>.85:
  faces=bmesh.ops.holes_fill(bm,edges=group,sides=0)['faces']
  if not faces:
   # Imported T junctions can leave a boundary chain instead of a cycle.
   # Complete its missing edge using the ordered chain, then triangulate.
   ends=[v for v in vs if sum(v in e.verts for e in group)==1]
   ordered=[ends[0] if ends else next(iter(vs))];used=set()
   while len(used)<len(group):
    options=[e for e in group if e not in used and ordered[-1] in e.verts]
    if not options:break
    e=options[0];used.add(e);n=e.other_vert(ordered[-1])
    if n==ordered[0]:break
    ordered.append(n)
   assert len(set(ordered))>=3,(len(group),list(center))
   faces=[bm.faces.new(ordered)]
  for f in faces:f.material_index=1
  patches.append({'edges':len(group),'faces':len(faces),'center':list(center)})
assert len(patches)==3,patches
report['manePatches']=patches
# Fit sole planes from downward-facing triangles, rotate below the ankle with
# a smooth falloff. Preserve hoof silhouette; flatten the bottom contact band.
feet=[];sole_ids=[]
for side,sign in [('Left',1),('Right',-1)]:
 verts=[v for v in bm.verts if v.co.x*sign>.04 and v.co.z<.1 and abs(v.co.x)<.18 and v.co.y<.15]
 bottom=[v for v in verts if v.co.z<.02]
 coords=np.array([tuple(v.co) for v in bottom]);center=coords.mean(axis=0)
 # The rear and front lower envelope define the sole rather than the toe bevel.
 bins=np.linspace(coords[:,1].min(),coords[:,1].max(),7);samples=[]
 for lo,hi in zip(bins[:-1],bins[1:]):
  points=coords[(coords[:,1]>=lo)&(coords[:,1]<=hi)]
  if len(points):samples.append(points[np.argmin(points[:,2])])
 fit=np.array(samples);slope,intercept=np.polyfit(fit[:,1],fit[:,2],1)
 angle=math.atan(float(slope));pivot=rig.data.bones[side+'Foot'].head_local.copy()
 rotation=Matrix.Rotation(-angle,3,'X')
 for v in verts:
  weight=max(0,min(1,(.1-v.co.z)/.045));v.co=v.co.lerp(pivot+rotation@(v.co-pivot),weight)
 floor=min(v.co.z for v in verts)
 for v in verts:
  if v.co.z<floor+.009:
   v.co.z=floor;v[deform].clear();v[deform][mesh.vertex_groups[side+'Foot'].index]=1;sole_ids.append(v.index)
 feet.append({'side':side,'vertices':len(verts),'solePitchDegrees':math.degrees(angle),'floor':floor})
report['feet']=feet
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh.data);bm.free();mesh.data.update()
mesh.data.set_sharp_from_angle(angle=math.radians(55))
report['shading']={'method':'Interpolated smooth normals, 55 degree crease limit','smoothFaces':sum(p.use_smooth for p in mesh.data.polygons),'preserved':'Creases above 55 degrees on tusks, hooves and mane; silhouette and painted texture unchanged'}
patch=bpy.data.materials.new('Mane repairs');patch.use_nodes=True
bsdf=patch.node_tree.nodes['Principled BSDF'];bsdf.inputs['Base Color'].default_value=(.052,.038,.032,1);bsdf.inputs['Roughness'].default_value=.88
mesh.data.materials.append(patch)
material=mesh.data.materials[0];node=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED');node.inputs['Roughness'].default_value=.85
# A modest normal strength avoids glossy faceted highlights under night lighting.
for n in material.node_tree.nodes:
 if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.55
node.inputs['Specular IOR Level'].default_value=.18
rig.data.pose_position='POSE'
new_objects=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(old_path))
old=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE' and o!=rig)
old_clips={}
# Importer slots are assigned to NLA strips, one per original GLTF animation.
for track in old.animation_data.nla_tracks:
 for strip in track.strips:old_clips[strip.action.name]=strip.action
if old.animation_data.action:old_clips[old.animation_data.action.name]=old.animation_data.action
native=['Running','Walking','Charged_Upward_Slash','Right_Hand_Sword_Slash','Weapon_Combo','Weapon_Combo_2','restpose']
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
scale=2.64/height
report['scale']=scale;report['hipTranslationRatio']=ratio
report['headPosture']={'headLiftDegrees':a.head_lift,'neckLiftDegrees':5,'axis':'Animated torso lateral axis','preserved':'Relative animated head turns and nods; authored restpose unchanged'}
scene=bpy.context.scene;scene.render.fps=24
rig.animation_data_create();new_actions=[];report['clips']=[]
for name in native:
 action=lookup(name);old.animation_data.action=action
 first,last=action.frame_range;first=float(first);last=float(last)
 target=bpy.data.actions.new('retarget_'+name);target.use_fake_user=True;rig.animation_data.action=target
 frames=sorted(set([first,last]+[float(f) for f in range(math.ceil(first),math.floor(last)+1)]))
 for frame in frames:
  scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
  # World-space deltas remove source bind orientation. The target hierarchy
  # retains its own lengths; no source translations are copied onto limbs.
  for p in rig.pose.bones:
   source=old.pose.bones[mapping[p.name]]
   rotation=source.matrix.to_quaternion()@old_rest[source.name].to_quaternion().inverted()@new_rest[p.name].to_quaternion()
   if name!='restpose' and p.name in ['Neck','Head','Head_top']:
    # The new skull's neutral gaze differs from the donor. Calibrate its
    # baseline rather than carrying over the donor's downcast head pitch.
    torso=rig.pose.bones['Spine2'].matrix.to_quaternion()@new_rest['Spine2'].to_quaternion().inverted()
    axis=torso@Vector((1,0,0));lift=5 if p.name=='Neck' else a.head_lift
    rotation=Quaternion(axis,math.radians(-lift))@rotation
   if p.parent:
    head=p.parent.matrix@(new_rest[p.parent.name].inverted()@new_rest[p.name].translation)
   else:
    head=new_rest[p.name].translation+(source.matrix.translation-old_rest[source.name].translation)*ratio
   p.matrix=Matrix.LocRotScale(head,rotation,Vector((1,1,1)))
   bpy.context.view_layer.update()
  # The source hoof bind axes differ substantially from this rig. Keep each
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
  for p in rig.pose.bones:
   p.keyframe_insert('rotation_quaternion',frame=frame,group=p.name)
   p.keyframe_insert('location',frame=frame,group=p.name)
  if frame==frames[0]:print(name,'first baked',flush=True)
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
mesh.data.transform(transform);rig.data.transform(transform)
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
for obj in [mesh,rig]:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
# Export muted tracks using ACTIONS so each action receives its own name.
for name,action in new_actions:action.name=name
for obj in [mesh,rig]:obj.select_set(True)
Path(a.output).parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=a.output,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_materials='EXPORT',export_image_format='AUTO',export_extras=True)
report['after']={'vertices':len(mesh.data.vertices),'faces':len(mesh.data.polygons),'bytes':Path(a.output).stat().st_size}
Path(a.report).parent.mkdir(parents=True,exist_ok=True);Path(a.report).write_text(json.dumps(report,indent=2)+'\n')
if a.blend_dir:
 out=Path(a.blend_dir);out.mkdir(parents=True,exist_ok=True)
 # Save editable repair with retarget actions for later animals and inspection.
 bpy.ops.wm.save_as_mainfile(filepath=str(out/'repaired.blend'))
print(json.dumps(report),flush=True)

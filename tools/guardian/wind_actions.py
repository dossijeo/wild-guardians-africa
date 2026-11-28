"""Continuous, travelling cloth gusts baked to the existing floating rig."""
import bpy,math
from mathutils import Vector

def create_wind(rig):
 for track in list(rig.animation_data.nla_tracks):
  if track.name in ['Mantle_Breeze','Mantle_Spell']:
   actions=[s.action for s in track.strips];rig.animation_data.nla_tracks.remove(track)
   for action in actions:
    if action.users==0:bpy.data.actions.remove(action)
 for track in rig.animation_data.nla_tracks:track.mute=True
 secondary=[b for b in rig.pose.bones if b.name.startswith(('Mantle.','Feather.','Wood.'))]
 for name,gain in [('Mantle_Breeze',1),('Mantle_Spell',1.35)]:
  action=bpy.data.actions.new(name);rig.animation_data.action=action
  for frame in range(1,290):
   w=math.tau*(frame-1)/288
   for panel,label in enumerate(['FL','FR','BL','BR']):
    for level in range(3):
     bone=rig.pose.bones[f'Mantle.{label}.{level}'];bone.rotation_mode='XYZ';phase=panel*.45-level*.9
     wave=math.sin(w*3+phase);ripple=math.sin(w*7+phase*1.4)
     # Pinned shoulders, moving middle, broad rolling hem. No added bone stretch.
     bone.rotation_euler=(gain*([.018,.12,.58][level]*wave+[0,.018,.09][level]*ripple),gain*[.008,.025,.10][level]*math.sin(w*3+phase+.8),gain*[.012,.055,.16][level]*math.sin(w*3+phase+1.1))
     amp=[.002,.004,.009][level]*gain
     delta=Vector((amp*.55*wave,amp*math.sin(w*3+phase-.5),amp*.25*math.sin(w*3+phase+.7)))
     bone.location=bone.bone.matrix_local.to_3x3().inverted()@delta
   for i,bone in enumerate(b for b in secondary if b.name.startswith('Feather.')):
    bone.rotation_mode='XYZ';phase=int(bone.name.split('.')[1])*1.31
    if bone.name.endswith('.Tip'):bone.rotation_euler=(gain*1.2*(.38*math.sin(w*3+phase-.7)+.10*math.sin(w*7+phase)),0,gain*1.2*.08*math.sin(w*5+phase-.4))
    else:bone.rotation_euler=(gain*.36*math.sin(w*3+phase),gain*.20*math.sin(w*2+phase+.5),gain*.29*math.sin(w*3+phase+1))
   for i,bone in enumerate(b for b in secondary if b.name.startswith('Wood.')):
    bone.rotation_mode='XYZ';phase=i*1.31
    bone.rotation_euler=(gain*.30*math.sin(w*2+phase),gain*.20*math.sin(w*3+phase+.5),gain*.25*math.sin(w*2+phase+1))
    delta=1.65*Vector((.024*math.sin(w+phase),.024*math.sin(w*2+phase),.038*math.sin(w*2+phase+.7)))
    bone.location=bone.bone.matrix_local.to_3x3().inverted()@delta
   for bone in secondary:
    for prop in ['location','rotation_euler']:bone.keyframe_insert(prop,frame=frame,group=bone.name)
  for curve in action.fcurves:
   # Match the two one-sided sampled velocities at the periodic seam.
   keys=curve.keyframe_points;center=keys[0].co.y;delta=(keys[1].co.y-keys[-2].co.y)*.5
   keys[1].co.y=center+delta;keys[-2].co.y=center-delta;keys[-1].co.y=center
   for key in curve.keyframe_points:key.interpolation='LINEAR'
  track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True;rig.animation_data.action=None
 for bone in secondary:bone.location=(0,0,0);bone.rotation_euler=(0,0,0)

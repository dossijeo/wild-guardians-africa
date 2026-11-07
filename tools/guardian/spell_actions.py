"""Authored two-bone reaches; all IK is baked into ordinary GLB joint tracks."""
import bpy, math
from mathutils import Vector, Matrix

def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
def mix(a,b,t):return Vector(a).lerp(Vector(b),t)
def orient(bone,direction):
 current=bone.matrix.copy();rotation=(current.to_3x3()@Vector((0,1,0))).rotation_difference(direction.normalized())
 bone.matrix=Matrix.LocRotScale(current.translation,rotation@current.to_quaternion(),Vector((1,1,1)))
 bpy.context.view_layer.update()
def reach(rig,side,target):
 arm=rig.pose.bones['Arm.'+side];fore=rig.pose.bones['Forearm.'+side];hand=rig.pose.bones['Hand.'+side]
 shoulder=arm.head.copy();delta=target-shoulder;distance=max(.025,min(delta.length,arm.length+fore.length-.004));axis=delta.normalized()
 sign=-1 if side=='L' else 1;pole=Vector((sign*.4,.03,-.06))-shoulder;pole=(pole-axis*pole.dot(axis)).normalized()
 along=(arm.length**2-fore.length**2+distance**2)/(2*distance);height=math.sqrt(max(0,arm.length**2-along**2));elbow=shoulder+axis*along+pole*height
 orient(arm,elbow-shoulder);orient(fore,target-fore.head)
 # Palm/hand chain points down the same line as the emitted energy.
 orient(hand,Vector((0,-.85,.02))-hand.head)
 for pb in [arm,fore,hand]:pb.keyframe_insert('rotation_euler',group=pb.name)

def create_spells(rig):
 for track in list(rig.animation_data.nla_tracks):
  if track.name.startswith('Spell_'):rig.animation_data.nla_tracks.remove(track)
 for action in list(bpy.data.actions):
  if action.name.startswith('Spell_') and action.users==0:bpy.data.actions.remove(action)
 for track in rig.animation_data.nla_tracks:track.mute=True
 scene=bpy.context.scene
 for kind in ['Grow','Multiply','Shield','Attack']:
  action=bpy.data.actions.new('Spell_'+kind);rig.animation_data.action=action
  for frame in range(1,50,2):
   scene.frame_set(frame);t=(frame-1)/48
   for pb in rig.pose.bones:pb.location=(0,0,0);pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0)
   gather=smooth(t/.24);release=smooth((t-.24)/(.15 if kind=='Attack' else .32));recover=smooth((t-.64)/.36)
   pulse=math.sin(math.pi*t)**2
   for name,angles in [('Torso',(.09*pulse,0,(-.07 if kind=='Attack' else .025)*pulse)),('Head',(.14*pulse,.04*pulse,0))]:
    pb=rig.pose.bones[name];pb.rotation_mode='XYZ';pb.rotation_euler=angles;pb.keyframe_insert('rotation_euler',group=name)
   bpy.context.view_layer.update()
   for side,sign in [('L',-1),('R',1)]:
    rest=(sign*.18,-.055,-.075);charge=(sign*.085,-.105,.055)
    if kind=='Grow':charge=(sign*.13,-.09,-.04);out=(sign*.12,-.165,.035)
    elif kind=='Multiply':out=(sign*.20,-.13,.035)
    elif kind=='Shield':charge=(sign*.07,-.10,.09);out=(sign*.20,-.125,.095)
    else:
     charge=(sign*.10,-.075,.075);out=(sign*(.11 if side=='R' else .15),-.17 if side=='R' else -.11,.045 if side=='R' else .015)
    target=mix(rest,charge,gather);target=target.lerp(Vector(out),release);target=target.lerp(Vector(rest),recover)
    reach(rig,side,target)
  for fc in action.fcurves:
   for key in fc.keyframe_points:key.interpolation='LINEAR'
  tr=rig.animation_data.nla_tracks.new();tr.name=action.name;tr.strips.new(action.name,1,action);tr.mute=True;rig.animation_data.action=None
 for pb in rig.pose.bones:pb.location=(0,0,0);pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0)

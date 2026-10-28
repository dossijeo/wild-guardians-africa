"""Isolated Guardian lid study; never overwrites production assets."""
import bpy,math,argparse,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[2];bpy.ops.wm.open_mainfile(filepath=str(root/'art/guardian/guardian.blend'))
o=bpy.data.objects['GuardianFace'];mesh=o.data;keys=mesh.shape_keys.key_blocks
slot=next(i for i,m in enumerate(mesh.materials) if m.name=='Painted wooden eyelids')
ids=sorted({v for f in mesh.polygons if f.material_index==slot for v in f.vertices});assert len(ids)==462,len(ids)
from mathutils import Vector
from mathutils.bvhtree import BVHTree
body=bpy.data.objects['Guardian'];rig=bpy.data.objects['GuardianRig'];head=rig.pose.bones['Head'];pose=head.matrix @ head.bone.matrix_local.inverted();unpose=pose.inverted()
tree=BVHTree.FromPolygons([pose @ v.co for v in body.data.vertices],[list(f.vertices) for f in body.data.polygons])
# Independently traced opening boundaries in the saved 640px orthographic reference.
contours={
 'L':([(25,370),(48,325),(92,295),(130,289),(172,313),(200,359),(218,397)],[(25,370),(65,394),(110,405),(165,410),(218,397)]),
 'R':([(365,371),(369,308),(390,271),(428,249),(459,253),(489,268),(522,292)],[(365,371),(401,366),(442,352),(477,335),(508,312),(522,292)])}
def interp(points,x):
 for (a,b),(c,d) in zip(points,points[1:]):
  if a<=x<=c:return b+(d-b)*(x-a)/(c-a)
 return points[-1][1]
def depth(x,z):
 hit,normal,index,d=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
 if hit is None:raise ValueError(('Missing mask surface',x,z))
 return hit.y-.003
for side,subset in [('L',ids[:231]),('R',ids[231:])]:
 upper,lower=contours[side]
 for j,idx in enumerate(subset):
  row,col=divmod(j,33);r=row/6;px=upper[0][0]+(upper[-1][0]-upper[0][0])*col/32
  x=(px-320)*.25/640;top=.28+(320-interp(upper,px))*.25/640+.001;bottom=.28+(320-interp(lower,px))*.25/640-.001
  z=top-.00015*r;y=depth(x,z)
  for key in keys:key.data[idx].co=unpose @ Vector((x,y,z))
  z=top*(1-r)+bottom*r
  keys['blink_'+side].data[idx].co=unpose @ Vector((x,depth(x,z),z))
# The prior body blink excavates the eye surround; preserve the carved rim.
for body in [x for x in bpy.data.objects if x.type=='MESH' and x!=o and x.data.shape_keys]:
 for key in body.data.shape_keys.key_blocks:
  if key.name.startswith('blink_'):
   for v,base in zip(key.data,body.data.shape_keys.key_blocks['Basis'].data):v.co=base.co
for rig in [x for x in bpy.data.objects if x.type=='ARMATURE']:
 if rig.animation_data:
  for track in rig.animation_data.nla_tracks:track.mute=True
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'guardian-lids.blend'),compress=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.world.color=(.22,.22,.22)
from mathutils import Vector
for loc,power in [((2,-3,3),400),((-2,-1,1),180)]:
 bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=4;lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-2,.28));cam=bpy.context.object;cam.rotation_euler=(math.pi/2,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=.25;scene.camera=cam
for value in [0,.5,1]:
 for obj in [x for x in bpy.data.objects if x.type=='MESH']:
  if obj and obj.data.shape_keys:
   for key in obj.data.shape_keys.key_blocks:
    if key.name.startswith('blink_'):key.value=value
 scene.render.filepath=str(out/f'blink-{value}.png');bpy.ops.render.render(write_still=True)


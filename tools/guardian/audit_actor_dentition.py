"""Blender audit of detached dentition and exported-authoring morph deformation."""
import bpy,sys,argparse,json,math
from pathlib import Path
from mathutils import Vector,Matrix
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
m=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.attributes.get('rigidDentalIsland'));tags=m.data.attributes['rigidDentalIsland'];key=m.data.shape_keys.key_blocks['mouthOpen'];world=m.matrix_world;groups={}
for f in m.data.polygons:
 tag=tags.data[f.index].value
 if tag:groups.setdefault(tag,set()).update(f.vertices)
assert len(groups)==3,'Both canines and lower dental row must remain separate'
pivot=Vector((0,-.41,1.43));rot=Matrix.Rotation(.32,3,'X');rows=[]
for tag,indices in groups.items():
 max_error=max((world@key.data[i].co-(pivot+rot@(world@m.data.vertices[i].co-pivot))).length for i in indices)
 assert max_error<1e-5,'Dental vertices are not moving together with the jaw'
 edges=[e for e in m.data.edges if all(i in indices for i in e.vertices)];errors={}
 for amount in [0,.5,1]:
  error=0
  for e in edges:
   i,j=e.vertices;p0=world@m.data.vertices[i].co;q0=world@m.data.vertices[j].co
   p1=p0.lerp(world@key.data[i].co,amount);q1=q0.lerp(world@key.data[j].co,amount)
   if (p0-q0).length>1e-6:error=max(error,abs((p1-q1).length/(p0-q0).length-1))
  errors[str(amount)]=error
 assert errors['1']<.0001,'Full-open morph stretches dental geometry'
 rows.append({'island':tag,'vertices':len(indices),'maxFullOpenRigidErrorMeters':max_error,'maxRelativeEdgeLengthChange':errors})
report={'input':str(Path(a.input).resolve()),'dentalIslands':rows,'scope':'Dental geometry only; not a complete visual or clip playback validation','note':'Linear morph interpolation contracts rotating dental edges slightly at partial values; measured explicitly rather than claimed fully rigid at every intermediate value.'}
Path(a.output).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))

import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
root=Path.cwd();bpy.ops.wm.open_mainfile(filepath=str(root/'content/source/actors/olderMale/expressive-candidate.blend'))
o=bpy.data.objects['Mesh0.001'];m=o.data
points=[o.matrix_world@v.co for v in m.vertices];tree=BVHTree.FromPolygons(points,[list(p.vertices) for p in m.polygons])
rows=[]
for side in [-1,1]:
 for ix in range(8):
  for iz in range(9):
   x=side*(.065+ix*.015);z=1.085+iz*.012
   origin=Vector((x,-.5,z));hits=[]
   for _ in range(12):
    location,normal,face,distance=tree.ray_cast(origin,Vector((0,1,0)),.7)
    if location is None:break
    if location.y<-.13:hits.append({'y':location.y,'face':face,'ny':normal.y})
    origin=location+Vector((0,.00001,0))
   if len(hits)>1:rows.append({'x':x,'z':z,'hits':hits})
report={'rays':144,'multipleFrontSurfaces':len(rows),'samples':rows}
(root/'test-results/olderMale-cheek-ray-audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report)[:6000])

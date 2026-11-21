import bpy,sys,json,struct,hashlib
from pathlib import Path
from collections import Counter
import sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'tools/trees'))
from tree_transfer_common import *
root=Path.cwd();out=args.output
def inspect(path):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path))
 triangles=Counter();corners=0
 for ob in bpy.context.scene.objects:
  if ob.type!='MESH':continue
  ob.data.calc_loop_triangles()
  for tri in ob.data.loop_triangles:
   points=[tuple(round(x,6) for x in ob.matrix_world@ob.data.vertices[v].co) for v in tri.vertices]
   triangles[tuple(sorted(points))]+=1;corners+=3
 return triangles,corners
before,count=inspect(args.source);after,countAfter=inspect(out/'sabana-original-hd.glb')
if before!=after:raise RuntimeError(f'Export changed surfaces: {sum((before-after).values())} missing / {sum((after-before).values())} extra')
raw=(out/'sabana-original-hd.glb').read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length])
material=doc['materials'][-1]
assert 'normalTexture' in material and 'metallicRoughnessTexture' in material['pbrMetallicRoughness']
report=json.loads((out/'verification.json').read_text());report.update(exportedTriangleCount=count//3,exportedWorldTrianglesUnchangedAtDecimalPlaces=6,normalMapExported=True,metallicRoughnessMapExported=True,sourceSHA256=hashlib.sha256(args.source.read_bytes()).hexdigest(),donorSHA256=hashlib.sha256(Path(report['donor']).read_bytes()).hexdigest())
(out/'verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

import bpy,hashlib,json,sys
from pathlib import Path
source,candidate,out=map(Path,sys.argv[sys.argv.index('--')+1:])
def signature(path):
 bpy.ops.wm.open_mainfile(filepath=str(path.resolve()));r={}
 for o in bpy.data.objects:
  if o.type!='MESH':continue
  m=o.data;data={'positions':[list(v.co) for v in m.vertices],'polygons':[list(p.vertices) for p in m.polygons],'uv':[[list(v.uv) for v in layer.data] for layer in m.uv_layers],'weights':[[[g.group,g.weight] for g in v.groups] for v in m.vertices],'keys':{k.name:[list(v.co) for v in k.data] for k in m.shape_keys.key_blocks} if m.shape_keys else {}}
  r[o.name]=hashlib.sha256(json.dumps(data,separators=(',',':')).encode()).hexdigest()
 return r
a=signature(source);b=signature(candidate);assert a==b,'Geometry/UV/weights/shape-key change'
out.write_text(json.dumps({'source':str(source),'candidate':str(candidate),'match':True,'meshSignatures':a,'scope':'Positions, polygon indices, UVs, skin weights and all shape-key coordinates. Normals and smooth-shading flags intentionally excluded. Not animation/export parity.'},indent=2))

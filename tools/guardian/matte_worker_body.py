"""Make the authored worker body dielectric and matte; preserve normal and color maps.
Run with Blender --background --python this.py -- --input source.blend --output result.blend --glb source.glb --glb-output result.glb.
Only BakedMaterial is edited: separate tools, lids and oral materials are retained.
"""
import argparse,json,struct,sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser()
for key in ('input','output','glb','glb-output'):p.add_argument('--'+key,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
m=bpy.data.materials['BakedMaterial']
m['matteWorkerBody']=True
bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for channel,value in [('Metallic',0),('Roughness',.88)]:
 for link in list(bs.inputs[channel].links):m.node_tree.links.remove(link)
 bs.inputs[channel].default_value=value
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
b=Path(a.glb).read_bytes();size=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+size]);tail=b[20+size:]
matches=[m for m in doc['materials'] if m.get('name')=='BakedMaterial'];assert len(matches)==1
matches[0].setdefault('extras',{})['matteWorkerBody']=True
mat=matches[0]['pbrMetallicRoughness'];mat.pop('metallicRoughnessTexture',None);mat.update(metallicFactor=0,roughnessFactor=.88)
s=json.dumps(doc,separators=(',',':')).encode();s+=b' '*((-len(s))%4)
out=struct.pack('<III',0x46546c67,2,20+len(s)+len(tail))+struct.pack('<II',len(s),0x4e4f534a)+s+tail
Path(a.glb_output).write_bytes(out)
print('Preserved binary payload, albedo/normal images, geometry, morphs, skin and clips; BakedMaterial roughness=.88 metallic=0')

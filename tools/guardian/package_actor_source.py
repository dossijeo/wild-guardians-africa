"""Save a portable editable copy with packed, bounded-resolution textures.

The high-resolution input is never overwritten. Geometry, rig, morphs and
animation are retained; texture downsampling is explicit in the sidecar.
"""
import argparse,json,sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);p.add_argument('--max-texture',type=int,default=2048)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);source=Path(a.input).resolve();target=Path(a.output).resolve()
assert source!=target and a.max_texture>=512
bpy.ops.wm.open_mainfile(filepath=str(source))
report={'source':str(source),'geometryChanged':False,'textures':[]}
for image in bpy.data.images:
    if image.type!='IMAGE' or image.size[0]==0:continue
    before=list(image.size);factor=min(1,a.max_texture/max(before))
    if factor<1:image.scale(max(1,round(before[0]*factor)),max(1,round(before[1]*factor)))
    # Repacking an unchanged embedded image with an empty filepath can discard
    # its payload in Blender. Keep the existing packed bytes unless resized.
    if factor<1 or not image.packed_file:image.pack()
    report['textures'].append({'name':image.name,'before':before,'after':list(image.size)})
target.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(target),compress=True)
report['bytes']=target.stat().st_size
# Verify persistence, not just the still-cached image buffers in this session.
bpy.ops.wm.open_mainfile(filepath=str(target))
report['reopenedImages']=[]
for row in report['textures']:
    image=bpy.data.images.get(row['name'])
    assert image and list(image.size)==row['after'] and image.packed_file, 'Missing packed image after reopen: '+row['name']
    assert len(image.pixels)>0, 'Unreadable packed pixels: '+row['name']
    report['reopenedImages'].append({'name':image.name,'size':list(image.size),'packed':True})
target.with_suffix('.package.json').write_text(json.dumps(report,indent=2),encoding='utf-8')

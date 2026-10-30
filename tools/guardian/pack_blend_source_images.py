"""Repair missing embedded source textures and pack an editable Blender deliverable.
Only exact image-name matches from the provided source GLB are restored.
"""
import argparse,json,struct,sys,tempfile
from pathlib import Path
import bpy
p=argparse.ArgumentParser()
for name in ('input','source-glb','output'):p.add_argument('--'+name,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
blob=Path(a.source_glb).read_bytes();length=struct.unpack_from('<I',blob,12)[0]
doc=json.loads(blob[20:20+length]);binary=blob[28+length:];images={i.get('name'):i for i in doc.get('images',[])}
restored=[]
with tempfile.TemporaryDirectory(prefix='guardian-image-repair-') as directory:
 for image in list(bpy.data.images):
  if image.type=='RENDER_RESULT' or image.packed_file:continue
  if image.has_data and image.size[0]>0:
   image.pack();continue
  source=images.get(image.name)
  if source is None or 'bufferView' not in source:raise RuntimeError('Missing image has no exact GLB match: '+image.name)
  view=doc['bufferViews'][source['bufferView']];offset=view.get('byteOffset',0)
  path=Path(directory)/(image.name+('.png' if source['mimeType']=='image/png' else '.jpg'))
  path.write_bytes(binary[offset:offset+view['byteLength']])
  replacement=bpy.data.images.load(str(path),check_existing=False)
  replacement.colorspace_settings.name=image.colorspace_settings.name
  if replacement.size[0]<=0:raise RuntimeError('Failed to reload '+image.name)
  name=image.name;image.user_remap(replacement);bpy.data.images.remove(image)
  replacement.name=name;replacement.pack();restored.append(name)

 bpy.ops.file.pack_all()
 missing=[i.name for i in bpy.data.images if i.type!='RENDER_RESULT' and not i.packed_file]
 if missing:raise RuntimeError('Unpacked images: '+str(missing))
 bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
print(json.dumps({'restored':restored,'packedImages':len(bpy.data.images),'output':a.output}))

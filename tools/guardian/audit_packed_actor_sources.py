"""Read-only reopen audit of the delivered actor Blend image payloads."""
import bpy,json,hashlib
from pathlib import Path
root=Path.cwd();rows=[]
for source in sorted((root/'content/source/actors').glob('*/*.blend')):
 bpy.ops.wm.open_mainfile(filepath=str(source));images=[]
 for i in bpy.data.images:
  if i.type!='IMAGE':continue
  images.append({'name':i.name,'size':list(i.size),'packed':bool(i.packed_file),'readable':bool(i.size[0] and len(i.pixels))})
 rows.append({'source':str(source.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'images':images,'passed':bool(images) and all(i['packed'] and i['readable'] for i in images)})
p=root/'docs/guardian/phase2/face-authoring/packed-source-audit.json';p.write_text(json.dumps(rows,indent=2));print(json.dumps([{'source':r['source'],'passed':r['passed']} for r in rows]))

"""Read-only byte-identical embedded-image inventory for the built release."""
from pathlib import Path
import struct,json,hashlib,collections,argparse
p=argparse.ArgumentParser();p.add_argument('--root',default='dist');p.add_argument('--out',default='docs/guardian/shared-image-audit.json');a=p.parse_args()
root=Path(a.root);images=collections.defaultdict(list)
for path in sorted(root.rglob('*.glb')):
 blob=path.read_bytes();assert blob[:4]==b'glTF';length=struct.unpack_from('<I',blob,12)[0];doc=json.loads(blob[20:20+length]);start=28+length
 for index,image in enumerate(doc.get('images',[])):
  if 'bufferView' not in image:continue
  view=doc['bufferViews'][image['bufferView']];assert view.get('buffer',0)==0
  data=blob[start+view.get('byteOffset',0):start+view.get('byteOffset',0)+view['byteLength']];assert len(data)==view['byteLength']
  images[hashlib.sha256(data).hexdigest()].append({'file':path.relative_to(root).as_posix(),'image':index,'bytes':len(data),'mime':image.get('mimeType')})
groups=[{'sha256':h,'copies':v,'potentialBytes':v[0]['bytes']*(len(v)-1)} for h,v in images.items() if len(v)>1]
groups.sort(key=lambda g:g['potentialBytes'],reverse=True)
report={'scope':'Built GLBs only. Exact encoded-image duplicates; theoretical saving before container/URI overhead. No runtime or asset mutation; externalizing images would add requests/files and needs loader/package validation.','groups':groups,'potentialBytes':sum(g['potentialBytes'] for g in groups),'additionalFilesIfExternalized':len(groups)}
Path(a.out).write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k!='groups'}))

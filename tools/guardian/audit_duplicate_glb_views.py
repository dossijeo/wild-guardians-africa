"""Read-only exact encoded payload duplication audit; no asset modifications."""
import hashlib
import json
import struct
from pathlib import Path

rows=[]
for path in Path('dist').rglob('*.glb'):
    blob=path.read_bytes()
    size=struct.unpack_from('<I',blob,12)[0]
    doc=json.loads(blob[20:20+size])
    binary=blob[28+size:]
    seen=set()
    saved=duplicates=0
    for view in doc.get('bufferViews',[]):
        region=view.get('extensions',{}).get('EXT_meshopt_compression') or view
        if region.get('buffer',0)!=0:
            continue
        start=region.get('byteOffset',0)
        length=region['byteLength']
        payload=binary[start:start+length]
        if len(payload)!=length:
            raise ValueError(f'Truncated payload: {path}')
        digest=hashlib.sha256(payload).digest()
        if digest in seen:
            saved+=length
            duplicates+=1
        seen.add(digest)
    if saved:
        rows.append({'file':path.as_posix(),'duplicatePayloadBytes':saved,'duplicateViews':duplicates})
rows.sort(key=lambda row:row['duplicatePayloadBytes'],reverse=True)
report={'scope':'Read-only exact compressed/raw payload duplication; savings not yet implemented.','models':rows,'potentialPayloadBytes':sum(row['duplicatePayloadBytes'] for row in rows)}
Path('docs/guardian/glb-duplicate-view-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'models':len(rows),'potentialPayloadBytes':report['potentialPayloadBytes']}))

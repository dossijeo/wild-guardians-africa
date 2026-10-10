from pathlib import Path
import json,hashlib,gzip
here=Path(__file__).resolve().parent;root=here.parents[3]
r=json.loads((here/'receipt.json').read_text(encoding='utf-8'));sha=lambda b:hashlib.sha256(b).hexdigest()
for paths,parent in [('files',here),('sources',root)]:
 for f,row in r[paths].items():
  raw=(parent/f).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256'],f
  if 'originalSha256' in row:
   original=gzip.decompress(raw);assert len(original)==row['originalBytes'] and sha(original)==row['originalSha256'],f
manifest=root/'public/assets/crop-partition-v1-98e4f7db28fa5f0c2a6e/partition-manifest.json'
assert len(manifest.read_bytes())==r['payloadBytes'] and sha(manifest.read_bytes())==r['payloadSha256']
assert r['runtimeChanges'] is False and r['checks']['fail']==0
print('PASS original failure/source/log hashes and unchanged canonical partition manifest')

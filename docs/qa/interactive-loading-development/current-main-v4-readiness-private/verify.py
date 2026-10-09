from pathlib import Path
import hashlib,json
p=Path(__file__).parent;m=json.loads((p/'manifest.json').read_text())
for a in m['arms']:
 root=Path(a['root']);original=p/(a['arm']+'-source-inventory.json')
 assert hashlib.sha256(original.read_bytes()).hexdigest()==a['sourceInventorySha256']
 assert hashlib.sha256((root/'src/app/main.js').read_bytes()).hexdigest()==a['instrumentedMainSha256']
 for name,key in [('qa-common.js','observerSha256'),('qa-identical-save.json','snapshotSha256')]:assert hashlib.sha256((root/name).read_bytes()).hexdigest()==a[key]
 inventory=json.loads(original.read_text())['files']
 for name,digest in inventory.items():
  if name=='src/app/main.js':continue
  assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest,name
assert m['arms'][0]['observerSha256']==m['arms'][1]['observerSha256']
assert m['arms'][0]['snapshotSha256']==m['arms'][1]['snapshotSha256']
print('PASS immutable source/public inventories, disclosed private hooks and shared observer/snapshot')

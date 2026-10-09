import hashlib,json,pathlib,subprocess
here=pathlib.Path(__file__).resolve().parent
root=here.parents[3]
receipt=json.loads((here/'receipt.json').read_text(encoding='utf-8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
for group in ['sources','unchanged']:
 for name,digest in receipt[group].items():assert sha((root/name).read_bytes())==digest,name
for name,digest in receipt['unchanged'].items():assert sha(subprocess.check_output(['git','show',receipt['baseline']+':'+name],cwd=root))==digest,name
for name,digest in receipt['originalBuffers'].items():assert sha((root/('public'+name)).read_bytes())==digest,name
for name,digest in receipt['logs'].items():assert sha((here/name).read_bytes())==digest,name
for check in receipt['checks']:assert check['exitCode']==0
assert receipt['native'] is False and receipt['defaultEnabled'] is False
manifest=json.loads((root/'content/manifests/wall-buffer-package.json').read_text())
buffer=(root/('public'+manifest['url'])).read_bytes()
assert len(manifest['entries'])==160 and len(buffer)==5135464
for entry in manifest['entries']:
 assert entry['offset']%4==0
 assert sha(buffer[entry['offset']:entry['offset']+entry['length']])==entry['sha256']
print('PASS: frozen sources, all160 exact payloads, retained originals/core/gates and CPU-only receipts')

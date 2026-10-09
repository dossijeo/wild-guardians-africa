from pathlib import Path
import json,hashlib
p=Path(__file__).parent
r=json.loads((p/'receipt.json').read_text())
for f in r['files']:
 b=(p/f['file']).read_bytes()
 assert len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256'], f['file']
print('PASS: immutable check logs; partial suite remains interrupted, CI unclaimed')

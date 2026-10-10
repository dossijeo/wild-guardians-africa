from pathlib import Path
import json,hashlib,gzip,subprocess
root=Path(__file__).resolve().parents[4];d=Path(__file__).resolve().parent;r=json.loads((d/'receipt.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
for row in r['source']+r['unchanged']:assert sha((root/row['path']).read_bytes())==row['sha256'],row['path']
for row in r['unchanged']:assert (root/row['path']).read_bytes()==subprocess.check_output(['git','show',r['base']+':'+row['path']],cwd=root),row['path']
for row in r['logs']:
 packed=(d/row['path']).read_bytes();raw=gzip.decompress(packed);assert sha(packed)==row['gzipSha256'] and sha(raw)==row['originalSha256'] and len(raw)==row['originalBytes']
assert r['tests']['pass']==72 and r['tests']['fail']==0
print('PASS: frozen wiring, unchanged recipe, original logs; no dispatch/native claim')

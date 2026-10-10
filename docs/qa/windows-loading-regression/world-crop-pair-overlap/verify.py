from pathlib import Path
import json,hashlib,gzip,subprocess
root=Path(__file__).resolve().parents[4];d=Path(__file__).resolve().parent;r=json.loads((d/'receipt.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
for row in r['source']+r['unchanged']:assert sha((root/row['path']).read_bytes())==row['sha256'],row['path']
for row in r['unchanged']:assert (root/row['path']).read_bytes()==subprocess.check_output(['git','show',r['base']+':'+row['path']],cwd=root),row['path']
for row in r['logs']:
 raw=(d/row['path']).read_bytes();assert sha(raw)==row['gzipSha256'];plain=gzip.decompress(raw);assert sha(plain)==row['sha256'] and len(plain)==row['bytes']
assert r['tests']['passed']==42 and r['tests']['failed']==0
print('PASS: sources, unchanged recipes, original logs; no native timing claim')

import json,hashlib,gzip,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[4];d=Path(__file__).resolve().parent;r=json.loads((d/'receipt.json').read_text(encoding='utf8'));sha=lambda b:hashlib.sha256(b).hexdigest()
for row in r['source']+r['unchangedRecipe']:assert sha((root/row['path']).read_bytes())==row['sha256'],row['path']
for row in r['unchangedRecipe']:assert (root/row['path']).read_bytes()==subprocess.check_output(['git','show',r['base']+':'+row['path']],cwd=root),row['path']
for row in r['logs']:
 packed=(d/row['path']).read_bytes();raw=gzip.decompress(packed);assert sha(packed)==row['gzipSha256'] and sha(raw)==row['originalSha256'] and len(raw)==row['originalBytes'],row['path']
assert r['tests']['passed']==36 and r['tests']['failed']==0
print('PASS: source, unchanged recipe and original logs; no native claim')

from pathlib import Path
import json,gzip,hashlib,subprocess
root=Path(__file__).resolve().parents[4];d=Path(__file__).resolve().parent;r=json.loads((d/'receipt.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
for row in r['source']:assert sha((root/row['path']).read_bytes())==row['sha256'],row['path']
for row in r['logs']:
 packed=(d/row['path']).read_bytes();raw=gzip.decompress(packed);assert sha(packed)==row['gzipSha256'] and sha(raw)==row['sha256'] and len(raw)==row['bytes']
assert subprocess.run(['git','diff','--exit-code',r['runtimeBaseline'],'--','src','src-tauri','.github','public','content','tools','package.json','package-lock.json'],cwd=root,stdout=subprocess.PIPE).returncode==0
proof=json.loads((d/'shallow-receipt.json').read_text());assert proof['shallow'] and proof['commitCount']==1 and proof['historicalRefAbsent'] and proof['testExitCode']==0
print('PASS: exact fixtures/logs, real shallow proof and unchanged28b runtime')

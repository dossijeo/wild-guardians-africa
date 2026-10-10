import pathlib,json,hashlib,gzip,subprocess
root=pathlib.Path(__file__).resolve().parents[4];r=json.loads((pathlib.Path(__file__).parent/'receipt.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
for x in r['changed']:assert sha((root/x['path']).read_bytes())==x['sha256'],x['path']
for x in r['logs']:
 raw=(root/x['path']).read_bytes();assert sha(raw)==x['sha256'];decoded=gzip.decompress(raw);assert sha(decoded)==x['rawSha256'] and len(decoded)==x['rawBytes']
for x in r['protected']:
 assert subprocess.check_output(['git','rev-parse',r['sourceCommit']+':'+x['path']],cwd=root,text=True).strip()==x['gitObject'],x['path']
print('PASS: frozen changes, unchanged base objects and original log hashes; no native/CI acceptance claim')

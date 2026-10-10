from pathlib import Path
import json,hashlib,subprocess
folder=Path(__file__).resolve().parent;root=folder.parents[3]
r=json.loads((folder/'receipt.json').read_text(encoding='utf-8'))
for group in ['sourceHashes','unchangedHashes','logHashes']:
 for file,expected in r[group].items(): assert hashlib.sha256((root/file).read_bytes()).hexdigest()==expected,file
for file in r['unchangedHashes']: assert subprocess.check_output(['git','show',r['base']+':'+file],cwd=root)==(root/file).read_bytes(),file
assert r['tests']['pass']==39 and r['tests']['fail']==0
print('PASS hosting/component fix source/logs and original selection/assets/gates invariants; CPU only')

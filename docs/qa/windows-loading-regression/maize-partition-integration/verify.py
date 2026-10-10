from pathlib import Path
import json,hashlib,subprocess
folder=Path(__file__).resolve().parent
root=folder.parents[3]
r=json.loads((folder/'receipt.json').read_text(encoding='utf-8'))
for group in ['sourceHashes','unchangedHashes','logHashes']:
 for file,expected in r[group].items(): assert hashlib.sha256((root/file).read_bytes()).hexdigest()==expected,file
for file in r['unchangedHashes']: assert subprocess.check_output(['git','show',r['base']+':'+file],cwd=root)==(root/file).read_bytes(),file
current=json.loads((root/'docs/qa/sfx-catalog-post-jam/inventory.json').read_text(encoding='utf-8'))
old=json.loads(subprocess.check_output(['git','show',r['base']+':docs/qa/sfx-catalog-post-jam/inventory.json'],cwd=root))
for value in [current,old]: value['sourceHashes'].pop('src/rendering/scene.js')
assert current==old
assert r['tests']['fail']==0 and r['tests']['pass']==37
print('PASS source, original path/gates/assets, logs and126-row SFX invariants; CPU evidence only')

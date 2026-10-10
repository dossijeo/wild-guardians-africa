from pathlib import Path
import json,hashlib,subprocess
folder=Path(__file__).resolve().parent;root=folder.parents[3]
r=json.loads((folder/'receipt.json').read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for group in ['sourceHashes','unchangedHashes','logHashes']:
 for file,expected in r[group].items():assert sha(root/file)==expected,file
for file in r['unchangedHashes']:assert subprocess.check_output(['git','show',r['base']+':'+file],cwd=root)==(root/file).read_bytes(),file
for file,row in r['publication'].items():
 p=root/file;assert sha(p)==row['sha256'] and p.stat().st_size==row['bytes'],file
assert len(r['publication'])==11 and sum(x['bytes'] for x in r['publication'].values())==40848807
manifest=next(root/f for f in r['publication'] if f.endswith('partition-manifest.json'))
m=json.loads(manifest.read_text(encoding='utf-8'))
for row in m['partitions']+m['textures']:
 p=manifest.parent/row.get('file',row.get('uri'));assert p.stat().st_size==row['bytes'] and sha(p)==row['sha256']
a=json.loads(subprocess.check_output(['git','show',r['base']+':docs/qa/sfx-catalog-post-jam/inventory.json'],cwd=root))
b=json.loads((root/'docs/qa/sfx-catalog-post-jam/inventory.json').read_text(encoding='utf-8'))
def normalize(value):
 if isinstance(value,dict):
  if value.get('file')=='src/app/main.js' and 'line' in value:value['line']-=1
  for x in value.values():normalize(x)
 elif isinstance(value,list):
  for x in value:normalize(x)
normalize(b)
for x in [a,b]:x['sourceHashes'].pop('src/app/main.js')
assert a==b,'SFX semantic delta beyond main hash/+1 lines'
assert r['tests']['pass']==54 and r['tests']['fail']==0
assert r['gates']=={'worldReadyMs':90000,'nativeHiddenMs':300000,'hostVisibilityMs':900000,'states':40,'bridges':32,'oldHypotheses':False,'cropPartitionDefault':False}
assert r['dispatch'] is None and not r['nativeEvidence']
print('PASS frozen sources/logs, original core/assets, 11 immutable assets/manifest, SFX126 semantic equality; CPU-only/default OFF')

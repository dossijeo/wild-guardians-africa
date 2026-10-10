import gzip,hashlib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[4]
r=json.loads((Path(__file__).parent/'receipt.json').read_text(encoding='utf8'))
for item in r['sources']+r['logs']:
 b=(root/item['path']).read_bytes()
 assert len(b)==item['bytes'] and hashlib.sha256(b).hexdigest()==item['sha256'],item['path']
 if 'originalSha256' in item:
  raw=gzip.decompress(b);assert len(raw)==item['originalBytes'] and hashlib.sha256(raw).hexdigest()==item['originalSha256']
assert len(r['payloads'])==11 and sum(x['bytes'] for x in r['payloads'])==40848807
assert r['package']['deltaBytes']==16744
assert sum(x['delta'] for x in r['package']['paths'])==16744
assert subprocess.check_output(['git','diff',r['base'],'--',*r['protectedByteExactAgainstBase']],cwd=root)==b''
print('PASS minimal source/payload/log hashes, package delta and protected main sources')

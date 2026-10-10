from pathlib import Path
import hashlib,json,gzip,subprocess
root=Path(__file__).resolve().parents[4]
r=json.loads((Path(__file__).parent/'receipt.json').read_text(encoding='utf8'))
for row in r['sources']+r['logs']:
 b=(root/row['path']).read_bytes();assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256'],row['path']
 if 'originalSha256' in row:
  raw=gzip.decompress(b);assert len(raw)==row['originalBytes'] and hashlib.sha256(raw).hexdigest()==row['originalSha256']
assert subprocess.check_output(['git','diff',r['base'],'--',*r['protectedByteExact']],cwd=root)==b''
print('PASS QA source/log hashes and unchanged production asset/load paths')

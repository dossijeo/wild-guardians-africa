from pathlib import Path
import json,hashlib,gzip
root=Path(__file__).resolve().parents[4];folder=Path(__file__).resolve().parent
r=json.loads((folder/'receipt.json').read_text(encoding='utf8'));sha=lambda b:hashlib.sha256(b).hexdigest()
for row in r['sources']+r['unchanged']:
 b=(root/row['path']).read_bytes();assert sha(b)==row['sha256'],row['path']
 if 'bytes' in row:assert len(b)==row['bytes']
b=(folder/r['log']['path']).read_bytes();assert sha(b)==r['log']['gzipSha256'];b=gzip.decompress(b);assert len(b)==r['log']['rawBytes'] and sha(b)==r['log']['rawSha256']
m=json.loads((folder/'matrix-plan.json').read_text(encoding='utf8'));assert len(m['cases'])==30 and len({c['id'] for c in m['cases']})==30
print('PASS source/unchanged/log hashes and thirty-case plan; no native evidence')

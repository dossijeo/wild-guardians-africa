from pathlib import Path
import gzip,hashlib,json
root=Path(__file__).resolve().parents[4];folder=Path(__file__).resolve().parent
r=json.loads((folder/'receipt.json').read_text(encoding='utf8'));sha=lambda b:hashlib.sha256(b).hexdigest()
for row in r['runtimeSourceHashes']:
 b=(root/row['path']).read_bytes();assert len(b)==row['bytes'] and sha(b)==row['sha256'],row['path']
for row in r['logs']:
 b=(folder/row['path']).read_bytes();assert sha(b)==row['gzipSha256'];b=gzip.decompress(b);assert len(b)==row['rawBytes'] and sha(b)==row['rawSha256']
print('PASS frozen c9b source hashes and original build/package logs')

from pathlib import Path
import gzip,hashlib,json
root=Path(__file__).resolve().parents[4]
folder=Path(__file__).resolve().parent
r=json.loads((folder/'receipt.json').read_text(encoding='utf8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
for row in r['sources']+r['unchanged']:
 b=(root/row['path']).read_bytes()
 assert sha(b)==row['sha256'],row['path']
 if 'bytes' in row: assert len(b)==row['bytes']
b=(folder/'cpu-tests.log.gz').read_bytes();assert sha(b)==r['cpu']['gzipSha256']
b=gzip.decompress(b);assert sha(b)==r['cpu']['rawSha256'] and len(b)==r['cpu']['rawBytes']
for row in r.get('logs',[]):
 b=(folder/row['path']).read_bytes();assert sha(b)==row['gzipSha256']
 b=gzip.decompress(b);assert sha(b)==row['rawSha256'] and len(b)==row['rawBytes']
print('PASS source hashes, unchanged pipeline hashes and original logs')

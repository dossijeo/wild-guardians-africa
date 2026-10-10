import pathlib,json,hashlib,gzip
root=pathlib.Path(__file__).resolve().parents[4]
r=json.loads((pathlib.Path(__file__).parent/'receipt.json').read_text())
h=lambda b:hashlib.sha256(b).hexdigest()
for row in r['source']:
 assert h((root/row['path']).read_bytes())==row['sha256'],row['path']
for row in r['protected']:
 assert h((root/row['path']).read_bytes().replace(b'\r\n',b'\n'))==row['sha256Lf'],row['path']
for row in r['logs']:
 b=(root/row['path']).read_bytes(); assert h(b)==row['sha256'];raw=gzip.decompress(b);assert h(raw)==row['rawSha256'] and len(raw)==row['rawBytes']
print('PASS: source/protected/log hashes; evidence CPU-only, no native or performance claim')

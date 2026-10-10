from pathlib import Path
import hashlib,json,gzip
f=Path(__file__).resolve().parent;r=json.loads((f/'receipt.json').read_text(encoding='utf-8'))
for n,x in r['files'].items():
 b=(f/n).read_bytes();assert len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256'],n
b=gzip.decompress((f/'full-original.log.gz').read_bytes());assert len(b)==r['originalLogBytes'] and hashlib.sha256(b).hexdigest()==r['originalLogSha256']
run=json.loads((f/'run-original.json').read_text(encoding='utf-8-sig'));assert run['head_sha']==r['source'] and run['conclusion']=='success'
for name in ['desktop-smoke.json','desktop-visibility.json']:
 s=json.loads((f/name).read_text(encoding='utf-8-sig'));assert s['ok'] is True and not s['errors'],name
print('PASS original official payload/log hashes, pinned run source and both raw native gates; visual/causal limits retained')

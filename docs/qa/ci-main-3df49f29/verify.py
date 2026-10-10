from pathlib import Path
import json,hashlib,gzip,re
p=Path(__file__).resolve().parent
web=p/'web';native=p/'windows'
wr=json.loads((web/'run-original.json').read_bytes())
nr=json.loads((native/'run-original.json').read_bytes())
assert wr['id']==38016098976 and wr['head_sha']=='3df49f29a6c902c74b58a2081ce9fc17a75f5c2e' and wr['conclusion']=='success'
assert nr['id']==38015626895 and nr['head_sha']=='9f0f65edb54612e7565b6ef3862faa556bb3c6ae' and nr['conclusion']=='failure'
wlog=gzip.decompress((web/'full-original.log.gz').read_bytes())
wreview=json.loads((web/'review.json').read_bytes())
assert len(wlog)==wreview['originalLogBytes'] and hashlib.sha256(wlog).hexdigest()==wreview['originalLogSha256']
assert re.search(rb'# tests 3792\r?\n',wlog) and re.search(rb'# pass 3792\r?\n',wlog) and re.search(rb'# fail 0\r?\n',wlog)
assert b'711 files / 445254165 bytes' in wlog and b'388367056 bytes; verified CRCs' in wlog
wa=json.loads((web/'artifacts-original.json').read_bytes())['artifacts']
itch=next(a for a in wa if a['name']=='wild-guardians-itch.zip')
assert itch['size_in_bytes']==388367056 and itch['digest']=='sha256:f26f55d1ff057e906e0a19ae7192ef85a40ff0e6bdf1d38e69fc65e21f925ceb'
receipt=json.loads((native/'receipt.json').read_bytes())
for name,expected in receipt['files'].items():
    raw=(native/name).read_bytes()
    assert len(raw)==expected['bytes'] and hashlib.sha256(raw).hexdigest()==expected['sha256'],name
nlog=gzip.decompress((native/'full-original.log.gz').read_bytes())
assert len(nlog)==receipt['originalLogBytes'] and hashlib.sha256(nlog).hexdigest()==receipt['originalLogSha256']
na=json.loads((native/'artifacts-original.json').read_bytes())['artifacts']
report=next(a for a in na if a['name']=='desktop-smoke.json')
raw=(native/'desktop-smoke.json').read_bytes()
assert len(raw)==report['size_in_bytes'] and 'sha256:'+hashlib.sha256(raw).hexdigest()==report['digest']
smoke=json.loads(raw);finish=smoke['checks']['loadingAtFinish']
assert smoke['ok'] is False and finish['readyGateReached'] is False and finish['worldWaitMs']>=90000
assert len(smoke['checks']['models'])==22
steps=json.loads((native/'job-original.json').read_bytes())['steps']
for name in ['Run npm run desktop:build','Check Windows executable and installer']:
    assert next(s for s in steps if s['name']==name)['conclusion']=='success'
assert next(s for s in steps if s['name']=='Check genuine native minimization and restoration')['conclusion']=='skipped'
print('PASS: web3792/3792, unchanged verified itch digest; original native failure and successful build retained')

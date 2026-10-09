from pathlib import Path
import hashlib,json
root=Path(__file__).parent
receipt=json.loads((root/'receipt.json').read_text())
for name,row in receipt['files'].items():
 data=(root/name).read_bytes()
 assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256'],name
report=json.loads((root/'desktop-smoke.json').read_bytes())
assert report['ok'] is False
assert report['errors']==['Error: Production world did not finish loading']
assert report['checks']['loadingAtFinish']['readyGateReached'] is False
run=json.loads((root/'run.json').read_bytes())
assert run['headSha']==receipt['source'] and run['conclusion']=='failure' and run['status']=='completed'
print('PASS: original bytes, terminal source and negative gate')

import hashlib,json,subprocess
from pathlib import Path
base=Path(__file__).resolve().parent
receipt=json.loads((base/'receipt.json').read_text(encoding='utf-8'))
raw=(base/'desktop-smoke-original.json').read_bytes()
assert len(raw)==receipt['rawBytes']
assert hashlib.sha256(raw).hexdigest()==receipt['rawSha256']
report=json.loads(raw)
assert report['ok'] is False
assert report['errors']==['Error: Production world did not finish loading']
finish=report['checks']['loadingAtFinish']
assert finish['readyGateReached'] is False and finish['displayedProgress']=='88'
assert finish['focused'] is True and finish['visibility']=='visible'
assert finish['canvas']=={'width':1028,'height':720}
for name,expected in receipt['sourceInventory'].items():
 data=subprocess.check_output(['git','show',receipt['source']+':'+name])
 assert hashlib.sha256(data).hexdigest()==expected,name
print('PASS: original failure bytes, finish predicates and source inventory; no causal attribution')

from pathlib import Path
import json,hashlib
base=Path(__file__).resolve().parent
receipt=json.loads((base/'summary.json').read_text(encoding='utf-8'))
raw=(base/'desktop-smoke.json').read_bytes()
assert len(raw)==receipt['raw']['bytes']
assert hashlib.sha256(raw).hexdigest()==receipt['raw']['sha256']
report=json.loads(raw.decode('utf-8-sig'))
assert report['ok'] is False and report['errors']==['Error: Production world did not finish loading']
state=report['checks']['loadingReadinessAtFinish']['readiness']
assert state['issues']==[] and state['spans']['dropped']==0
assert state['transfers']['count']==242 and state['transfers']['pending']==0 and state['transfers']['failed']==0
assert state['chunks']['queued']==0 and state['chunks']['busy'] is False and state['chunks']['failed']==0
assert [x['label'] for x in state['spans']['active']]==['app-world-load','load-warm-gpu','warm-compile-world']
assert state['far'] is None and state['presentation']['cinematicPresent'] is False
run=json.loads((base/'run.json').read_text(encoding='utf-8-sig'))
assert run['headSha']==receipt['source'] and run['conclusion']=='failure'
steps={s['name']:s['conclusion'] for j in run['jobs'] for s in j['steps']}
assert steps['Smoke test the packaged game in WebView2']=='failure'
assert steps['Check genuine native minimization and restoration']=='skipped'
print('PASS exact original raw, source, terminal gates and bounded observations; no causal attribution')

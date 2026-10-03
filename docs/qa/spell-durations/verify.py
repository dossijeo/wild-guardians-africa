import json
from pathlib import Path
p=Path(__file__).resolve().parent
cases={'cast-0':0,'sunset-5':5,'active-10':10,'paused-10':10,'restored-10':10,'multiply-expired-15':15,'shield-expired-20':20,'growth-active-25':25,'growth-expired-30':30}
durations={'shield':20,'growth':30,'multiply':15};cooldowns={'shield':90,'growth':90,'multiply':120}
rows={n:json.loads((p/(n+'.json')).read_text(encoding='utf-8')) for n in cases}
for name,elapsed in cases.items():
    r=rows[name];assert abs(r['elapsed']-elapsed)<1e-7 and r['renderDomainIdentical'] and not r['errors']
    alive={k for k,d in durations.items() if elapsed<d};assert {s['kind'] for s in r['spells']}==alive
    assert len(r['effects'])==len(alive)
    for k,c in cooldowns.items():assert abs(r['cooldowns'][k]-(c-elapsed))<1e-7
    for effect in r['effects']:assert abs(effect['age']-elapsed)<1e-7 and effect['visible']
assert rows['paused-10']['pauseIdentical'] and rows['restored-10']['reloadIdentical']
for r in rows.values():
    if r['elapsed']>=5:assert [x['growth'] for x in r['plants']]==[x['growth'] for x in rows['sunset-5']['plants']]
for a,b in zip(rows['active-10']['effects'],rows['restored-10']['effects']):
    assert a['key']==b['key'] and a['sprites']==b['sprites'] and a['rigids']==b['rigids'] and abs(a['age']-b['age'])<1e-7
logs=json.loads((p/'console.json').read_text(encoding='utf-8'));assert not any(x['level']=='error' for x in logs)
print('PASS: nine duration/pause/reload states, exact spell/cooldown boundaries, no night growth or render mutation, zero console errors')

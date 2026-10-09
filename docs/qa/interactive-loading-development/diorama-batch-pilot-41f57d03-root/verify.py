from pathlib import Path
import json,hashlib
p=Path(__file__).parent
manifest=json.loads((p/'manifest.json').read_text())
for f in manifest['files']:
 b=(p/f['file']).read_bytes();assert len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256'],f['file']
reports=[json.loads((p/f['file']).read_text(encoding='utf-8-sig')) for f in manifest['files'] if f['file'].endswith('report.json')]
for r in reports:
 assert r['closed'] is True and r['cancelled'] is False
 assert r['current']['ready'] is True and r['current'].get('error') is None
 poses={x['phase']:x for x in r['cameraPoses']}
 for key in ['eye','quaternion','target']:assert poses['before-cinematic'][key]==poses['cinematic-completed'][key]
print('PASS immutable reports, verified readiness and exact camera restore; no physical memory or statistical equivalence claim')

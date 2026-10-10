from pathlib import Path
import json,gzip,hashlib
folder=Path(__file__).resolve().parent;r=json.loads((folder/'receipt.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
for f in r['files']:
 stored=(folder/f['path']).read_bytes();assert len(stored)==f['storedBytes'] and sha(stored)==f['storedSha256'];raw=gzip.decompress(stored) if f['gzip'] else stored;assert len(raw)==f['bytes'] and sha(raw)==f['sha256']
run=json.loads((folder/'run.json').read_text());jobs=json.loads((folder/'jobs.json').read_text());assert run['id']==r['runId'] and run['head_sha']==r['headSha'] and run['conclusion']=='success';assert next(j for j in jobs['jobs'] if j['id']==r['jobId'])['conclusion']=='success'
assert r['tests']=={'total':3883,'passed':3882,'failed':0,'skipped':1,'skipScope':'Only real PowerShell subprocess argv test on Linux; all source invariants active.'}
print('PASS: exact original API/logs and corrected full Validate source/results')

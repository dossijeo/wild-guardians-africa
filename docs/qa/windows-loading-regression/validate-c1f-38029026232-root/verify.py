from pathlib import Path
import json,gzip,hashlib,re
p=Path(__file__).resolve().parent;m=json.loads((p/'archive.json').read_text());raw={}
for f in m['files']:
 b=(p/f['name']).read_bytes();assert hashlib.sha256(b).hexdigest()==f['gzipSha256'];d=gzip.decompress(b);assert len(d)==f['rawBytes'] and hashlib.sha256(d).hexdigest()==f['rawSha256'];raw[f['name'][:-3]]=d
r=json.loads(raw['run.json']);j=json.loads(raw['job.json']);assert r['head_sha']==m['source'] and r['id']==m['runId'] and r['conclusion']=='success';assert j['id']==m['jobId'] and j['conclusion']=='success';assert all(s['conclusion']=='success' for s in j['steps'])
log=raw['job.log'].decode('utf-8');assert re.search(r'# tests 3895\b',log) and re.search(r'# pass 3894\b',log) and re.search(r'# fail 0\b',log) and re.search(r'# skipped 1\b',log);assert 'Windows PowerShell execution evidence only' in log;assert '388385023 bytes; verified CRCs' in log
print('PASS frozen c1f full Validate originals; no native/production promotion claim')

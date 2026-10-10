from pathlib import Path
import gzip
import hashlib
import json
import re

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'archive.json').read_text())
raw = {}
for entry in manifest['files']:
    packed = (root / entry['name']).read_bytes()
    assert hashlib.sha256(packed).hexdigest() == entry['gzipSha256']
    content = gzip.decompress(packed)
    assert len(content) == entry['rawBytes']
    assert hashlib.sha256(content).hexdigest() == entry['rawSha256']
    raw[entry['name'][:-3]] = content
run = json.loads(raw['run.json'])
job = json.loads(raw['job.json'])
assert run['id'] == manifest['runId'] and job['id'] == manifest['jobId']
assert run['head_sha'] == job['head_sha'] == manifest['source']
assert run['status'] == job['status'] == 'completed'
assert run['conclusion'] == job['conclusion'] == 'success'
assert all(step['conclusion'] == 'success' for step in job['steps'])
log = raw['job.log'].decode('utf-8')
for name, value in [('tests', 3839), ('pass', 3839), ('fail', 0), ('skipped', 0)]:
    assert re.search(r'# ' + name + ' ' + str(value) + r'\b', log)
assert '388379707 bytes; verified CRCs' in log
assert '345325.693412' in log
print('PASS full Validate originals on frozen production025; native/visual readiness not inferred')

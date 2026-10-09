import gzip,hashlib,json
from pathlib import Path
d=Path(__file__).resolve().parent
m=json.loads((d/'repaired-preflight.json').read_text(encoding='utf8'))
for name,h in m['artifacts'].items():
    b=(d/name).read_bytes();assert hashlib.sha256(b).hexdigest()==h['gzipSha256'],name
    raw=gzip.decompress(b);assert len(raw)==h['rawBytes'] and hashlib.sha256(raw).hexdigest()==h['rawSha256'],name
for row in m['graph'].values():assert row['served']==240 and not row['errors'] and len(row['workerUrls'])==5
for key in ['functionalCandidate','functionalControl']:
    row=m[key];assert row['done'] and row['logicalUnchanged'] and not row['errors'] and row['disposed'] and row['contextLost']
    buffers=row['lastResourceStage']['buffers'];assert buffers['liveBuffers']==buffers['liveBytes']==buffers['unattributed']==0
    assert buffers['requestedBytes']==buffers['deletedBytes']
assert m['nativeTimingExecuted'] is False
print('PASS: preserved raw hashes, 240 dependencies per server, two functional closes; no timing acceptance')

from pathlib import Path
import gzip, hashlib, json

folder = Path(__file__).resolve().parent
root = folder.parents[3]
receipt = json.loads((folder / 'sources.json').read_text())
assert receipt['nativeExecuted'] is False
assert receipt['passGpuImplemented'] is False
assert receipt['performanceAccepted'] is False
for name, expected in receipt['sources'].items():
    data = (root / name).read_bytes()
    assert len(data) == expected['bytes'], name
    assert hashlib.sha256(data).hexdigest() == expected['sha256'], name
for name, expected in receipt['artifacts'].items():
    data = (folder / name).read_bytes()
    assert len(data) == expected['bytes'], name
    assert hashlib.sha256(data).hexdigest() == expected['sha256'], name
    decoded = gzip.decompress(data)
    assert hashlib.sha256(decoded).hexdigest() == expected['decodedSha256'], name
    assert b'# pass 62' in decoded and b'# fail 0' in decoded
print('PASS: first-phase source/CPU evidence; no native or performance acceptance')

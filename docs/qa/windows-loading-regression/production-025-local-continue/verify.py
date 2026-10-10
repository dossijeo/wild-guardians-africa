import gzip, hashlib, json, pathlib

base = pathlib.Path(__file__).resolve().parent
manifest = json.loads((base / 'manifest.json').read_text())
for row in manifest['rows']:
    packed = (base / row['file']).read_bytes()
    raw = gzip.decompress(packed)
    assert hashlib.sha256(packed).hexdigest() == row['sha256']
    assert hashlib.sha256(raw).hexdigest() == row['rawSha256']
    assert len(raw) == row['rawBytes']
report = json.loads(gzip.decompress((base / 'desktop-smoke.json.gz').read_bytes()))
receipt = json.loads(gzip.decompress((base / 'receipt.json.gz').read_bytes()).decode('utf-8-sig'))
assert receipt['exeSha256'] == manifest['exeSha256']
assert receipt['exitCode'] == 0 and report['ok'] and not report['errors']
assert hashlib.sha256(gzip.decompress((base / 'desktop-smoke.json.gz').read_bytes())).hexdigest() == receipt['reportSha256']
assert '--smoke-visual' not in receipt['arguments'] and '--smoke-loading-only' not in receipt['arguments']
assert report['checks']['loadingAtFinish']['readyGateReached']
assert report['checks']['loadingAtFinish']['worldWaitMs'] < 90000
visibility = report['checks']['visibility']
assert visibility['passed'] and visibility['hiddenMs'] >= 300000
assert len(visibility['hiddenStart']) == 21
assert visibility['hiddenStart'] == visibility['hiddenEnd']
print('PASS: original payload integrity, local readiness and genuine native hidden/restoration; no performance or visual acceptance claim')

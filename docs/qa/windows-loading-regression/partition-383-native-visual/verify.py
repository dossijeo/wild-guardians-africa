import base64, gzip, hashlib, json, pathlib

base = pathlib.Path(__file__).resolve().parent
manifest = json.loads((base / 'manifest.json').read_text())
for row in manifest['rows']:
    packed = (base / row['file']).read_bytes()
    raw = gzip.decompress(packed)
    assert hashlib.sha256(packed).hexdigest() == row['sha256']
    assert hashlib.sha256(raw).hexdigest() == row['rawSha256']
    assert len(raw) == row['rawBytes']
report = json.loads(gzip.decompress((base / 'desktop-smoke.json.gz').read_bytes()))
launch = json.loads(gzip.decompress((base / 'receipt.json.gz').read_bytes()).decode('utf-8-sig'))
assert launch['complete'] and launch['exitCode'] == 0
assert launch['source'] == manifest['source'] and launch['executableSha256'] == manifest['exeSha256']
assert report['ok'] and not report['errors']
visual = report['checks']['loadingVisual']
assert len(visual['frames']) == 6 and not visual['errors']
action = visual['plantAction']
assert action['beforeCount'] == 4 and action['afterCount'] == 5
assert action['startProgress'] == .65 and action['progress'] >= .65
assert action['logicalPlantsUnchanged'] and not action['cancelled']
for frame in visual['frames']:
    raw = base64.b64decode(frame['png'].split(',', 1)[1], validate=True)
    assert raw == (base / 'frames' / (frame['label'] + '.png')).read_bytes()
assert all(p['growth'] == 270 for p in visual['frames'][-1]['plants'])
visibility = report['checks']['visibility']
assert visibility['passed'] and visibility['hiddenMs'] >= 300000
assert visibility['hiddenStart'] == visibility['hiddenEnd']
print('PASS: original report and exact six PNGs, synthetic catch-up and native restoration; bounded visual evidence only')

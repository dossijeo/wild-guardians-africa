import gzip, hashlib, json, pathlib

base = pathlib.Path(__file__).resolve().parent
manifest = json.loads((base / 'manifest.json').read_text())
for row in manifest['rows']:
    packed = (base / row['file']).read_bytes()
    raw = gzip.decompress(packed)
    assert hashlib.sha256(packed).hexdigest() == row['sha256']
    assert hashlib.sha256(raw).hexdigest() == row['rawSha256']
    assert len(raw) == row['rawBytes']
read = lambda name: json.loads(gzip.decompress((base / (name + '.gz')).read_bytes()).decode('utf-8-sig'))
run = read('run.json')
assert run['id'] == manifest['run'] and run['head_sha'] == manifest['source']
assert run['status'] == 'completed' and run['conclusion'] == 'success'
for name in ('desktop-smoke.json', 'desktop-visibility.json'):
    report = read(name)
    assert report['ok'] and not report['errors']
    assert report['checks']['loadingBudget']['worldTimeoutMs'] == 300000
    assert report['checks']['loadingBudget']['policy'] == 'ci-functional'
    assert 90000 < report['checks']['loadingAtFinish']['worldWaitMs'] < 300000
visibility = read('desktop-visibility.json')['checks']['visibility']
assert visibility['passed'] and visibility['hiddenMs'] >= 300000
assert len(visibility['hiddenStart']) == 21
assert visibility['hiddenStart'] == visibility['hiddenEnd']
print('PASS: official terminal success, original report bytes, explicit CI budget and native restoration; no optimization claim')

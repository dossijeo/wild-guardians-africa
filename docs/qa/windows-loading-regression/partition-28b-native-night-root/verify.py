from pathlib import Path
import base64, gzip, hashlib, json
folder=Path(__file__).resolve().parent
root=folder.parents[3]
manifest=json.loads((folder/'archive.json').read_text())
for row in manifest['files']:
    packed=(folder/row['file']).read_bytes()
    assert hashlib.sha256(packed).hexdigest()==row['gzipSha256']
    raw=gzip.decompress(packed)
    assert len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256']
report=json.loads(gzip.decompress((folder/'desktop-smoke.json.gz').read_bytes()))
receipt=json.loads(gzip.decompress((folder/'receipt.json.gz').read_bytes()).decode('utf-8-sig'))
assert report['ok'] and not report['errors'] and receipt['exitCode']==0
assert receipt['exeSha256']==manifest['exeSha256'] and receipt['fixtureSha256']==manifest['fixtureSha256']
assert report['checks']['fixtureMenuList']['listed']
assert report['checks']['loadingRecipe']['cropPairOverlap'] is False
visual=report['checks']['loadingVisual'];frames=json.loads((folder/'frames.json').read_text())
assert [f['label'] for f in frames]==['initial','additional-plant','middle','late','mature']
for frame,original in zip(frames,visual['frames']):
    assert frame['night']==1 and frame['progress']==original['progress']
    raw=base64.b64decode(original['png'].split(',',1)[1],validate=True)
    assert raw==(root/frame['evidencePath']).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==frame['pngSha256']
assert len(frames[0]['plants'])==4 and len(frames[-1]['plants'])==5
assert all(p['growth']==270 for p in frames[-1]['plants'])
assert visual['plantAction']['logicalPlantsUnchanged'] and visual['plantAction']['progress']==0
visibility=report['checks']['visibility']
assert visibility['passed'] and visibility['hiddenMs']>=300000
assert visibility['hiddenStart']==visibility['hiddenEnd']
print('PASS: original native night report, exact five PNGs, synthetic planting and hidden-state gates')

from pathlib import Path
import base64,gzip,hashlib,json
p=Path(__file__).resolve().parent;root=p.parents[3];m=json.loads((p/'archive.json').read_text())
for f in m['files']:
 b=(p/f['file']).read_bytes();assert hashlib.sha256(b).hexdigest()==f['gzipSha256'];raw=gzip.decompress(b);assert len(raw)==f['bytes'] and hashlib.sha256(raw).hexdigest()==f['sha256']
r=json.loads(gzip.decompress((p/'desktop-smoke.json.gz').read_bytes()));launch=json.loads(gzip.decompress((p/'receipt.json.gz').read_bytes()).decode('utf-8-sig'));assert launch['exitCode']==0 and launch['source']==m['source'] and launch['exeSha256']==m['exeSha256'] and launch['fixtureSha256']==m['fixtureSha256'];assert r['ok'] and not r['errors'];c=r['checks'];assert c['fixtureMenuList']['listed'] and c['loadingRecipe']['cropPairOverlap'] is False
v=c['loadingVisual'];frames=json.loads((p/'frames.json').read_text());assert not v['errors'] and not v['cancelled'];assert [f['label'] for f in frames]==['initial','preplant','additional-plant','catchup-mid','late','mature']
for f,o in zip(frames,v['frames']):
 assert f['night']==1 and f['label']==o['label'] and f['progress']==o['progress'] and f['plants']==o['plants'];png=base64.b64decode(o['png'].split(',',1)[1],validate=True);assert png==(root/f['evidencePath']).read_bytes() and hashlib.sha256(png).hexdigest()==f['sha256']
before,mid,end=frames[1],frames[3],frames[-1];assert .65<=before['progress']<1 and len(before['plants'])==4;assert .25<=mid['fifthAge']<1 and 0<mid['plants'][4]['growth']<mid['plants'][0]['growth'];assert len(end['plants'])==5 and all(x['growth']==270 for x in end['plants']);a=v['plantAction'];assert a['startProgress']==.65 and .65<=a['progress']<1 and a['logicalPlantsUnchanged'] and a['beforeCount']==4 and a['afterCount']==5 and a['candidates']==1
visibility=c['visibility'];assert visibility['passed'] and visibility['hiddenMs']>=300000 and visibility['hiddenStart']==visibility['hiddenEnd'];assert len(visibility['hiddenStart'])==21
print('PASS original six native night frames, advanced synthetic catch-up and real hidden identity')

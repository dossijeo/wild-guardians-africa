import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parent
receipt=json.loads((root/'receipt.json').read_text())
assert receipt['run']['headSha']=='527bbb3315158c8523190c4d779a2f73f95135be'
assert receipt['run']['conclusion']=='failure'
for file in receipt['files']:
    payload=(root/file['path']).read_bytes()
    assert len(payload)==file['bytes']
    assert hashlib.sha256(payload).hexdigest()==file['sha256']
for name,prefetch,seed in [('desktop-animal-control.json',False,'712'),('desktop-smoke.json',True,'1791571308038')]:
    raw=json.loads((root/name).read_text(encoding='utf-8-sig'))
    assert raw['ok'] is False and raw['errors']==['Error: Production world did not finish loading']
    checks=raw['checks'];recipe=checks['loadingRecipe'];loading=checks['productionLoading'];spans=loading['spans']
    assert recipe['animalPrefetch'] is prefetch and recipe['sharedGroundClip'] and recipe['pauseLoadingMenu']
    assert not any(recipe[key] for key in ['collectiveReadiness','parallelReadiness','parallelDioramaAssets'])
    assert checks.get('worldReadyAt') is None and checks.get('groundClipBinding') is None and checks.get('visibility') is None
    assert spans['configIdentities'][0]['config']['seed']==seed
    assert loading['current']['hidden'] is False and loading['current']['focused'] is True and loading['current']['stageBusy']=='true'
    assert loading['rafDelivery']['callbacks']>0 and spans['programIdentityDropped']==0
    assert not any(item['cacheKeyTruncated'] for item in spans['programIdentities'])
fixture=json.loads((root/'desktop-visibility-fixture.json').read_text(encoding='utf-8-sig'))
assert fixture['slotId']=='qa-desktop-visibility-712'
assert str(json.loads(fixture['snapshot'])['seed'])=='712'
assert not (root/'desktop-visibility.json').exists()
print('PASS: original hashes, source, both failure outcomes, experimental flags, seeds, retained RAF and absent native gates')

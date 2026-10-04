"""Check extracted resources and SFX against the original catalog metadata."""
import hashlib,json,pathlib
repo=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((repo/'content/manifests/assets.json').read_text(encoding='utf-8'))
for r in manifest['resources']:
    data=(repo/'public'/r['url'].lstrip('/')).read_bytes()
    assert len(data)==r['bytes'],r['url']
    assert hashlib.sha256(data).hexdigest()==r['sha256'],r['url']
    assert len(data)<100_000_000,'Resource exceeds GitHub ordinary file limit'
bank=json.loads((repo/'references/extracted/Wild_Guardians_SFX_Lab_V12_Catalogo/bankData.json').read_text(encoding='utf-8'))
assert len(bank['items'])==126
for item in bank['items']:
    # The exported bank has one binary field per clip; preserve exact identity.
    fields=[v['url'] for v in item.values() if isinstance(v,dict) and v.get('encoding')=='external-binary']
    assert len(fields)==1,(item['id'],fields)
    data=(repo/'public'/fields[0].lstrip('/')).read_bytes()
    assert len(data)==item['bytes'],item['id']
    assert hashlib.sha256(data).hexdigest()==item['sha256'],item['id']
print(f"PASS: {len(manifest['sources'])} sources, {len(manifest['resources'])} resources, 126 exact SFX matches")
workers=repo/'content/manifests/worker-actions.json'
if workers.exists():
    records=json.loads(workers.read_text(encoding='utf-8'))
    assert set(records)=={'olderMale','olderFemale','youngMale','youngFemale'}
    assert records==json.loads((repo/'public/content/worker-actions.json').read_text(encoding='utf-8'))
    for profile,item in records.items():
        data=(repo/'public'/item['url'].lstrip('/')).read_bytes()
        assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256'],profile
        assert len(item['actions'])==12 and item['fps']==30 and item['bones']==28,profile
        for code in item['exporterScripts']:
            assert hashlib.sha256((repo/code['path']).read_bytes()).hexdigest()==code['sha256'],profile
    print('PASS: four full worker libraries exported by the original labs, 48 actions with provenance')

# Generated maps and source ZIP entries have independent provenance.
from zipfile import ZipFile
bake=json.loads((repo/'content/manifests/mangrove-ground-bake.json').read_text(encoding='utf8'))
for material in bake['materials']:
    path=repo/material['path']
    assert hashlib.sha256(path.read_bytes()).hexdigest()==material['sha256']
    with ZipFile(path) as archive:
        for entry in material['entries'].values():
            data=archive.read(entry['entry'])
            assert len(data)==entry['bytes'] and hashlib.sha256(data).hexdigest()==entry['sha256']
for role,item in {**bake['maps'],**{'mud-'+role:item for role,item in bake.get('mudMaps',{}).items()}}.items():
    data=(repo/'public'/item['url'].lstrip('/')).read_bytes()
    assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256'],role
    assert item['width']==item['height']==1024 and item['channels']==3
print('PASS: six separate material textures and ten original material maps in two intact source ZIPs')

for url in bake['archiveOnly']:
    data=(repo/'public'/url.lstrip('/')).read_bytes()
    assert hashlib.sha256(data).hexdigest()==pathlib.Path(url).stem,url

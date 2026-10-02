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


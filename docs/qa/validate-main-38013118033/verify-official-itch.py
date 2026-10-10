import sys,json,hashlib,zipfile
from pathlib import Path
f=Path(__file__).resolve().parent
p=Path(sys.argv[1]);r=json.loads((f/'official-itch-review.json').read_bytes())
a=json.loads((f/'official-itch-artifact.json').read_bytes())
h=hashlib.sha256()
with p.open('rb') as src:
 for block in iter(lambda:src.read(1048576),b''):h.update(block)
assert p.stat().st_size==r['bytes']==a['size_in_bytes']
assert h.hexdigest()==r['sha256'] and a['digest']=='sha256:'+h.hexdigest()
with zipfile.ZipFile(p) as z:
 names=z.namelist();assert len(names)==r['files'] and 'index.html' in names
 assert not any(n.lower().endswith('.zip') for n in names)
 assert not any(n.startswith('/') or '..' in n.split('/') for n in names)
 assert z.testzip() is None
print('PASS official GitHub digest, 711 root-ready entries, no nested ZIP or unsafe paths, all CRCs')

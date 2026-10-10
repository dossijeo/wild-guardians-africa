import pathlib,json,hashlib,subprocess
here=pathlib.Path(__file__).resolve().parent;root=here.parents[3]
before=(here/'inventory.json').read_bytes()
subprocess.run(['python',str(here/'audit.py')],cwd=root,check=True,stdout=subprocess.DEVNULL)
assert (here/'inventory.json').read_bytes()==before
r=json.loads(before)
for path,digest in r['sourceHashes'].items():assert hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,path
assert len(r['assets']['steady']['species'])==8 and len(r['assets']['bridges']['species'])==8
assert r['alternativesByteLedger']['maizeDecodedGeometryBytes']==6258390
assert r['alternativesByteLedger']['maizeWithNeededEmbeddedImagesPayloadBytes']==7382788
assert all(not a['crossSpeciesGeometryViewsShared'] for a in r['assets'].values())
assert r['metadata']['canonicalFaceLabelsRemovableBytes']==239095
print('PASS: reproducible read-only inventory, exact input hashes/ranges, all8 species, shared texture and duplicate-cost ledger; no runtime/native evidence')

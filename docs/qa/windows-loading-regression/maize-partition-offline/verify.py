import pathlib,json,hashlib,subprocess
here=pathlib.Path(__file__).resolve().parent;root=here.parents[3]
r=json.loads((here/'receipt.json').read_text(encoding='utf-8'));out=root/r['outputDirectory']
for path,digest in r['sourceHashes'].items():assert hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,path
for path,digest in r['sourceHashes'].items():
 if path not in ['tools/experiments/partition-crop-library.mjs','tests/crop-library-partition.test.js']:
  assert hashlib.sha256(subprocess.check_output(['git','show',r['baseline']+':'+path],cwd=root)).hexdigest()==digest,path
subprocess.run(['node','tools/experiments/partition-crop-library.mjs'],cwd=root,check=True,stdout=subprocess.DEVNULL)
for path,record in r['assets'].items():
 data=(out/path).read_bytes();assert len(data)==record['bytes'],path;assert hashlib.sha256(data).hexdigest()==record['sha256'],path
assert (here/'partition-manifest.json').read_bytes()==(out/'partition-manifest.json').read_bytes()
assert r['checks']['exitCode']==0 and hashlib.sha256((here/'tests.log').read_bytes()).hexdigest()==r['checks']['sha256']
assert r['normalRuntimeChanged'] is False and r['nativeEvidence'] is False
print('PASS: exact deterministic candidate bytes, original runtime unchanged, source/test hashes, no native/performance claim')

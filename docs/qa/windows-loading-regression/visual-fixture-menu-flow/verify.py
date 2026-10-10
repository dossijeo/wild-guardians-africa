from pathlib import Path
import json,hashlib,gzip,subprocess
here=Path(__file__).resolve().parent;root=here.parents[3];r=json.loads((here/'receipt.json').read_text(encoding='utf-8'));sha=lambda b:hashlib.sha256(b).hexdigest()
for key,parent in [('sources',root),('files',here)]:
 for f,row in r[key].items():
  raw=(parent/f).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256'],f
  if 'originalSha256' in row:
   original=gzip.decompress(raw);assert len(original)==row['originalBytes'] and sha(original)==row['originalSha256'],f
for f in r['unchangedNormalizedSources']:assert (root/f).read_bytes().replace(b'\r\n',b'\n')==subprocess.check_output(['git','show','b76cda99:'+f],cwd=root).replace(b'\r\n',b'\n'),f
assert r['tests']['pass']==18 and r['nativeExecuted'] is False
print('PASS fixture-flow source/log hashes and unchanged App/World/rendering/gates')

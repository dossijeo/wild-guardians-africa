"""Recover and hash-check the exact frozen WIP sources of root's pilot.

The only post-capture code changes are UI arm labels. Reconstruction is
accepted only if every byte matches the hashes root recorded before drawing.
No fixture or original asset is modified.
"""
import hashlib,json,subprocess
from frontside_model_pilot import ROOT
folder=ROOT/'docs/qa/frontside-model-pilot';receipt=json.loads((folder/'maize-side-partition-guided-provenance.json').read_text());rows=[]
for path,expected in receipt['sourceHashes'].items():
 raw=(ROOT/path).read_bytes()
 if path.endswith('frontside-crop-visual.html'):raw=subprocess.check_output(['git','show','ddb06093:'+path],cwd=ROOT)
 if path.endswith('frontside-crop-visual.js'):
  text=raw.decode()
  text=text.replace(" document.querySelector('#arms').textContent=report.arms.join(' → ')+'. Diagnóstico; no aprobación ni benchmark.';\n",'')
  text=text.replace("status.textContent=`${report.samples.length} vistas: `+comparisons.map(c=>report.arms[c.arm]+': '+(c.passes?'PASS':'FAIL')).join('; ');", "status.textContent=`${report.samples.length} vistas: indexed=${comparisons[0].passes}, sinXY=${comparisons[1].passes}, conXY=${comparisons[2].passes}`;")
  raw=text.encode()
 if hashlib.sha256(raw).hexdigest()!=expected:
  variants=[raw.replace(b'\r\n',b'\n'),raw.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')]
  raw=next((v for v in variants if hashlib.sha256(v).hexdigest()==expected),raw)
 assert hashlib.sha256(raw).hexdigest()==expected,path
 rows.append(dict(path=path,sha256=expected,utf8=raw.decode()))
out=dict(status='HASH_VERIFIED_CAPTURE_SOURCE_SNAPSHOT',head=receipt['head'],worktreeHasWip=True,sources=rows,limitations=['Server source hash records disk contents; running server predated the unused derived JSON route, as documented. SidePartition does not use that route.', 'Only UI labels changed after this capture; all reconstructed source bytes verified against pre-draw hashes.'])
(folder/'maize-side-partition-guided-source-snapshot.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(dict(status=out['status'],verifiedFiles=len(rows))))

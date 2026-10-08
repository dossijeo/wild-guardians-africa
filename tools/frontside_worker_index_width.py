"""Disabled worker index-width control, not a normal repair or culling approval.

Numeric triangle corners/ordering and every attribute/rig/clip remain exact.
Used to separate indexing resources/performance from a geometric candidate.
"""
import argparse,copy,hashlib,json,struct,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
parser=argparse.ArgumentParser();parser.add_argument('--base',choices=['original','selective','field'],default='original');args=parser.parse_args()
folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='youngMale')
if args.base=='original':path=ROOT/'public'/receipt['source'].lstrip('/');expected=receipt['sourceSha256']
elif args.base=='selective':path=ROOT/receipt['archiveCandidate'];expected=receipt['candidateSha256']
else:
 r=json.loads((folder/'worker-badge-field-normal-candidate-receipts.json').read_text(encoding='utf8'))[0];path=ROOT/r['archiveCandidate'];expected=r['candidateSha256']
raw,d,b=read_glb(path);assert hashlib.sha256(raw).hexdigest()==expected
out=copy.deepcopy(d);blob=bytearray(b);remap={};rows=[]
for mi,m in enumerate(d['meshes']):
 for pi,p in enumerate(m['primitives']):
  aid=p['indices'];values=accessor(d,b,aid);assert np.isfinite(values).all();max_index=int(values.max());assert max_index<65536
  if d['accessors'][aid]['componentType']==5123:continue
  assert d['accessors'][aid]['componentType']==5125
  if aid not in remap:
   converted=values.astype('<u2');blob.extend(b'\0'*(-len(blob)%4));offset=len(blob);blob.extend(converted.tobytes())
   out['bufferViews'].append(dict(buffer=0,byteOffset=offset,byteLength=converted.nbytes,target=34963));a=copy.deepcopy(d['accessors'][aid]);a.update(bufferView=len(out['bufferViews'])-1,componentType=5123);a.pop('byteOffset',None);out['accessors'].append(a);remap[aid]=len(out['accessors'])-1
   rows.append(dict(mesh=mi,primitive=pi,indexEntries=values.size,maxIndex=max_index,beforeBytes=values.nbytes,afterBytes=converted.nbytes,savedBytes=values.nbytes-converted.nbytes))
  out['meshes'][mi]['primitives'][pi]['indices']=remap[aid]
for key in ['nodes','skins','animations','materials','images']:assert out.get(key)==d.get(key)
out['buffers'][0]['byteLength']=len(blob);blob.extend(b'\0'*(-len(blob)%4));text=json.dumps(out,separators=(',',':')).encode();text+=b' '*(-len(text)%4)
output=struct.pack('<III',0x46546c67,2,28+len(text)+len(blob))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(blob),0x004e4942)+blob
sha=hashlib.sha256(output).hexdigest();archive=ROOT/'.cache/frontside-model-pilot/candidates/archive'/(sha+'.glb')
if archive.exists():assert archive.read_bytes()==output
else:archive.write_bytes(output)
_,verified,vb=read_glb(archive);sampler_bytes=0
for mi,m in enumerate(d['meshes']):
 for pi,p in enumerate(m['primitives']):
  vp=verified['meshes'][mi]['primitives'][pi];assert np.array_equal(accessor(d,b,p['indices']),accessor(verified,vb,vp['indices']))
  for k,aid in p['attributes'].items():assert accessor(d,b,aid).tobytes()==accessor(verified,vb,vp['attributes'][k]).tobytes()
  for ti,t in enumerate(p.get('targets',[])):
   for k,aid in t.items():assert accessor(d,b,aid).tobytes()==accessor(verified,vb,vp['targets'][ti][k]).tobytes()
for i,a in enumerate(d['animations']):
 for j,s in enumerate(a['samplers']):
  for k in ['input','output']:
   x=accessor(d,b,s[k]);y=accessor(verified,vb,verified['animations'][i]['samplers'][j][k]);assert x.tobytes()==y.tobytes();sampler_bytes+=x.nbytes
for i,s in enumerate(d.get('skins',[])):
 if 'inverseBindMatrices' in s:assert accessor(d,b,s['inverseBindMatrices']).tobytes()==accessor(verified,vb,verified['skins'][i]['inverseBindMatrices']).tobytes()
def geom_bytes(doc,bin):return sum(sum(accessor(doc,bin,a).nbytes for a in p['attributes'].values())+accessor(doc,bin,p['indices']).nbytes for m in doc['meshes'] for p in m['primitives'])
source_bytes=geom_bytes(d,b);candidate_bytes=geom_bytes(verified,vb)
candidate=dict(category='youngMale',source=receipt['source'],candidate=str(archive.relative_to(ROOT)).replace('\\','/'),archiveCandidate=str(archive.relative_to(ROOT)).replace('\\','/'),candidateSha256=sha,baseSha256=expected)
report=dict(status='INDEX_ONLY_CONTROL_NOT_APPROVED',base=args.base,sourceSha256=receipt['sourceSha256'],baseSha256=expected,candidate=candidate,changedIndexAccessors=rows,geometryBeforeBytes=source_bytes,geometryAfterBytes=candidate_bytes,savedGeometryBytes=source_bytes-candidate_bytes,geometryChangePercent=100*(candidate_bytes/source_bytes-1),verifiedClipCount=len(d['animations']),verifiedSamplerBytes=sampler_bytes,limitations=['Not a normal/topology repair or a GPU culling benefit.', 'Every numeric index/corner order and all attribute/morph/nodes/skin/animations/materials/images preserved, independently reread.', 'Decoded referenced geometry bytes only, not measured complete GPU allocation; raw appended old views need web liveness pruning.', 'Original zero normals and all base candidate failures remain unchanged. No runtime activation.'])
(folder/f'worker-{args.base}-index16-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
(folder/f'worker-{args.base}-index16-receipts.json').write_text(json.dumps([candidate],indent=2)+'\n',encoding='utf8')
print(json.dumps({k:report[k] for k in ['base','savedGeometryBytes','geometryChangePercent','verifiedClipCount','verifiedSamplerBytes','candidate']}))

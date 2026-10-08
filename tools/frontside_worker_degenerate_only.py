"""Source-based rigid Crate11 pilot: only exactly unrasterizable normal debris.

No normal replacement, welding or epsilon. All live surface corner lanes stay
exact, including the remaining invalid normals. This is not FrontSide approval.
"""
import copy,hashlib,json,struct,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
from frontside_normal_reconstruction import prune_repeated_position_fans
folder=ROOT/'docs/qa/frontside-model-pilot';name='Prop_FruitCrate_geometry_11'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='youngMale')
raw,d,b=read_glb(ROOT/'public'/receipt['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
node=next(n for n in d['nodes'] if n.get('name')==name);p=d['meshes'][node['mesh']]['primitives'][0]
assert 'skin' not in node and not p.get('targets')
material=d['materials'][p['material']];assert 'displacementTexture' not in material
attrs={k:accessor(d,b,a) for k,a in p['attributes'].items()};ix=accessor(d,b,p['indices']).reshape(-1,3);P=attrs['POSITION'];N=attrs['NORMAL']
zeros=np.where(np.linalg.norm(N.astype(np.float64),axis=1)<1e-10)[0];tri=P[ix]
repeated=np.any(np.all(tri==tri[:,[1,2,0]],axis=2),axis=1)
eligible=[int(v) for v in zeros if np.any(ix==v) and np.all(repeated[np.any(ix==v,axis=1)])]
assert eligible
new_ix,retained,kept,dropped=prune_repeated_position_fans(P,ix,eligible)
assert len(dropped) and np.all(repeated[dropped])
for values in attrs.values():assert values[retained][new_ix].tobytes()==values[ix[kept]].tobytes()
assert np.array_equal(P.min(0),P[retained].min(0)) and np.array_equal(P.max(0),P[retained].max(0))
out=copy.deepcopy(d);blob=bytearray(b);target=out['meshes'][node['mesh']]['primitives'][0]
def append(values,template,kind):
    blob.extend(b'\0'*(-len(blob)%4));offset=len(blob);blob.extend(values.tobytes());out['bufferViews'].append(dict(buffer=0,byteOffset=offset,byteLength=values.nbytes,target=kind));a=copy.deepcopy(template);a.update(bufferView=len(out['bufferViews'])-1,count=len(values));a.pop('byteOffset',None)
    if 'min' in a:a['min']=values.min(0).tolist()
    if 'max' in a:a['max']=values.max(0).tolist()
    out['accessors'].append(a);return len(out['accessors'])-1
for semantic,aid in p['attributes'].items():target['attributes'][semantic]=append(attrs[semantic][retained],d['accessors'][aid],34962)
target['indices']=append(new_ix.reshape(-1,1).astype(accessor(d,b,p['indices']).dtype),d['accessors'][p['indices']],34963)
for k in ['nodes','skins','animations','materials','images']:assert d.get(k)==out.get(k)
out['buffers'][0]['byteLength']=len(blob);blob.extend(b'\0'*(-len(blob)%4));text=json.dumps(out,separators=(',',':')).encode();text+=b' '*(-len(text)%4)
candidate=struct.pack('<III',0x46546c67,2,28+len(text)+len(blob))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(blob),0x004e4942)+blob
sha=hashlib.sha256(candidate).hexdigest();archive=ROOT/'.cache/frontside-model-pilot/candidates/archive'/(sha+'.glb')
if archive.exists():assert archive.read_bytes()==candidate
else:archive.write_bytes(candidate)
_,verified,vb=read_glb(archive);sampler_bytes=0
for mi,m in enumerate(d['meshes']):
    for pi,old in enumerate(m['primitives']):
        new=verified['meshes'][mi]['primitives'][pi];is_target=mi==node['mesh'] and pi==0
        for k,aid in old['attributes'].items():assert accessor(verified,vb,new['attributes'][k]).tobytes()==(attrs[k][retained] if is_target else accessor(d,b,aid)).tobytes()
        expected=new_ix.reshape(-1,1).astype(accessor(d,b,old['indices']).dtype) if is_target else accessor(d,b,old['indices']);assert accessor(verified,vb,new['indices']).tobytes()==expected.tobytes()
for ai,a in enumerate(d['animations']):
    for si,s in enumerate(a['samplers']):
        for k in ['input','output']:
            old=accessor(d,b,s[k]);assert old.tobytes()==accessor(verified,vb,verified['animations'][ai]['samplers'][si][k]).tobytes();sampler_bytes+=old.nbytes
for si,s in enumerate(d.get('skins',[])):
    if 'inverseBindMatrices' in s:assert accessor(d,b,s['inverseBindMatrices']).tobytes()==accessor(verified,vb,verified['skins'][si]['inverseBindMatrices']).tobytes()
r=dict(category='youngMale',source=receipt['source'],candidate=str(archive.relative_to(ROOT)).replace('\\','/'),archiveCandidate=str(archive.relative_to(ROOT)).replace('\\','/'),candidateSha256=sha,sourceSha256=receipt['sourceSha256'])
report=dict(status='EXACT_DEGENERATE_ONLY_PILOT_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],mesh=name,eligibleSourceVertices=eligible,removedSourceFaces=dropped.tolist(),retainedSourceFaces=kept.tolist(),retainedSourceVertices=retained.tolist(),remainingTargetZeroNormals=int(np.sum(np.linalg.norm(N[retained].astype(np.float64),axis=1)<1e-10)),verifiedClipCount=len(d['animations']),verifiedSamplerBytes=sampler_bytes,candidate=r,limitations=['Removes only rigid repeated-position triangles attached exclusively to eligible zero-normal vertices; no epsilon/weld or visible normal replacement.', 'Original live surface normal/UV/corner bits and bounding box preserved; remaining source invalid normals not called repaired.', 'Source-based candidate retains original material sides, rig/skin/12clips; no selective-back experiment implicitly included.', 'No visual/shadow/culture/whole-category or GPU approval; opt-in native control still required.'])
(folder/'worker-crate11-degenerate-only-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');(folder/'worker-crate11-degenerate-only-receipts.json').write_text(json.dumps([r],indent=2)+'\n',encoding='utf8')
print(json.dumps({k:report[k] for k in ['eligibleSourceVertices','removedSourceFaces','remainingTargetZeroNormals','verifiedClipCount','verifiedSamplerBytes','candidate']}))
source_archive=archive.parent/(receipt['sourceSha256']+'.glb')
if source_archive.exists():assert source_archive.read_bytes()==raw
else:source_archive.write_bytes(raw)
control=dict(category='youngMale',source=receipt['source'],candidate=str(source_archive.relative_to(ROOT)).replace('\\','/'),archiveCandidate=str(source_archive.relative_to(ROOT)).replace('\\','/'),candidateSha256=receipt['sourceSha256'])
(folder/'worker-source-repack-control-receipts.json').write_text(json.dumps([control],indent=2)+'\n',encoding='utf8')

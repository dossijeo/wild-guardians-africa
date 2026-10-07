"""Separate disabled local NORMAL repair, preserving frozen shell candidate.

Defined source normals never change. Undefined normals use original face-area
vectors; zero-area isolated duplicates require exact-position incident support
with <=15deg disagreement. No arbitrary-axis fallback, welding or reordering.
"""
import copy,hashlib,json,struct,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot';out=ROOT/'.cache/frontside-model-pilot/candidates'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='youngMale')
source,source_doc,source_bin=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
base,doc,binary=read_glb(ROOT/receipt['archiveCandidate'])
assert hashlib.sha256(source).hexdigest()==receipt['sourceSha256']
assert hashlib.sha256(base).hexdigest()==receipt['candidateSha256']
name='Can_Nozzle_geometry_4'
node=next(n for n in doc['nodes'] if n.get('name')==name)
source_node=next(n for n in source_doc['nodes'] if n.get('name')==name)
prim=doc['meshes'][node['mesh']]['primitives'][0];source_prim=source_doc['meshes'][source_node['mesh']]['primitives'][0]
assert node==source_node and not prim.get('targets')
for semantic,aid in prim['attributes'].items():assert np.array_equal(accessor(doc,binary,aid),accessor(source_doc,source_bin,source_prim['attributes'][semantic]))
index=accessor(doc,binary,prim['indices']).reshape(-1,3)
assert np.array_equal(index,accessor(source_doc,source_bin,source_prim['indices']).reshape(-1,3))
position=accessor(doc,binary,prim['attributes']['POSITION']).astype(np.float64)
normal=accessor(doc,binary,prim['attributes']['NORMAL']);repaired=normal.copy()
bad=np.flatnonzero(np.linalg.norm(normal.astype(np.float64),axis=1)<1e-10)
cross=np.cross(position[index[:,1]]-position[index[:,0]],position[index[:,2]]-position[index[:,0]])
area=np.linalg.norm(cross,axis=1);valid=area>1e-12;sums=np.zeros_like(position)
for corner in range(3):np.add.at(sums,index[valid,corner],cross[valid])
groups={}
for vertex,p in enumerate(position):groups.setdefault(tuple(p),[]).append(vertex)
changes=[];unresolved=[]
for vertex in bad:
    vector=sums[vertex];support=np.flatnonzero(valid&np.any(index==vertex,axis=1));method='original-area-weighted'
    if np.linalg.norm(vector)<=1e-12:
        peers=groups[tuple(position[vertex])];support=np.flatnonzero(valid&np.isin(index,peers).any(axis=1))
        vector=cross[support].sum(0);method='exact-position-area-support'
        if np.linalg.norm(vector)<=1e-12:unresolved.append(dict(vertex=int(vertex),reason='No geometric direction'));continue
        direction=vector/np.linalg.norm(vector);agreement=(cross[support]/area[support,None])@direction
        if np.min(agreement)<np.cos(np.deg2rad(15)):unresolved.append(dict(vertex=int(vertex),reason='Exact-position support exceeds15deg',minCosine=float(np.min(agreement))));continue
    repaired[vertex]=(vector/np.linalg.norm(vector)).astype(np.float32)
    changes.append(dict(vertex=int(vertex),normal=repaired[vertex].tolist(),method=method,supportFaces=support.tolist()))
report=dict(status='LOCAL_NORMAL_DIAGNOSIS_NOT_APPROVAL',source=receipt['source'],sourceSha256=receipt['sourceSha256'],baseCandidateSha256=receipt['candidateSha256'],mesh=name,
    repairedVertices=len(changes),unresolved=unresolved,changes=changes,limits={'minimumAreaVector':1e-12,'maximumFallbackDisagreementDegrees':15},
    limitations=['Normal shading deliberately changes undefined authored directions; real maps/poses/shadows must compare against original.',
    'Only one rigid accessory is investigated; other source zero normals and degenerate geometry remain unresolved.',
    'Frozen shell candidate e554227b and source files remain unchanged; no acceptance or activation.'])
if not unresolved:
    keep=np.ones(len(normal),bool);keep[bad]=False;assert np.array_equal(normal[keep].view(np.uint32),repaired[keep].view(np.uint32))
    before=copy.deepcopy(doc);blob=bytearray(binary);blob.extend(b'\0'*(-len(blob)%4));offset=len(blob);blob.extend(repaired.tobytes())
    doc['bufferViews'].append(dict(buffer=0,byteOffset=offset,byteLength=repaired.nbytes,target=34962))
    template=copy.deepcopy(doc['accessors'][prim['attributes']['NORMAL']]);template['bufferView']=len(doc['bufferViews'])-1;template.pop('byteOffset',None)
    if 'min' in template:template['min']=repaired.min(0).tolist()
    if 'max' in template:template['max']=repaired.max(0).tolist()
    doc['accessors'].append(template);prim['attributes']['NORMAL']=len(doc['accessors'])-1;doc['buffers'][0]['byteLength']=len(blob)
    assert doc['nodes']==before['nodes'] and doc.get('skins')==before.get('skins') and doc['animations']==before['animations'] and bytes(blob[:len(binary)])==binary
    text=json.dumps(doc,separators=(',',':')).encode();text+=b' '*(-len(text)%4);blob.extend(b'\0'*(-len(blob)%4))
    candidate=struct.pack('<III',0x46546c67,2,28+len(text)+len(blob))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(blob),0x004e4942)+blob
    sha=hashlib.sha256(candidate).hexdigest();path=out/(name+'-local-normal-NOT-APPROVED.glb');path.write_bytes(candidate)
    archive=out/'archive'/(sha+'.glb')
    if archive.exists():assert archive.read_bytes()==candidate
    else:archive.write_bytes(candidate)
    report.update(candidate=str(path.relative_to(ROOT)).replace('\\','/'),candidateSha256=sha,archiveCandidate=str(archive.relative_to(ROOT)).replace('\\','/'),bytes=len(candidate),trianglesUnchanged=True)
    (folder/'local-normal-candidate-receipts.json').write_text(json.dumps([dict(category='youngMale',source=receipt['source'],candidate=report['candidate'],candidateSha256=sha)],indent=2)+'\n')
(folder/'worker-local-normal-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['changes','limitations']}))

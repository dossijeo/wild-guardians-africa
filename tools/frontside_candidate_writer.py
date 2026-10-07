"""Produce disabled diagnostic winding candidates from Blender source-face proposals.

Not an acceptance tool. Open leaves/garments remain unresolved. All original
binary bytes remain present; added accessors preserve source UV/skin/morph lanes.
Run: python tools/frontside_candidate_writer.py
"""
import copy, hashlib, json, pathlib, struct, sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT, read_glb, accessor, DTYPES, LANES

def write_glb(doc,binary):
    text=json.dumps(doc,separators=(',',':')).encode(); text+=b' '*((-len(text))%4)
    binary+=b'\0'*((-len(binary))%4)
    return struct.pack('<III',0x46546c67,2,28+len(text)+len(binary))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(binary),0x004e4942)+binary

report=json.loads((ROOT/'docs/qa/frontside-model-pilot/blender-inspection.json').read_text())
out=ROOT/'.cache/frontside-model-pilot/candidates'; out.mkdir(parents=True,exist_ok=True)
receipts=[]
for category in ['crops','youngMale']:
    proposals=[m for m in report['meshes'] if m['category']==category]
    source=proposals[0]['source']; original,doc,bin_source=read_glb(ROOT/'public'/source.lstrip('/'))
    bridge_data=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8')) if category=='crops' else None
    binary=bytearray(bin_source); changes=[]
    def append_accessor(array,template,target=None):
        binary.extend(b'\0'*((-len(binary))%4)); offset=len(binary); packed=array.tobytes(); binary.extend(packed)
        view={'buffer':0,'byteOffset':offset,'byteLength':len(packed)}
        if target: view['target']=target
        doc['bufferViews'].append(view)
        a=copy.deepcopy(template); a['bufferView']=len(doc['bufferViews'])-1; a.pop('byteOffset',None); a['count']=len(array)
        if 'min' in a: a['min']=array.min(axis=0).tolist()
        if 'max' in a: a['max']=array.max(axis=0).tolist()
        doc['accessors'].append(a); return len(doc['accessors'])-1
    for proposal in proposals:
        node=next(n for n in doc['nodes'] if n.get('name')==proposal['name'])
        p=doc['meshes'][node['mesh']]['primitives'][0]
        old_index=p['indices']; index=accessor(doc,bin_source,old_index).reshape(-1,3)
        flips=np.asarray(proposal['recalcWindingProposal'],dtype=np.int64)
        # Give flipped faces private vertices, preserving all non-normal lanes and
        # original vertices exactly. Avoid changing normals on adjacent kept faces.
        originals=index[flips].reshape(-1); vertex_count=doc['accessors'][p['attributes']['POSITION']]['count']
        positions=accessor(doc,bin_source,p['attributes']['POSITION'])
        normals=accessor(doc,bin_source,p['attributes']['NORMAL'])
        triangles=positions[index[flips]]
        geometric=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
        aligned=np.sum(geometric*normals[index[flips]].mean(axis=1),axis=1)>=0
        signs=np.repeat(np.where(aligned,-1,1),3).reshape(-1,1)
        remapped=index.astype(np.uint32)
        for k,face in enumerate(flips): remapped[face]=vertex_count+np.array([k*3,k*3+2,k*3+1])
        caps=proposal.get('capProposals',[])
        if caps: remapped=np.concatenate([remapped,np.asarray([cap['indices'] for cap in caps],dtype=np.uint32)])
        for semantic,aid in list(p['attributes'].items()):
            values=accessor(doc,bin_source,aid); extra=values[originals].copy()
            if semantic=='NORMAL': extra*=signs
            p['attributes'][semantic]=append_accessor(np.concatenate([values,extra]),doc['accessors'][aid],34962)
        for target in p.get('targets',[]):
            for semantic,aid in list(target.items()):
                values=accessor(doc,bin_source,aid); extra=values[originals].copy()
                if semantic=='NORMAL': extra*=signs
                target[semantic]=append_accessor(np.concatenate([values,extra]),doc['accessors'][aid],34962)
        index_template=copy.deepcopy(doc['accessors'][old_index]); index_template['componentType']=5125
        p['indices']=append_accessor(remapped.reshape(-1,1).astype('<u4'),index_template,34963)
        if bridge_data:
            extras=node['extras']; bridge=bridge_data['models'][extras['cropIndex']*5+extras['stage']-1]
            bridge['vertices']=vertex_count+len(originals); bridge['faces']=len(remapped)
            bridge['faceLabels'].extend(cap['driver'] for cap in caps)
        changes.append(dict(name=proposal['name'],flippedFaces=flips.tolist(),newPrivateVertices=len(originals),
            originalVertices=vertex_count,vertexGrowthPercent=100*len(originals)/vertex_count,
            capTriangles=len(caps),capDriverProvenance=[cap['driver'] for cap in caps]))
    doc['buffers'][0]['byteLength']=len(binary)
    candidate=write_glb(doc,bytes(binary)); path=out/(category+'-winding-only-NOT-APPROVED.glb'); path.write_bytes(candidate)
    if bridge_data: (out/'crops-bridges-NOT-APPROVED.json').write_text(json.dumps(bridge_data,separators=(',',':'))+'\n')
    # Animations/skin/morph channels and original accessor payloads are still at original offsets.
    assert bytes(binary[:len(bin_source)])==bin_source
    receipts.append(dict(status='REJECTED_FOR_PROMOTION_PENDING_GEOMETRY_VISUAL_GPU',source=source,
        sourceSha256=hashlib.sha256(original).hexdigest(),candidate=str(path.relative_to(ROOT)).replace('\\','/'),
        candidateSha256=hashlib.sha256(candidate).hexdigest(),bytesBefore=len(original),bytesAfter=len(candidate),
        originalBinaryPrefixPreserved=True,changes=changes,
        remaining='Open and non-manifold surfaces unresolved; Blender winding proposals may change authored leaf/garment orientation.'))
(ROOT/'docs/qa/frontside-model-pilot/candidate-receipts.json').write_text(json.dumps(receipts,indent=2)+'\n')
print(json.dumps([dict(category=r['candidate'],bytesBefore=r['bytesBefore'],bytesAfter=r['bytesAfter']) for r in receipts]))

"""Append ONLY reverses exposed by the runtime pilot; preserve all original lanes.

Produces disabled candidates and exact bridge labels. Selection is insufficient
for approval; crops fail the predeclared pilot triangle budget.
"""
import copy,hashlib,json,struct,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor,DTYPES,LANES

def encode(doc,binary):
    text=json.dumps(doc,separators=(',',':')).encode();text+=b' '*((-len(text))%4);binary+=b'\0'*((-len(binary))%4)
    return struct.pack('<III',0x46546c67,2,28+len(text)+len(binary))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(binary),0x004e4942)+binary

selection=json.loads((ROOT/'docs/qa/frontside-model-pilot/runtime-visibility-selection.json').read_text())
high_resolution=ROOT/'docs/qa/frontside-model-pilot/runtime-visibility-worker1024-selection.json'
if high_resolution.exists():
    refined=json.loads(high_resolution.read_text())
    assert refined['resolution']==1024 and refined['workerOnly']
    for name,faces in refined['selected'].items():
        assert name.startswith('worker/')
        selection['selected'][name]=sorted(set(selection['selected'].get(name,[]))|set(faces))
models=json.loads((ROOT/'public/content/models.json').read_text());workers=json.loads((ROOT/'public/content/worker-actions.json').read_text())
bridge=json.loads((ROOT/'public/content/crop-bridges.json').read_text())
out=ROOT/'.cache/frontside-model-pilot/candidates';out.mkdir(parents=True,exist_ok=True)
receipts=[]
for category,url in [('crops',next(m['url'] for m in models if 'Cultivos' in m['source'])),('youngMale',workers['youngMale']['url'])]:
    original,doc,bin_source=read_glb(ROOT/'public'/url.lstrip('/'));binary=bytearray(bin_source)
    reference=copy.deepcopy(doc);changes=[];labels=copy.deepcopy(bridge) if category=='crops' else None
    def append(array,template,target):
        binary.extend(b'\0'*((-len(binary))%4));offset=len(binary);binary.extend(array.tobytes())
        doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':array.nbytes,'target':target})
        a=copy.deepcopy(template);a['bufferView']=len(doc['bufferViews'])-1;a.pop('byteOffset',None);a['count']=len(array)
        if 'min' in a:a['min']=array.min(axis=0).tolist()
        if 'max' in a:a['max']=array.max(axis=0).tolist()
        doc['accessors'].append(a);return len(doc['accessors'])-1
    for node in doc['nodes']:
        if 'mesh' not in node:continue
        name=node.get('name');key=name if category=='crops' else 'worker/'+str(name)
        chosen=set(selection['selected'].get(key,[]))
        extras=node.get('extras',{});model_index=extras.get('cropIndex',-1)*5+extras.get('stage',0)-1
        if category=='crops':chosen.update(int(item.split(':')[1]) for item in selection['selected'].get('bridgeSource',[]) if int(item.split(':')[0])==model_index)
        if not chosen:continue
        p=doc['meshes'][node['mesh']]['primitives'][0];index_id=p['indices'];indices=accessor(doc,bin_source,index_id).reshape(-1,3).astype(np.uint32)
        faces=np.asarray(sorted(chosen),dtype=np.int64);assert faces.max()<len(indices)
        # Reverse faces share a private clone of each source vertex. Source UV,
        # skin and morph seams remain separate because source index identity is
        # never welded; this avoids needless three-vertices-per-face expansion.
        source_vertices=np.unique(indices[faces].reshape(-1));vertex_count=doc['accessors'][p['attributes']['POSITION']]['count']
        for semantic,aid in list(p['attributes'].items()):
            values=accessor(doc,bin_source,aid);extra=values[source_vertices].copy()
            if semantic=='NORMAL':extra*=-1
            # Three r180 DOUBLE_SIDED flips both tangent and bitangent on a
            # back-facing source fragment. For a reversed front-facing face,
            # invert tangent.xyz AND handedness to reproduce that same TBN.
            if semantic=='TANGENT':extra*=-1
            expanded=np.concatenate([values,extra]);assert np.array_equal(expanded[:len(values)],values)
            if semantic in ('JOINTS_0','WEIGHTS_0','TEXCOORD_0'):assert np.array_equal(extra,values[source_vertices])
            p['attributes'][semantic]=append(expanded,doc['accessors'][aid],34962)
        for morph in p.get('targets',[]):
            for semantic,aid in list(morph.items()):
                values=accessor(doc,bin_source,aid);extra=values[source_vertices].copy()
                if semantic=='NORMAL':extra*=-1
                morph[semantic]=append(np.concatenate([values,extra]),doc['accessors'][aid],34962)
        added=(vertex_count+np.searchsorted(source_vertices,indices[faces])).astype(np.uint32)[:,[0,2,1]]
        index_template=copy.deepcopy(doc['accessors'][index_id])
        if vertex_count+len(source_vertices)>65535:index_template['componentType']=5125
        p['indices']=append(np.concatenate([indices,added]).reshape(-1,1).astype(DTYPES[index_template['componentType']]),index_template,34963)
        if labels:
            rd=labels['models'][model_index];rd['vertices']+=len(source_vertices);rd['faces']+=len(faces)
            rd['faceLabels'].extend(rd['faceLabels'][int(face)] for face in faces)
        changes.append(dict(name=name,sourceFaces=faces.tolist(),trianglesBefore=len(indices),trianglesAfter=len(indices)+len(faces),
            verticesBefore=vertex_count,verticesAfter=vertex_count+len(source_vertices),reverseFaces=len(faces)))
    assert doc.get('nodes')==reference.get('nodes') and doc.get('skins')==reference.get('skins') and doc.get('animations')==reference.get('animations')
    assert doc.get('materials')==reference.get('materials') and doc.get('images')==reference.get('images')
    assert bytes(binary[:len(bin_source)])==bin_source
    doc['buffers'][0]['byteLength']=len(binary);candidate=encode(doc,bytes(binary));path=out/(category+'-selective-reverse-NOT-APPROVED.glb');path.write_bytes(candidate)
    if labels:(out/'crops-selective-bridges-NOT-APPROVED.json').write_text(json.dumps(labels,separators=(',',':'))+'\n')
    def active_bytes(document):
        aids={aid for mesh in document['meshes'] for prim in mesh['primitives'] for aid in [prim['indices'],*prim['attributes'].values(),*[aid for target in prim.get('targets',[]) for aid in target.values()]]}
        return sum(document['accessors'][aid]['count']*np.dtype(DTYPES[document['accessors'][aid]['componentType']]).itemsize*LANES[document['accessors'][aid]['type']] for aid in aids)
    triangles_before=sum(c['trianglesBefore'] for c in changes) if category=='crops' else sum(reference['accessors'][p['indices']]['count']//3 for m in reference['meshes'] for p in m['primitives'])
    extra=sum(c['reverseFaces'] for c in changes);tri_growth=100*extra/triangles_before
    geometry_before=active_bytes(reference);geometry_after=active_bytes(doc)
    geometry_growth=100*(geometry_after/geometry_before-1)
    receipts.append(dict(category=category,status='REJECTED_RESOURCE_BUDGET' if tri_growth>10 or geometry_growth>10 or len(candidate)>len(original)*1.1 else 'PENDING_REAL_SHADER_VISUAL_AND_GPU_GATES',
        candidate=str(path.relative_to(ROOT)).replace('\\','/'),candidateSha256=hashlib.sha256(candidate).hexdigest(),source=url,sourceSha256=hashlib.sha256(original).hexdigest(),
        trianglesBaseline=triangles_before,addedTriangles=extra,triangleGrowthPercent=tri_growth,
        bytesBefore=len(original),bytesAfter=len(candidate),fileGrowthPercent=100*(len(candidate)/len(original)-1),
        activeGeometryBytesBefore=geometry_before,activeGeometryBytesAfter=geometry_after,activeGeometryGrowthPercent=100*(geometry_after/geometry_before-1),
        preserved=['Original binary prefix byte-exact','Nodes/skins/inverse binds/animation JSON byte values','UV/joints/weights on original and appended vertices','Materials/images/morph metadata','Crop face order unchanged; reversed faces append inherited driver labels'],changes=changes))
(ROOT/'docs/qa/frontside-model-pilot/selective-candidate-receipts.json').write_text(json.dumps(receipts,indent=2)+'\n')
print(json.dumps([{k:r[k] for k in ['category','status','triangleGrowthPercent','fileGrowthPercent','activeGeometryGrowthPercent']} for r in receipts]))

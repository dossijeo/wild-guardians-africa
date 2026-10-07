"""Audit every rigid accessory; export only an explicitly named unambiguous pilot.

Source/rig/clip/UV/index contracts and private reverse vertex correspondences
are verified. Undefined primary normals and their negated reverse copies alone
may change. Each exported accessory is a separate disabled candidate.
"""
import argparse,copy,hashlib,json,struct,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
from frontside_normal_reconstruction import reconstruct,prune_repeated_position_fans

parser=argparse.ArgumentParser();parser.add_argument('--mesh');parser.add_argument('--prune-undefined-duplicates',action='store_true');args=parser.parse_args()
folder=ROOT/'docs/qa/frontside-model-pilot';out=ROOT/'.cache/frontside-model-pilot/candidates'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='youngMale')
source,sd,sb=read_glb(ROOT/'public'/receipt['source'].lstrip('/'));base,bd,bb=read_glb(ROOT/receipt['archiveCandidate'])
assert hashlib.sha256(source).hexdigest()==receipt['sourceSha256'] and hashlib.sha256(base).hexdigest()==receipt['candidateSha256']
diagnostic=json.loads((folder/'worker-zero-normal-diagnostics.json').read_text());assert diagnostic['sourceSha256']==receipt['sourceSha256']
names=[r['mesh'] for r in diagnostic['meshes']];assert not args.mesh or args.mesh in names
rows=[]
for name in names:
    node=next(n for n in sd['nodes'] if n.get('name')==name);bn=next(n for n in bd['nodes'] if n.get('name')==name)
    assert node==bn and 'skin' not in node
    sp=sd['meshes'][node['mesh']]['primitives'][0];bp=bd['meshes'][bn['mesh']]['primitives'][0];assert not sp.get('targets') and not bp.get('targets')
    attrs={k:accessor(sd,sb,a) for k,a in sp['attributes'].items()};existing={k:accessor(bd,bb,a) for k,a in bp['attributes'].items()}
    count=len(attrs['POSITION']);ix=accessor(sd,sb,sp['indices']).reshape(-1,3);bi=accessor(bd,bb,bp['indices']).reshape(-1,3)
    for semantic,values in attrs.items():assert values.dtype==existing[semantic].dtype and values.tobytes()==existing[semantic][:count].tobytes()
    assert np.array_equal(ix,bi[:len(ix)])
    new,changes,unresolved=reconstruct(attrs['POSITION'],attrs['NORMAL'],ix)
    reverse=next((c for c in receipt['changes'] if c['name']==name),None);source_vertices=np.array([],dtype=np.int64)
    if reverse:
        assert reverse['capFaces']==0 and reverse['localInnerWallThickness'] is None
        faces=np.array(reverse['sourceFaces'],np.int64);source_vertices=np.unique(ix[faces].reshape(-1))
        assert len(existing['NORMAL'])==count+len(source_vertices)
        assert np.array_equal(bi[len(ix):],(count+np.searchsorted(source_vertices,ix[faces]))[:,[0,2,1]])
        for semantic,values in attrs.items():
            expected=values[source_vertices].copy()
            if semantic in ['NORMAL','TANGENT']:expected*=-1
            assert expected.tobytes()==existing[semantic][count:].tobytes(),(name,semantic)
    else:assert len(existing['NORMAL'])==count and len(bi)==len(ix)
    expanded=np.concatenate([new,-new[source_vertices]])
    defined=np.linalg.norm(existing['NORMAL'].astype(np.float64),axis=1)>=1e-10
    assert existing['NORMAL'][defined].tobytes()==expanded[defined].tobytes()
    retained=np.arange(len(expanded));kept_faces=np.arange(len(bi));new_index=bi;dropped=np.array([],dtype=np.int64);ambiguities=unresolved.copy()
    if args.prune_undefined_duplicates and unresolved:
        # Rigid, no morph/displacement. Ordinary Standard and AfricanToon only
        # shade normals; repeated positions have identical gl_Position under
        # every parent/bone matrix. Zero-area faces cannot rasterize.
        material=bd['materials'][bp['material']];assert not material.get('extensions',{}).get('KHR_materials_displacement')
        ambiguous_source_vertices={u['vertex'] for u in unresolved}
        ambiguous_vertices=sorted(ambiguous_source_vertices)
        ambiguous_vertices.extend(count+i for i,v in enumerate(source_vertices) if v in ambiguous_source_vertices)
        new_index,retained,kept_faces,dropped=prune_repeated_position_fans(existing['POSITION'],bi,ambiguous_vertices)
        unresolved=[u for u in unresolved if u['vertex'] in retained]
        expanded=expanded[retained]
    row=dict(mesh=name,sourceZeroNormals=len(changes)+len(ambiguities),proposalNormals=len(changes),unresolved=unresolved,changes=changes,
        sourceVertices=count,candidateVertices=len(expanded),reverseSourceVertices=source_vertices.tolist(),
        unresolvedCandidateNormals=int(np.sum(np.linalg.norm(expanded.astype(np.float64),axis=1)<1e-10)),
        originalAmbiguities=ambiguities,removedBaseCandidateFaces=dropped.tolist(),retainedBaseCandidateVertices=retained.tolist(),retainedBaseCandidateFaces=kept_faces.tolist(),
        status='UNAMBIGUOUS_GEOMETRIC_PROPOSAL_NOT_VISUAL_APPROVAL' if not unresolved else 'AMBIGUOUS_NOT_EXPORTED')
    if args.mesh==name and not unresolved:
        doc=copy.deepcopy(bd);prim=doc['meshes'][bn['mesh']]['primitives'][0];blob=bytearray(bb)
        def append(values,template,target):
            blob.extend(b'\0'*(-len(blob)%4));offset=len(blob);blob.extend(values.tobytes());doc['bufferViews'].append(dict(buffer=0,byteOffset=offset,byteLength=values.nbytes,target=target))
            a=copy.deepcopy(template);a['bufferView']=len(doc['bufferViews'])-1;a.pop('byteOffset',None);a['count']=len(values)
            if 'min' in a:a['min']=values.min(0).tolist()
            if 'max' in a:a['max']=values.max(0).tolist()
            doc['accessors'].append(a);return len(doc['accessors'])-1
        for semantic,aid in list(prim['attributes'].items()):
            if semantic=='NORMAL':prim['attributes'][semantic]=append(expanded,doc['accessors'][aid],34962)
            elif len(dropped):prim['attributes'][semantic]=append(existing[semantic][retained],doc['accessors'][aid],34962)
        if len(dropped):
            aid=prim['indices'];index_values=new_index.reshape(-1,1).astype(accessor(bd,bb,aid).dtype);prim['indices']=append(index_values,doc['accessors'][aid],34963)
        doc['buffers'][0]['byteLength']=len(blob)
        for key in ['nodes','skins','animations','materials','images']:assert doc.get(key)==bd.get(key)
        assert bytes(blob[:len(bb)])==bb
        text=json.dumps(doc,separators=(',',':')).encode();text+=b' '*(-len(text)%4);blob.extend(b'\0'*(-len(blob)%4))
        data=struct.pack('<III',0x46546c67,2,28+len(text)+len(blob))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(blob),0x004e4942)+blob
        tag='normals-cleanup-v2' if len(dropped) else 'normals-v2';sha=hashlib.sha256(data).hexdigest();path=out/(name+'-'+tag+'-NOT-APPROVED.glb');path.write_bytes(data);archive=out/'archive'/(sha+'.glb')
        if archive.exists():assert archive.read_bytes()==data
        else:archive.write_bytes(data)
        # Independently read back the serialized candidate, including every
        # preserved animation lane. A writer-side comparison alone is weaker.
        _,verified,vb=read_glb(archive)
        for mesh_id,base_mesh in enumerate(bd['meshes']):
            for primitive_id,old in enumerate(base_mesh['primitives']):
                actual=verified['meshes'][mesh_id]['primitives'][primitive_id]
                target=mesh_id==bn['mesh'] and primitive_id==0
                for semantic,old_aid in old['attributes'].items():
                    wanted=(expanded if semantic=='NORMAL' else existing[semantic][retained]) if target else accessor(bd,bb,old_aid)
                    got=accessor(verified,vb,actual['attributes'][semantic])
                    assert got.dtype==wanted.dtype and got.tobytes()==wanted.tobytes(),(name,mesh_id,semantic)
                wanted=new_index.reshape(-1,1).astype(accessor(bd,bb,old['indices']).dtype) if target else accessor(bd,bb,old['indices'])
                assert accessor(verified,vb,actual['indices']).tobytes()==wanted.tobytes()
        animation_bytes=0
        for animation_id,animation in enumerate(bd['animations']):
            for sampler_id,sampler in enumerate(animation['samplers']):
                for lane in ['input','output']:
                    old=accessor(bd,bb,sampler[lane]);new_lane=accessor(verified,vb,verified['animations'][animation_id]['samplers'][sampler_id][lane])
                    assert old.tobytes()==new_lane.tobytes();animation_bytes+=old.nbytes
        for skin_id,skin in enumerate(bd.get('skins',[])):
            if 'inverseBindMatrices' in skin:assert accessor(bd,bb,skin['inverseBindMatrices']).tobytes()==accessor(verified,vb,verified['skins'][skin_id]['inverseBindMatrices']).tobytes()
        row['candidate']=dict(category='youngMale',mesh=name,source=receipt['source'],candidate=str(path.relative_to(ROOT)).replace('\\','/'),candidateSha256=sha,archiveCandidate=str(archive.relative_to(ROOT)).replace('\\','/'),trianglesRemoved=len(dropped),verticesRemoved=len(existing['NORMAL'])-len(retained),trianglesUnchanged=not len(dropped))
        row['candidate']['verifiedAnimationSamplerBytes']=animation_bytes
        row['candidate']['verifiedClipCount']=len(bd['animations'])
        (folder/(name+'-normal-candidate-receipts.json')).write_text(json.dumps([row['candidate']],indent=2)+'\n')
    rows.append(row)
report=dict(status='PER_ACCESSORY_NORMAL_AUDIT_NOT_APPROVAL',sourceSha256=receipt['sourceSha256'],baseCandidateSha256=receipt['candidateSha256'],
    requestedExport=args.mesh,pruneUndefinedDuplicates=args.prune_undefined_duplicates,maximumSupportAngleDegrees=15,accessories=rows,
    limitations=['Both own incident normals and exact-position fallback must agree within15deg; no arbitrary-axis repair.',
    'Audit proposals do not activate/export the category; only a named entirely unambiguous accessory may export.',
    'Private reverse correspondence verified using frozen source face IDs, every source lane and reversed index winding.',
    'Material/shader/coverage, all12clips, shadow and GPU gates remain pending.'])
(folder/('worker-normal-reconstruction-audit.json' if not args.mesh else args.mesh+'-normal-export-audit.json')).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps([dict(mesh=r['mesh'],zeros=r['sourceZeroNormals'],proposal=r['proposalNormals'],blocked=len(r['unresolved']),candidateZeros=r['unresolvedCandidateNormals'],exported='candidate' in r) for r in rows]))

"""Join diagnostic source/candidate face IDs per RGB-outlier pixel.

IDs guide investigation; they are separate draws and do not approve PBR quality.
No source geometry or candidate is modified.
"""
import hashlib,json,sys
sys.dont_write_bytecode=True
from collections import Counter
from frontside_model_pilot import ROOT,read_glb

folder=ROOT/'docs/qa/frontside-model-pilot'
selection=json.loads((folder/'runtime-visibility-selection.json').read_text())
pair_selection=json.loads((folder/'runtime-visibility-crop-pairs-selection.json').read_text())
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text())
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,doc,_=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
runtime_source=next(m['url'] for m in json.loads((ROOT/'public/content/models.json').read_text()) if 'Cultivos' in m['source'])
assert runtime_source.split('/')[-1]==receipt['source'].split('/')[-1]
web_manifest=json.loads((ROOT/'content/manifests/web-assets.json').read_text())
runtime_source=next(r['runtime'] for r in web_manifest['records'] if r['source']==runtime_source.lstrip('/'))
model_ids={n['name']:n['extras']['cropIndex']*5+n['extras']['stage']-1 for n in doc['nodes'] if 'cropIndex' in n.get('extras',{})}
crop_ids={n['extras']['crop']:n['extras']['cropIndex'] for n in doc['nodes'] if 'cropIndex' in n.get('extras',{})}
def selected(mesh,face):
    if mesh.startswith('puente_'):
        _,crop,a,b=mesh.split('_');ai=crop_ids[crop]*5+int(a)-1;bi=ai+1
        count=bridges['models'][ai]['faces'];model=ai if face<count else bi;local=face if face<count else face-count
        return f'{model}:{local}' in pair_selection['selected'].get(f'bridgeSource/{ai}-{bi}',[])
    model=model_ids[mesh]
    return face in selection['selected'].get(mesh,[]) or f'{model}:{face}' in selection['selected'].get('bridgeSource',[])

reports=[]
for name in ['maize-interleave-mature-diagnostic','maize-interleave-bridge-diagnostic']:
    path=folder/(name+'.json');report=json.loads(path.read_text(encoding='utf-8-sig'))
    assert report['source']==runtime_source and report['interleaveReverses']
    maps={arm['arm']:{tuple(pixel):face for face in arm['faces'] for pixel in face['pixelCoordinates']} for arm in report['rgbFaceProvenance']}
    assert maps[0].keys()==maps[3].keys()
    rows=[]
    for pixel,source in maps[0].items():
        # arm0 is original geometry. Its raw ID face is authoritative here.
        # A historical clone-userData alias polluted the redundant sourceFace
        # field in interleave reports; retain reports but never use that field.
        candidate=maps[3][pixel];source_face=source['face'];candidate_face=candidate.get('sourceFace',candidate['face'])
        rows.append(dict(pixel=list(pixel),sourceMesh=source['mesh'],sourceFace=source_face,sourceBackFacing=source['backFacing'],
            sourceReverseSelected=selected(source['mesh'],source_face),candidateMesh=candidate['mesh'],candidateSourceFace=candidate_face,
            sameSourceFace=source['mesh']==candidate['mesh'] and source_face==candidate_face))
    counts=Counter(('back' if r['sourceBackFacing'] else 'front','selected' if r['sourceReverseSelected'] else 'unselected','same' if r['sameSourceFace'] else 'different') for r in rows)
    reports.append(dict(report=name,reportSha256=hashlib.sha256(path.read_bytes()).hexdigest(),rgbOutlierPixels=len(rows),
        classifications=[dict(sourceFacing=k[0],reverseSelection=k[1],sourceFaceIdentity=k[2],pixels=v) for k,v in sorted(counts.items())],pixels=rows))
out=dict(status='PIXEL_FACE_DIAGNOSIS_NOT_APPROVAL',sourceSha256=hashlib.sha256(raw).hexdigest(),reports=reports,
    correctedHistoricalField='Source arm0 uses raw face only, ignoring aliased sourceFace metadata; source data/rendered comparisons unchanged.',
    limitations=['Face IDs are a later diagnostic draw with normal/light/shadow output replaced.',
        'Different IDs do not establish whether missing reversal, near-depth ordering or ID raster differences caused the PBR error.',
        'Earlier alpha/interior-hole and local RGB failures remain unchanged.'])
(folder/'crop-interleave-provenance-audit.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps([dict(report=r['report'],pixels=r['rgbOutlierPixels'],classifications=r['classifications']) for r in reports]))

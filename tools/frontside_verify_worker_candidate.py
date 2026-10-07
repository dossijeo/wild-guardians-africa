"""Verify decoded candidate's skin, action/accessory and attribute contracts."""
import json,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
library=json.loads((ROOT/'public/content/worker-actions.json').read_text())['youngMale']
_,source,sb=read_glb(ROOT/'public'/library['url'].lstrip('/'))
_,candidate,cb=read_glb(ROOT/'.cache/frontside-model-pilot/candidates/youngMale-selective-decoded.glb')
assert source['nodes']==candidate['nodes']
assert len(source['skins'])==len(candidate['skins'])==1
assert len(source['animations'])==len(candidate['animations'])==12
assert source['materials']==candidate['materials']
rows=[]
for old,new in zip(source['skins'],candidate['skins']):
    assert old['joints']==new['joints']
    assert old.get('skeleton')==new.get('skeleton')
    assert np.array_equal(accessor(source,sb,old['inverseBindMatrices']),accessor(candidate,cb,new['inverseBindMatrices']))
for old,new in zip(source['animations'],candidate['animations']):
    assert old['name']==new['name'] and old['channels']==new['channels']
    assert len(old['samplers'])==len(new['samplers'])
    count=0
    for a,b in zip(old['samplers'],new['samplers']):
        assert a.get('interpolation','LINEAR')==b.get('interpolation','LINEAR')
        for key in ['input','output']:
            values=accessor(source,sb,a[key]);after=accessor(candidate,cb,b[key])
            assert values.dtype==after.dtype and values.shape==after.shape and values.tobytes()==after.tobytes()
            count+=values.nbytes
    rows.append(dict(clip=old['name'],channels=len(old['channels']),samplerBytesExact=count))
attributes=[]
for old,new in zip(source['meshes'],candidate['meshes']):
    assert len(old['primitives'])==len(new['primitives'])
    for a,b in zip(old['primitives'],new['primitives']):
        assert a['material']==b['material'] and set(a['attributes'])==set(b['attributes'])
        for semantic,aid in a['attributes'].items():
            before=accessor(source,sb,aid);after=accessor(candidate,cb,b['attributes'][semantic])
            assert before.dtype==after.dtype and before.tobytes()==after[:len(before)].tobytes(),semantic
        indices=accessor(source,sb,a['indices']);after_index=accessor(candidate,cb,b['indices'])
        assert indices.tobytes()==after_index[:len(indices)].tobytes()
        attributes.append(dict(name=old.get('name'),originalVerticesExact=source['accessors'][a['attributes']['POSITION']]['count'],originalIndicesExact=len(indices)))
report=dict(status='CONTRACTS_PASS_NOT_VISUAL_APPROVAL',nodesExact=len(source['nodes']),meshCountExact=len(source['meshes']),skinJointsExact=len(source['skins'][0]['joints']),clips=rows,meshes=attributes,
    limitations=['Does not prove correct dynamic shading, culling, shadows or task/VFX timing in an activated world.','Production worker hash and watering paths remain unchanged because this candidate is disabled.'])
(ROOT/'docs/qa/frontside-model-pilot/worker-contract-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(dict(nodes=len(source['nodes']),meshes=len(source['meshes']),clips=len(rows),samplerBytesExact=sum(r['samplerBytesExact'] for r in rows))))

"""Estimate pair-filtered bridge reverses without changing runtime or assets.

Requires the selector's bridgeSource/a-b provenance. This does not establish
visibility quality, driver residency or GPU time, and does not approve repair.
"""
import json,sys
sys.dont_write_bytecode=True
from frontside_model_pilot import ROOT

selection=json.loads((ROOT/'docs/qa/frontside-model-pilot/runtime-visibility-selection.json').read_text())
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text())
current=json.loads((ROOT/'docs/qa/frontside-model-pilot/crop-runtime-buffer-estimate.json').read_text())
pair_keys=[k for k in selection['selected'] if k.startswith('bridgeSource/')]
if not pair_keys:
    raise SystemExit('PENDING_PAIR_SELECTION: new bridgeSource/a-b provenance is required; no estimate fabricated')

rows=[]
for pair in bridges['pairs']:
    a,b=pair['a'],pair['b'];key=f'bridgeSource/{a}-{b}'
    # A pair absent from a pilot is untouched, not assumed geometrically repaired.
    if key not in selection['selected']:continue
    faces=selection['selected'][key]
    assert len(faces)==len(set(faces))
    for face in faces:
        model,index=map(int,face.split(':'))
        assert model in (a,b) and 0<=index<bridges['models'][model]['faces']
    baseline=next(r for r in current['pairs'] if r['a']==a and r['b']==b)
    added_bytes=len(faces)*3*22*4
    rows.append(dict(a=a,b=b,sourceTriangles=baseline['trianglesBefore'],
        unionTriangles=baseline['trianglesAfter'],pairReverseTriangles=len(faces),
        sourceBytes=baseline['bufferBytesBefore'],unionBytes=baseline['bufferBytesAfter'],
        proposedPairBytes=baseline['bufferBytesBefore']+added_bytes,
        sourceFaceIds=faces))
assert rows
union=sum(r['unionBytes'] for r in rows);proposed=sum(r['proposedPairBytes'] for r in rows)
original=sum(r['sourceBytes'] for r in rows)
report=dict(status='PAIR_BUFFER_ESTIMATE_NOT_GPU_BENCHMARK',
    sourceSelectionResolution=selection['resolution'],pairs=rows,
    sourceBridgeBytes=original,unionBridgeBytes=union,pairFilteredBridgeBytes=proposed,
    pairBridgeGrowthPercent=100*(proposed/original-1),
    savingAgainstUnionBytes=union-proposed,
    limitations=['Only selected bridge pairs are included; not category acceptance.',
        'Indexed state geometry and instance allocations are unchanged in this proposal.',
        'Thin-surface geometry, map shading, withheld states and GPU time remain unverified.',
        'Production bridge builder does not yet consume pair-specific reverse filters.'])
path=ROOT/'docs/qa/frontside-model-pilot/crop-pair-buffer-estimate.json'
path.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ('pairs','limitations')}))

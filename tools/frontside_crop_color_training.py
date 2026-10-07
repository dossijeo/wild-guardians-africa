"""Export minimal diagnostic reversals from corrected original face IDs.

Training on known failing views is never independent visual acceptance.
This sidecar is consumed only by the opt-in browser QA fixture.
"""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
folder = root / 'docs/qa/frontside-model-pilot'
audit_path = folder / 'crop-interleave-provenance-audit.json'
audit = json.loads(audit_path.read_text())
assert audit['status'] == 'PIXEL_FACE_DIAGNOSIS_NOT_APPROVAL'
receipt = next(r for r in json.loads((folder / 'selective-candidate-receipts.json').read_text()) if r['category'] == 'crops')
source_path = receipt['source']
assert hashlib.sha256((root / 'public' / source_path.lstrip('/')).read_bytes()).hexdigest() == audit['sourceSha256']
selected = {}
for report in audit['reports']:
    path = folder / (report['report'] + '.json')
    assert hashlib.sha256(path.read_bytes()).hexdigest() == report['reportSha256']
    for pixel in report['pixels']:
        assert pixel['sourceBackFacing'] and not pixel['sourceReverseSelected']
        selected.setdefault(pixel['sourceMesh'], set()).add(pixel['sourceFace'])
out = dict(status='GUIDED_COLOR_TRAINING_NOT_APPROVAL',source=source_path,
    sourceSha256=audit['sourceSha256'],
    auditSha256=hashlib.sha256(audit_path.read_bytes()).hexdigest(),
    selected={mesh: sorted(faces) for mesh, faces in sorted(selected.items())},
    addedTriangles=sum(len(faces) for faces in selected.values()),
    limitations=['Known failing views are training only; future withheld poses must be reserved separately.',
        'IDs are diagnostic draws, so this tests a hypothesis rather than proving error causality.',
        'No source file, runtime material, faceLabels or candidate GLB is changed.',
        'Triangle/resource and shadow gates remain unmet.'])
(folder / 'crop-color-guided-training.json').write_text(json.dumps(out, indent=2) + '\n')
print(json.dumps(dict(addedTriangles=out['addedTriangles'], perMesh={m:len(f) for m,f in out['selected'].items()})))

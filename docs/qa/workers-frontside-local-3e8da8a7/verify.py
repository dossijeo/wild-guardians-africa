"""Verify retained native evidence. Does not launch or approve production."""
import base64
import hashlib
import json
import lzma
from pathlib import Path

root = Path(__file__).resolve().parent
receipt = json.loads((root / 'receipt.json').read_text())
for name, expected in receipt['files'].items():
    raw = (root / name).read_bytes()
    assert len(raw) == expected['bytes'], name
    assert hashlib.sha256(raw).hexdigest() == expected['sha256'], name

reports = {}
for name, expected in receipt['reports'].items():
    raw = lzma.decompress((root / name).read_bytes())
    assert len(raw) == expected['rawBytes'], name
    assert hashlib.sha256(raw).hexdigest() == expected['rawSha256'], name
    report = json.loads(raw)
    qa = report['checks']['workerRenderQa']
    assert report['ok'] and not report['errors'] and not qa['errors']
    assert qa['caseIndices'] == expected['caseIndices']
    assert [s['caseIndex'] for s in qa['samples']] == expected['caseIndices']
    assert not qa['gpuTiming']
    cleanup = qa['cleanup']
    for field in ['closed', 'stateExact', 'borrowedGeometryAttributesExact',
                  'mixerActivityRestored', 'rendererRetained']:
        assert cleanup[field], field
    assert not cleanup['errors']
    assert cleanup['borrowedDisposeEvents'] == cleanup['ownedMaterialsRemaining'] == 0
    required = set(qa['coverage']['required'])
    assert qa['coverage']['complete']
    for arm_name in ['original', 'candidate']:
        submitted = set()
        for sample in qa['samples']:
            for arm in sample['arms']:
                if arm['arm'] != arm_name:
                    continue
                for draw in arm['draws']:
                    if draw['role'] != 'screen':
                        continue
                    submitted.add(draw['mesh'])
                    if arm_name == 'candidate':
                        assert draw['colorSide'] == 0 and draw['cullEnabled']
                        assert draw['cullMode'] == 1029 and draw['frontFace'] == 2305
                        assert draw['doubleDefine']
                    else:
                        assert draw['colorSide'] == 2 and not draw['cullEnabled']
        assert submitted == required
    reports[name] = report

full = reports['desktop-worker-48-local.json.xz']['checks']['workerRenderQa']
assert full['caseIndices'] == list(range(48))
assert len(set(s['clip'] for s in full['samples'])) == 12
for sample in full['samples']:
    assert sample['controls']['changedChannels'] == 0
    assert sample['candidateDiagnostic']['changedChannels'] == 0
    for arm in sample['arms']:
        name = f"full-case{sample['caseIndex']}-{sample['clip']}-{arm['arm']}.png"
        if name in receipt['files']:
            assert (root / name).read_bytes() == base64.b64decode(arm['capture'].split(',', 1)[1])

base = json.loads((root / 'desktop-worker-fixture.json').read_bytes())
expanded = json.loads((root / 'desktop-worker-48-fixture.json').read_bytes())
assert base['snapshot'] == expanded['snapshot']
assert base['workerRenderQa']['caseIndices'] == [34, 18]
assert expanded['workerRenderQa']['caseIndices'] == list(range(48))
snapshot = json.loads(base['snapshot'])
assert snapshot['ledger']['balance'] == {'n': '648', 'd': '1'}
assert any(w['profile'] == 'youngMale' and w['status'] != 'home' for w in snapshot['workers'])
ci = json.loads((root / 'ci-desktop-smoke.json').read_bytes())
assert not ci['ok'] and ci['errors'] == ['Error: Production world did not finish loading']
for name in ['exit.json', 'exit-48.json']:
    assert json.loads((root / name).read_text(encoding='utf-8-sig'))['exitCode'] == 0
print(json.dumps({'filesVerified': len(receipt['files']), 'nativeCases': [2, 48],
                  'scope': 'Retained native visual/ownership evidence, not GPU benefit or production acceptance'}))

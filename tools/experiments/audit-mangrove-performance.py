import json
import statistics
from pathlib import Path
import numpy as np
from PIL import Image

p = Path('docs/qa/global-visual-lab/mangrove-mud-moss-toon-interior/performance')
out = []
for quality in ['media', 'baja']:
    rows = json.loads((p / f'{quality}.json').read_text(encoding='utf-8'))['records']
    assert len(rows) == 16
    for phase in ['day', 'night']:
        rr = [r for r in rows if r['phase'] == phase]
        assert [r['variant'] for r in rr] == [0, 1, 1, 0, 1, 0, 0, 1]
        for r in rr:
            q = r['report']
            t = q['gpuTimer']
            assert not r['errors'] and not q['errors'] and q['simulationUnchanged'] and q['cameraStable']
            assert q['gpuElapsedMs']['count'] == 180 and t['supported']
            assert not any(t[k] for k in ['disjointEvents', 'discarded', 'overflowSkipped', 'foreignQuerySkipped', 'allocationFailures', 'unresolvedAtDispose', 'contextLost', 'pending'])
        assert all(r['camera'] == rr[0]['camera'] for r in rr)
        for key in ['submittedCalls', 'submittedTriangles']:
            assert len({r['report'][key]['mean'] for r in rr}) == 1
        stats = {k: [statistics.mean(r['report'][k]['mean'] for r in rr if r['variant'] == v) for v in [0, 1]] for k in ['gpuElapsedMs', 'cpuSubmissionMs']}
        images = [Image.open(p / f'return-{quality}-{phase}-{v}.png').convert('RGB') for v in ['A', 'B', 'A2']]
        x = [np.asarray(im).astype(int) for im in images]
        return_exact = bool(np.array_equal(x[0], x[2]))
        for v, im in zip(['A', 'B', 'A2'], images):
            dst = p / f'return-{quality}-{phase}-{v}.webp'
            im.save(dst, lossless=True)
            assert np.array_equal(np.asarray(im), np.asarray(Image.open(dst)))
        out.append(dict(quality=quality, phase=phase, stats=stats, gpuDeltaMs=stats['gpuElapsedMs'][1]-stats['gpuElapsedMs'][0], calls=rr[0]['report']['submittedCalls']['mean'], triangles=rr[0]['report']['submittedTriangles']['mean'], returnExact=return_exact, returnChangedPixels=int(np.any(x[0] != x[2], axis=2).sum()), returnMax=int(abs(x[0]-x[2]).max()), changedPixels=int(np.any(x[0] != x[1], axis=2).sum())))
(p / 'summary.json').write_text(json.dumps(dict(blocks=32, gpuSamples=5760, results=out), indent=2)+'\n', encoding='utf-8')
print(json.dumps(out))

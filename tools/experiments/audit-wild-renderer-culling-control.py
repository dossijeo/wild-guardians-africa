"""Audit ABCABC: uncull vs JS cull vs persistent WASM; never equate triangle counts across uncull/cull."""
import json, statistics as st, sys
from pathlib import Path
from PIL import Image, ImageChops

p = Path(sys.argv[1])
records = json.loads((p / 'benchmarks.json').read_text(encoding='utf-8'))['records']
assert len(records) == 12
rows, differences, images = [], [], []
for phase in ['day', 'night']:
    rr = [r for r in records if r['phase'] == phase]
    assert [r['variant'] for r in rr] == ['unculled', 'base', 'engine-events'] * 2
    for i, r in enumerate(rr):
        assert not r['errors'] and r['time'] == rr[0]['time'] and r['target'] == rr[0]['target']
        assert r['fixedResidency']['keys'] == rr[0]['fixedResidency']['keys']
        for mode, count in [('gpu', 180), ('cadence', 360)]:
            v = r[mode]
            assert v['stateUnchanged'] and v['glError'] == 0 and v['streamCreated'] == 0
            assert len(v['frames']) == count and v['resolution'] == [1280, 720]
            assert v['device'] == rr[0][mode]['device']
            reference = rr[0 if r['variant'] == 'unculled' else 1][mode]['frames']
            for f, a, b in zip(range(count), reference, v['frames']):
                assert a['camera'] == b['camera']
                if (a['calls'], a['triangles']) != (b['calls'], b['triangles']):
                    differences.append(dict(phase=phase, block=i, mode=mode, frame=f))
        g = r['gpu']['gpu']
        assert g['supported'] and len(g['samples']) == 180
        assert not any(g[k] for k in ['disjointEvents', 'discarded', 'overflowSkipped', 'foreignQuerySkipped', 'allocationFailures', 'unresolvedAtDispose', 'contextLost', 'pending'])
        f = r['cadence']['frames']
        row = dict(phase=phase, block=i, variant=r['variant'], gpuMs=st.mean(x['ms'] for x in g['samples']))
        for key in ['cpuMs', 'groupCpuMs', 'packMs', 'intervalMs', 'calls', 'triangles', 'uploads']:
            row[key] = st.mean(x[key] for x in f)
        row['intervalP95'] = sorted(x['intervalMs'] for x in f)[341]
        row['groupOutsidePackMs'] = row['groupCpuMs'] - row['packMs']
        rows.append(row)
        a = Image.open(p / rr[0]['screenshot']).convert('RGB')
        b = Image.open(p / r['screenshot']).convert('RGB')
        delta = ImageChops.difference(a, b)
        images.append(dict(phase=phase, block=i, changedPixels=sum(px != (0, 0, 0) for px in delta.getdata()), maxChannelDelta=max(v[1] for v in delta.getextrema())))
    for i in range(len(rr)):
        for j in range(i + 1, len(rr)):
            delta = ImageChops.difference(Image.open(p / rr[i]['screenshot']).convert('RGB'), Image.open(p / rr[j]['screenshot']).convert('RGB'))
            images.append(dict(phase=phase, blocks=[i, j], changedPixels=sum(px != (0, 0, 0) for px in delta.getdata()), maxChannelDelta=max(v[1] for v in delta.getextrema())))
    panel = Image.new('RGB', (3840, 720))
    for i in range(3):
        panel.paste(Image.open(p / rr[i]['screenshot']).convert('RGB'), (1280 * i, 0))
    panel.save(p / f'{phase}-abc.webp', lossless=True)
result = dict(rows=rows, countMismatches=differences, images=images,
              strictEquivalence=not differences and not any(x['changedPixels'] for x in images),
              note='Fixed residency isolates preparation from streaming. Outside-pack cost is a residual, not a separately instrumented grouping stage. Cadence is render-entry interval, not presentation FPS.')
(p / 'summary.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, indent=2))

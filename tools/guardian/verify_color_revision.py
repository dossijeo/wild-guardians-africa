"""Check a color-only GLB revision; tolerate only tiny tangent export noise."""
import argparse
import hashlib
import json
import math
import struct
from pathlib import Path

WIDTH = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
FORMAT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}


class GLB:
    def __init__(self, path):
        self.raw = Path(path).read_bytes()
        assert self.raw[:4] == b'glTF'
        size = struct.unpack_from('<I', self.raw, 12)[0]
        self.doc = json.loads(self.raw[20:20 + size])
        self.binary = self.raw[28 + size:]

    def read(self, index):
        a = self.doc['accessors'][index]
        fmt = '<' + FORMAT[a['componentType']] * WIDTH[a['type']]
        size = struct.calcsize(fmt)
        rows = [(0,) * WIDTH[a['type']] for _ in range(a['count'])]
        if 'bufferView' in a:
            view = self.doc['bufferViews'][a['bufferView']]
            offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
            rows = [struct.unpack_from(fmt, self.binary, offset + i * view.get('byteStride', size))
                    for i in range(a['count'])]
        if 'sparse' in a:
            sparse = a['sparse']
            ix, val = sparse['indices'], sparse['values']
            io = self.doc['bufferViews'][ix['bufferView']].get('byteOffset', 0) + ix.get('byteOffset', 0)
            vo = self.doc['bufferViews'][val['bufferView']].get('byteOffset', 0) + val.get('byteOffset', 0)
            ifmt = '<' + FORMAT[ix['componentType']]
            for i in range(sparse['count']):
                target = struct.unpack_from(ifmt, self.binary, io + i * struct.calcsize(ifmt))[0]
                rows[target] = struct.unpack_from(fmt, self.binary, vo + i * size)
        assert all(math.isfinite(x) for row in rows for x in row)
        return rows


def compare(old, new):
    results = []

    def check(label, a, b, tolerance=0):
        left, right = old.read(a), new.read(b)
        assert len(left) == len(right), label
        assert all(len(x) == len(y) for x, y in zip(left, right)), label
        delta = max((abs(x-y) for lr, rr in zip(left, right) for x, y in zip(lr, rr)), default=0)
        results.append({'label': label, 'maxDelta': delta, 'tolerance': tolerance, 'pass': delta <= tolerance})

    od, nd = old.doc, new.doc
    # Array identity/order is intentionally strict for successive exports of one source.
    assert od['nodes'] == nd['nodes'], 'Node transforms, hierarchy or bindings changed'
    assert len(od['meshes']) == len(nd['meshes'])
    colors_changed = 0
    for om, nm in zip(od['meshes'], nd['meshes']):
        assert om.get('name') == nm.get('name')
        assert om.get('extras') == nm.get('extras'), 'Morph names changed'
        assert om.get('weights') == nm.get('weights')
        assert len(om['primitives']) == len(nm['primitives'])
        for pi, (op, np) in enumerate(zip(om['primitives'], nm['primitives'])):
            label = f"{om.get('name')}/{pi}"
            assert set(op['attributes']) == set(np['attributes'])
            assert op.get('material') == np.get('material') and op.get('mode', 4) == np.get('mode', 4)
            check(label + '/indices', op['indices'], np['indices'])
            for semantic, index in op['attributes'].items():
                if semantic.startswith('COLOR_'):
                    colors_changed += old.read(index) != new.read(np['attributes'][semantic])
                else:
                    check(label + '/' + semantic, index, np['attributes'][semantic],
                          0.00011 if semantic == 'TANGENT' else 0)
            assert len(op.get('targets', [])) == len(np.get('targets', []))
            for ti, (ot, nt) in enumerate(zip(op.get('targets', []), np.get('targets', []))):
                assert set(ot) == set(nt)
                for semantic, index in ot.items():
                    check(f'{label}/morph{ti}/{semantic}', index, nt[semantic],
                          0.00011 if semantic == 'TANGENT' else 0)
    assert len(od['skins']) == len(nd['skins'])
    for os, ns in zip(od['skins'], nd['skins']):
        assert {k:v for k,v in os.items() if k != 'inverseBindMatrices'} == {k:v for k,v in ns.items() if k != 'inverseBindMatrices'}
        check('inverseBindMatrices', os['inverseBindMatrices'], ns['inverseBindMatrices'])
    assert len(od['animations']) == len(nd['animations'])
    for oa, na in zip(od['animations'], nd['animations']):
        assert oa['name'] == na['name'] and oa['channels'] == na['channels']
        assert len(oa['samplers']) == len(na['samplers'])
        for si, (os, ns) in enumerate(zip(oa['samplers'], na['samplers'])):
            assert os.get('interpolation', 'LINEAR') == ns.get('interpolation', 'LINEAR')
            for key in ['input', 'output']:
                check(f"{oa['name']}/sampler{si}/{key}", os[key], ns[key])
    return {'allPassed': all(r['pass'] for r in results), 'checks': len(results),
            'changedColorAttributes': colors_changed,
            'sourceSHA256': hashlib.sha256(old.raw).hexdigest(),
            'candidateSHA256': hashlib.sha256(new.raw).hexdigest(),
            'nonExact': [r for r in results if r['maxDelta']],
            'scope': 'Nodes, mesh indices, non-color attributes, morphs, skins and animation samplers. Tangent tolerance 0.00011; all other comparisons exact. Material/image contents and visual quality are outside this check.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before')
    parser.add_argument('after')
    parser.add_argument('--report', required=True)
    args = parser.parse_args()
    report = compare(GLB(args.before), GLB(args.after))
    Path(args.report).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report['allPassed'] else 1)

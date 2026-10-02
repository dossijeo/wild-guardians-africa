"""Project native open gate frames below the exported workers' body height."""
import hashlib, json, pathlib, struct
root = pathlib.Path(__file__).resolve().parents[1]
pack_path = root / 'public/content/walls.json'
pack = json.loads(pack_path.read_text(encoding='utf-8'))
sources = {}
calibration_path = root / 'content/manifests/gate-leaf-calibration.json'
calibration = json.loads(calibration_path.read_text(encoding='utf-8'))
sources[calibration_path.relative_to(root).as_posix()] = hashlib.sha256(calibration_path.read_bytes()).hexdigest()
worker_pack = json.loads((root / 'public/content/worker-actions.json').read_text(encoding='utf-8'))
heights = []
for profile in ('youngMale', 'olderMale', 'youngFemale', 'olderFemale'):
    path = root / 'public' / worker_pack[profile]['url'].lstrip('/')
    data = path.read_bytes()
    sources[path.relative_to(root).as_posix()] = hashlib.sha256(data).hexdigest()
    size = struct.unpack_from('<I', data, 12)[0]
    gltf = json.loads(data[20:20+size])
    body = gltf['accessors'][gltf['meshes'][0]['primitives'][0]['attributes']['POSITION']]
    heights.append(body['max'][1] - body['min'][1])
height = max(heights) + .000001
def array(descriptor, code):
    path = root / 'public' / descriptor['url'].lstrip('/')
    data = path.read_bytes()
    sources[path.relative_to(root).as_posix()] = hashlib.sha256(data).hexdigest()
    return struct.unpack('<' + code * (len(data) // struct.calcsize(code)), data)
def below(poly, ceiling):
    result = []
    for i, a in enumerate(poly):
        b = poly[(i + 1) % len(poly)]
        if a[1] <= ceiling: result.append(a)
        if (a[1] <= ceiling) != (b[1] <= ceiling):
            t = (ceiling - a[1]) / (b[1] - a[1])
            result.append(tuple(a[j] + (b[j] - a[j]) * t for j in range(3)))
    return result
def clip(poly, axis, bound, sign):
    result = []
    for i, a in enumerate(poly):
        b = poly[(i+1) % len(poly)]
        da, db = (a[axis]-bound)*sign, (b[axis]-bound)*sign
        if da >= 0: result.append(a)
        if (da >= 0) != (db >= 0):
            t = da / (da-db)
            result.append(tuple(a[j]+(b[j]-a[j])*t for j in range(3)))
    return result
def partition(poly, leaf):
    frame = []
    for axis, bound, sign in ((0,leaf['left'],1),(0,leaf['right'],-1),(1,leaf['top'],-1)):
        outside = clip(poly,axis,bound,-sign)
        if len(outside) >= 3: frame.append(outside)
        poly = clip(poly,axis,bound,sign)
        if len(poly) < 3: break
    return frame, poly if len(poly) >= 3 else []
def hull(points):
    points = sorted(set(points))
    def cross(a, b, c): return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    halves = []
    for sequence in (points, reversed(points)):
        part = []
        for p in sequence:
            while len(part) > 1 and cross(part[-2], part[-1], p) <= 0: part.pop()
            part.append(p)
        halves.append(part[:-1])
    return halves[0] + halves[1]
frames, leaf_footprints = {}, {}
scales = {'zarzas':1,'empalizada':1,'adobe':1.4,'piedra':1.4,'reforzado':1.6}
for material, scale in scales.items():
    piece = pack['pieces'][material + '_puerta']
    pos, index = array(piece['p'], 'f'), array(piece['i'], 'H')
    points = [tuple(pos[i:i+3]) for i in range(0, len(pos), 3)]
    sides, leaf_points = [[], []], []
    leaf = calibration['leaves'].get(material)
    for i in range(0, len(index), 3):
        triangle = [points[j] for j in index[i:i+3]]
        polygons, moving = partition(triangle,leaf) if leaf else ([triangle],[])
        for polygon in polygons:
            polygon = below(polygon,height/scale)
            if not polygon: continue
            xs = [p[0] for p in polygon]
            if min(xs) < 0 < max(xs): raise ValueError(f'{material}: frame obstructs the body-height opening')
            sides[0 if max(xs) <= 0 else 1].extend((p[0], p[2]) for p in polygon)
        leaf_points.extend((p[0],p[2]) for p in below(moving,height/scale))
    frames[material] = [hull(side) for side in sides]
    if leaf_points: leaf_footprints[material] = hull(leaf_points)
module = '// Generated from native gate triangles by tools/prepare_gate_passages.py.\n'
module += 'export const gateBodyHeight=' + str(height) + ';\n'
module += 'export const nativeGateFrames=' + json.dumps(frames, separators=(',', ':')) + ';\n'
module += 'export const nativeGateLeaves=' + json.dumps(calibration['leaves'], separators=(',', ':')) + ';\n'
module += 'export const nativeGateLeafFootprints=' + json.dumps(leaf_footprints,separators=(',', ':')) + ';\n'
target = root / 'src/world/gate-frames-native.js'
target.write_text(module, encoding='utf-8', newline='\n')
manifest = {'bodyHeight': height, 'sources': sources, 'moduleSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
            'scope': 'Five native frames and three articulated leaf footprints projected below native body height.'}
(root / 'content/manifests/gate-frames-native.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8', newline='\n')

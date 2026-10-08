"""CPU source identity, fallback partition, domain and boundary checks only."""
import ast,hashlib,json,math,struct,zipfile
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];FOLDER=ROOT/'docs/qa/frontside-model-pilot'

def load(path):
    output={};rows=[]
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            data=archive.read(name);assert data[:8]==b'\x93NUMPY\x01\x00'
            length=struct.unpack_from('<H',data,8)[0];header=ast.literal_eval(data[10:10+length].decode().strip());raw=data[10+length:]
            assert not header['fortran_order'];output[name[:-4]]=(header,raw)
            rows.append(dict(name=name,shape=header['shape'],dtype=header['descr'],bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest()))
    return output,rows

report=json.loads((FOLDER/'crop-maize-supported-domain-proxy.json').read_text())
payload=FOLDER/'maize-mature-supported-domain-proxy.npz'
assert hashlib.sha256(payload.read_bytes()).hexdigest()==report['payloadSha256']
arrays,storage=load(payload)
prior_path=FOLDER/'maize-mature-global-boundary-draft.npz'
assert hashlib.sha256(prior_path.read_bytes()).hexdigest()==report['inputGeometrySha256']
prior,_=load(prior_path)
for name in ['originalPosition','originalNormal','originalUv','originalIndices','originalLabels','sourceFaceChart']:
    assert arrays[name]==prior[name],name
domain_path=FOLDER/'maize-mature-seam-domains.npz'
assert hashlib.sha256(domain_path.read_bytes()).hexdigest()==report['inputDomainSha256']
source_domain,_=load(domain_path)
for name in ['sourceDomain','sourceSupported']:assert arrays[name]==source_domain[name]
support=arrays['sourceSupported'][1]
fallback=[i[0] for i in struct.iter_unpack('<I',arrays['fallbackOriginalFaces'][1])]
assert fallback==[i for i,v in enumerate(support) if not v]
assert len(fallback)==report['fallbackOriginalFaces']
positions=list(struct.iter_unpack('<fff',arrays['proxyPosition'][1]));coordinates=list(struct.iter_unpack('<ff',arrays['proxyDomain'][1]))
triangles=list(struct.iter_unpack('<III',arrays['proxyIndices'][1]))
assert len(positions)==len(coordinates)==report['proxyVertices'] and len(triangles)==report['proxyFaces']
assert all(math.isfinite(v) for point in positions+coordinates for v in point)
assert all(max(tri)<len(positions) for tri in triangles)
for v,corners in enumerate(report['proxyVertexOriginalCorners']):
    for face,lane,source_vertex in corners:
        assert support[face] and arrays['proxyPosition'][1][v*12:v*12+12]==arrays['originalPosition'][1][source_vertex*12:source_vertex*12+12]
        assert arrays['proxyDomain'][1][v*8:v*8+8]==arrays['sourceDomain'][1][face*24+lane*8:face*24+lane*8+8]
def area(tri):
    p,a,b=[coordinates[v] for v in tri]
    return (a[0]-p[0])*(b[1]-p[1])-(a[1]-p[1])*(b[0]-p[0])
assert all(area(tri)>0 for tri in triangles)
key=lambda corners:tuple(sorted(tuple(corner) for corner in corners))
def boundary(triangles):
    edges=Counter(tuple(sorted((a,b))) for tri in triangles for a,b in zip(tri,tri[1:]+tri[:1]))
    assert all(count<=2 for count in edges.values())
    return {edge for edge,count in edges.items() if count==1}
seams=json.loads((FOLDER/'crop-maize-seam-domain-audit.json').read_text());source_triangles=[]
for chart in seams['charts']:
    if chart.get('parameterization',{}).get('status')!='DISK_PARAMETER_DRAFT_NOT_FIELD_ACCEPTANCE':continue
    keys=[key(corners) for corners in chart['originalCorners']]
    source_triangles.extend(tuple(keys[v] for v in tri) for tri in chart['domainSourceTriangles'])
keys=[key(corners) for corners in report['proxyVertexOriginalCorners']]
output_triangles=[tuple(keys[v] for v in tri) for tri in triangles]
assert boundary(source_triangles)==boundary(output_triangles)
result=dict(status='CPU_PARTIAL_DOMAIN_PROXY_VERIFIED_NOT_VISUAL_OR_GPU_ACCEPTANCE',payloadSha256=report['payloadSha256'],arrays=storage,
    totalDecodedArrayBytes=sum(row['bytes'] for row in storage),originalArraysIdenticalToVerifiedInput=True,
    fallbackPartitionExact=True,retainedPositionAndDomainSourceBitsExact=True,proxyParameterOrientationPositive=True,sourceSeamBoundaryIdentitiesExact=True,
    limitations=['The source-array identity chain references the archived global draft and its independent original-GLB verifier; no new runtime accessor decoding occurred.',
        'Boundary/domain checks are rest-pose CPU checks, not growth/UV-material/normal-map/shadow/visual proof.',
        'Decoded archive bytes are not GPU residency, web deployment size, draw cost or net benefit.'])
(FOLDER/'crop-maize-supported-domain-storage.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps({k:result[k] for k in ['status','totalDecodedArrayBytes','payloadSha256']}))

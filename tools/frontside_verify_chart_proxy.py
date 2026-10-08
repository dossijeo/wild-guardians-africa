"""CPU payload/source-bit correspondence and storage; not render acceptance."""
import ast,hashlib,json,math,struct,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1];folder=root/'docs/qa/frontside-model-pilot'
report=json.loads((folder/'crop-maize-chart-proxy-draft.json').read_text())
payload=root/report['payloadRelative']
if not payload.exists():payload=folder/'maize-mature-chart-geometry-draft.npz'
assert hashlib.sha256(payload.read_bytes()).hexdigest()==report['payloadSha256']
arrays={};rows=[]
with zipfile.ZipFile(payload) as archive:
    for entry in archive.infolist():
        raw=archive.read(entry.filename);assert raw[:6]==b'\x93NUMPY'
        offset=10 if raw[6:8]==bytes([1,0]) else 12
        length=struct.unpack_from('<H' if offset==10 else '<I',raw,8)[0]
        header=ast.literal_eval(raw[offset:offset+length].decode().strip());data=raw[offset+length:]
        assert not header['fortran_order']
        arrays[entry.filename]=(header,data)
        rows.append(dict(name=entry.filename,shape=header['shape'],dtype=header['descr'],bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
source=(root/'public'/receipt['source'].lstrip('/')).read_bytes()
assert hashlib.sha256(source).hexdigest()==report['sourceSha256']==receipt['sourceSha256']
cursor=12;doc=None;binary=None
while cursor<len(source):
    length,kind=struct.unpack_from('<II',source,cursor);chunk=source[cursor+8:cursor+8+length]
    if kind==0x4e4f534a:doc=json.loads(chunk)
    if kind==0x004e4942:binary=chunk
    cursor+=8+length
node=next(n for n in doc['nodes'] if n.get('name')=='maiz_05_maduro');prim=doc['meshes'][node['mesh']]['primitives'][0]
lanes={'SCALAR':1,'VEC2':2,'VEC3':3};width={5126:4,5123:2,5125:4}
def source_bytes(index):
    a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
    assert 'sparse' not in a and 'EXT_meshopt_compression' not in v.get('extensions',{})
    element=width[a['componentType']]*lanes[a['type']];stride=v.get('byteStride',element);start=v.get('byteOffset',0)+a.get('byteOffset',0)
    return b''.join(binary[start+i*stride:start+i*stride+element] for i in range(a['count']))
for key,name in [('POSITION','originalPosition.npy'),('NORMAL','originalNormal.npy'),('TEXCOORD_0','originalUv.npy')]:
    assert arrays[name][1]==source_bytes(prim['attributes'][key]),name
assert arrays['originalIndices.npy'][1]==source_bytes(prim['indices'])
labels=json.loads((root/'public/content/crop-bridges.json').read_text())['models'][4]['faceLabels']
label_format='i' if arrays['originalLabels.npy'][0]['descr']=='<i4' else 'q'
assert arrays['originalLabels.npy'][1]==struct.pack('<'+label_format*len(labels),*labels)
source_chart=struct.unpack('<'+'i'*len(labels),arrays['sourceFaceChart.npy'][1]);covered=set()
for chart in report['charts']:
    for face in chart['sourceFaces']:
        assert face not in covered and labels[face]==chart['label'] and source_chart[face]==chart['chart']
        covered.add(face)
assert covered=={i for i,label in enumerate(labels) if label>=2}
assert all(source_chart[i]==-1 for i,label in enumerate(labels) if label<2)
vertex_count=arrays['proxyPosition.npy'][0]['shape'][0]
positions=list(struct.iter_unpack('<fff',arrays['proxyPosition.npy'][1]))
assert all(math.isfinite(x) for point in positions for x in point)
indices=list(struct.iter_unpack('<III',arrays['proxyIndices.npy'][1]));assert len(indices)==report['proxyLeafFaces']
assert all(max(face)<vertex_count for face in indices)
proxy_chart=struct.unpack('<'+'i'*len(indices),arrays['proxyFaceChart.npy'][1])
assert all(proxy_chart.count(c['chart'])==c['proxyFaces'] for c in report['charts'])
result=dict(status='CPU_SOURCE_TABLE_BITS_AND_STORAGE_VERIFIED_NO_RENDER_ACCEPTANCE',payloadSha256=report['payloadSha256'],arrays=rows,
    totalDecodedArrayBytes=sum(r['bytes'] for r in rows),sourcePnuAndIndexBitExact=True,sourceLabelsAndChartAssignmentsVerified=True,
    proxyPositionFinite=True,proxyIndicesInRange=True,limitations=['No surface correspondence, UV field, normal field, growth, visual, shadow or GPU parity established.','Decoded NPZ arrays are CPU storage, not texture encoding or resident GPU allocation.'])
(folder/'crop-maize-chart-proxy-storage.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps(dict(status=result['status'],totalDecodedArrayBytes=result['totalDecodedArrayBytes'],payloadSha256=result['payloadSha256'])))

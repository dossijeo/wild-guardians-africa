"""Pack experimental lookup/geometry tables, borrowing runtime source fields.

No shading implementation or GLB is emitted. Original PN/UV stay in their
verified runtime accessors; this payload does not duplicate them on disk.
"""
import ast,json,zipfile,struct,hashlib,math
from pathlib import Path
from frontside_domain_grid_inventory import intersects
ROOT=Path(__file__).resolve().parents[1];FOLDER=ROOT/'docs/qa/frontside-model-pilot'

def arrays(path):
    output={}
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            raw=archive.read(name);assert raw[:8]==b'\x93NUMPY\x01\x00'
            length=struct.unpack_from('<H',raw,8)[0]
            header=ast.literal_eval(raw[10:10+length].decode().strip());assert not header['fortran_order']
            output[name[:-4]]=raw[10+length:]
    return output

def main():
    report=json.loads((FOLDER/'crop-maize-supported-domain-proxy.json').read_text())
    path=FOLDER/'maize-mature-supported-domain-proxy.npz'
    assert hashlib.sha256(path.read_bytes()).hexdigest()==report['payloadSha256']
    receipt=json.loads((FOLDER/'maiz_05_maduro-source-web-input-verification.json').read_text())
    assert receipt['mesh']=='maiz_05_maduro' and all(a['bitExact'] for a in receipt['accessors'])
    data=arrays(path);domain=list(struct.iter_unpack('<6f',data['sourceDomain']));indices=list(struct.iter_unpack('<HHH',data['originalIndices']))
    source_chart=[v[0] for v in struct.iter_unpack('<i',data['sourceFaceChart'])]
    faces=[f for f,on in enumerate(data['sourceSupported']) if on];compact_face={face:i for i,face in enumerate(faces)}
    charts=sorted({source_chart[f] for f in faces});compact_chart={chart:i for i,chart in enumerate(charts)}
    coefficients=[];corners=[];centroid_errors=[]
    for face in faces:
        x0,y0,x1,y1,x2,y2=domain[face];a,b=x1-x0,y1-y0;c,d=x2-x0,y2-y0;det=a*d-b*c;assert det>0
        values=[x0,y0,d/det,-c/det,-b/det,a/det,0.,float(face)]
        encoded=struct.unpack('<8f',struct.pack('<8f',*values));assert all(math.isfinite(v) for v in encoded)
        coefficients.extend(encoded);corners.extend((*indices[face],0))
        x=(x0+x1+x2)/3-encoded[0];y=(y0+y1+y2)/3-encoded[1]
        centroid_errors.append(max(abs(encoded[2]*x+encoded[3]*y-1/3),abs(encoded[4]*x+encoded[5]*y-1/3)))
    size=16;cell_rows=[];face_list=[]
    for chart in charts:
        cells=[[] for _ in range(size*size)]
        for face in faces:
            if source_chart[face]!=chart:continue
            values=domain[face];tri=list(zip(values[::2],values[1::2]));xs=[p[0] for p in tri];ys=[p[1] for p in tri]
            bounds=lambda values:(max(0,min(size-1,math.floor(min(values)*size))),max(0,min(size-1,math.floor(max(values)*size))))
            lx,hx=bounds(xs);ly,hy=bounds(ys)
            for y in range(ly,hy+1):
                for x in range(lx,hx+1):
                    if intersects(tri,x/size,y/size,(x+1)/size,(y+1)/size):cells[y*size+x].append(compact_face[face])
        for cell in cells:cell_rows.extend((len(face_list),len(cell)));face_list.extend(cell)
    blobs=[];descriptors={};offset=0
    def add(name,raw,dtype,components,count,texture=None):
        nonlocal offset
        padding=(-offset)%4
        if padding:blobs.append(bytes(padding));offset+=padding
        if texture:
            width=256;texels=math.ceil(count/components);height=math.ceil(texels/width)
            scalar_bytes={'Float32':4,'Uint32':4,'Uint16':2}[dtype]
            raw=raw+bytes(width*height*components*scalar_bytes-len(raw))
            texture=dict(texture,width=width,height=height)
        descriptors[name]=dict(byteOffset=offset,byteLength=len(raw),dtype=dtype,components=components,scalarCount=count,sha256=hashlib.sha256(raw).hexdigest(),texture=texture)
        blobs.append(raw);offset+=len(raw)
    pack=lambda code,values:struct.pack('<'+code*len(values),*values)
    add('faceCoefficients',pack('f',coefficients),'Float32',4,len(coefficients),dict(format='RGBA32F',filter='NEAREST',mipmaps=False))
    add('faceVertices',pack('H',corners),'Uint16',4,len(corners),dict(format='RGBA16UI',filter='NEAREST',mipmaps=False))
    add('cellRanges',pack('I',cell_rows),'Uint32',2,len(cell_rows),dict(format='RG32UI',filter='NEAREST',mipmaps=False))
    add('cellFaces',pack('H',face_list),'Uint16',1,len(face_list),dict(format='R16UI',filter='NEAREST',mipmaps=False))
    for name,components,dtype in [('proxyPosition',3,'Float32'),('proxyDomain',2,'Float32'),('proxyIndices',3,'Uint32'),('fallbackOriginalFaces',1,'Uint32')]:
        raw=data[name];add(name,raw,dtype,components,len(raw)//4)
    vertex_chart=[]
    for identities in report['proxyVertexOriginalCorners']:
        values={source_chart[f] for f,_,_ in identities};assert len(values)==1;vertex_chart.append(compact_chart[values.pop()])
    add('proxyVertexChart',pack('f',vertex_chart),'Float32',1,len(vertex_chart))
    add('supportedOriginalFaces',pack('I',faces),'Uint32',1,len(faces))
    fine_domain=[v for face in faces for v in domain[face]]
    add('supportedSourceDomain',pack('f',fine_domain),'Float32',2,len(fine_domain))
    fine_chart=[compact_chart[source_chart[f]] for f in faces]
    add('supportedSourceChart',pack('H',fine_chart),'Uint16',1,len(fine_chart))
    payload=b''.join(blobs);output=FOLDER/'maize-mature-supported-field-tables.bin';output.write_bytes(payload)
    result=dict(status='EXPERIMENTAL_FIELD_TABLES_SHADER_AND_GATES_PENDING',mesh=receipt['mesh'],inputProxySha256=report['payloadSha256'],
        source=receipt['source'],sourceSha256=receipt['sourceSha256'],runtime=receipt['runtime'],runtimeSha256=receipt['runtimeSha256'],
        sourceAccessors=receipt['accessors'],payload=output.name,payloadBytes=len(payload),payloadSha256=hashlib.sha256(payload).hexdigest(),arrays=descriptors,
        sourceFaces=len(faces),charts=charts,gridSize=size,maxCellCandidates=max(cell_rows[1::2]),faceCandidateEntries=len(face_list),
        maxFloat32InverseCentroidError=max(centroid_errors),
        limitations=['Inverse centroid residual is CPU arithmetic, not GPU accuracy or a visual threshold.',
            'Source PN/UV are borrowed from verified runtime accessors, not copied in this binary. GPU ownership helper is prepared but uploads/readbacks are not validated.',
            'Texture byte descriptors include table padding, not allocation sharing/driver overhead or resident GPU measurements.',
            'No shader, rendered model, GLB, native/bridge transition, material derivative, shadow or net GPU validation exists.'])
    (FOLDER/'maize-mature-supported-field-tables.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
    print(json.dumps({k:result[k] for k in ['status','payloadBytes','payloadSha256','sourceFaces','maxCellCandidates','maxFloat32InverseCentroidError']}))

if __name__=='__main__':main()

"""Prospective lookup candidate counts; no shader, GPU allocation or acceptance."""
import json,zipfile,struct,hashlib,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];FOLDER=ROOT/'docs/qa/frontside-model-pilot'

def read_domains(path):
    with zipfile.ZipFile(path) as archive:data=archive.read('sourceDomain.npy')
    assert data[:8]==b'\x93NUMPY\x01\x00'
    offset=10+struct.unpack_from('<H',data,8)[0]
    return list(struct.iter_unpack('<6f',data[offset:]))

def intersects(triangle,x0,y0,x1,y1):
    # Triangle/axis-aligned-cell SAT: inclusive edges conservatively retained.
    axes=[(1.,0.),(0.,1.)]
    for a,b in zip(triangle,triangle[1:]+triangle[:1]):axes.append((a[1]-b[1],b[0]-a[0]))
    box=[(x0,y0),(x1,y0),(x1,y1),(x0,y1)]
    for x,y in axes:
        t=[a*x+b*y for a,b in triangle];q=[a*x+b*y for a,b in box]
        if max(t)<min(q) or max(q)<min(t):return False
    return True

def main():
    source=json.loads((FOLDER/'crop-maize-seam-domain-audit.json').read_text())
    payload=FOLDER/'maize-mature-seam-domains.npz'
    assert hashlib.sha256(payload.read_bytes()).hexdigest()==source['payloadSha256']
    domains=read_domains(payload)
    charts=[c for c in source['charts'] if c.get('parameterization',{}).get('status')=='DISK_PARAMETER_DRAFT_NOT_FIELD_ACCEPTANCE']
    outputs=[]
    for size in [16,32]:
        counts=[];per_chart=[]
        for chart in charts:
            cells=[[] for _ in range(size*size)]
            for face in chart['sourceFaces']:
                values=domains[face];tri=list(zip(values[::2],values[1::2]))
                xs=[p[0] for p in tri];ys=[p[1] for p in tri]
                lo_x=max(0,min(size-1,math.floor(min(xs)*size)));hi_x=max(0,min(size-1,math.floor(max(xs)*size)))
                lo_y=max(0,min(size-1,math.floor(min(ys)*size)));hi_y=max(0,min(size-1,math.floor(max(ys)*size)))
                for y in range(lo_y,hi_y+1):
                    for x in range(lo_x,hi_x+1):
                        if intersects(tri,x/size,y/size,(x+1)/size,(y+1)/size):cells[y*size+x].append(face)
            rows=[len(c) for c in cells];counts.extend(rows)
            per_chart.append(dict(chart=chart['chart'],sourceFaces=len(chart['sourceFaces']),candidateEntries=sum(rows),maxCandidates=max(rows)))
        ordered=sorted(counts);entries=sum(counts)
        outputs.append(dict(grid=size,charts=len(charts),cells=len(counts),candidateEntries=entries,
            allCellMeanCandidates=entries/len(counts),allCellP95Candidates=ordered[math.ceil(.95*len(ordered))-1],maxCandidates=max(counts),
            hypotheticalCellRGBA32UintBytes=len(counts)*16,hypotheticalR16UintFaceListBytes=entries*2,
            perChart=per_chart))
    result=dict(status='LOOKUP_GRID_INVENTORY_NOT_RENDERABLE_OR_GPU_MEASURED',inputDomainSha256=source['payloadSha256'],grids=outputs,
        limitations=['Counts include empty/unoccupied cells; no view/raster-weighted sampling or performance is inferred.',
            'Candidate lists are geometric SAT overlap, not a completed fragment face search or shader parity proof.',
            'Hypothetical encodings exclude face inverse coefficients, source fields, GPU alignment, other buffers and QA coexistence.',
            'Increasing cell resolution trades table storage for candidate checks; neither configuration is accepted by these counts.'])
    (FOLDER/'crop-domain-grid-inventory.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
    print(json.dumps([{k:g[k] for k in ['grid','cells','candidateEntries','maxCandidates','allCellP95Candidates','hypotheticalCellRGBA32UintBytes','hypotheticalR16UintFaceListBytes']} for g in outputs]))

if __name__=='__main__':main()

"""Separate exact authored interfaces from tolerance-based seam diagnostics.

No welding/export. Identical positions alone never imply interchangeable UV,
normal, region-driver or skin vertices. Counts are diagnostic, not approval.
"""
import json,sys
sys.dont_write_bytecode=True
from collections import defaultdict
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
receipts=json.loads((ROOT/'docs/qa/frontside-model-pilot/selective-candidate-receipts.json').read_text())
reports=[]
for receipt in receipts:
    _,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
    names={'maiz_05_maduro','platano_05_maduro'} if receipt['category']=='crops' else {'Mesh0','Prop_WateringCan_geometry_1'}
    for node in doc['nodes']:
        if node.get('name') not in names:continue
        prim=doc['meshes'][node['mesh']]['primitives'][0]
        position=accessor(doc,binary,prim['attributes']['POSITION'])
        triangles=accessor(doc,binary,prim['indices']).reshape(-1,3)
        modes=[]
        for name,points in [('exactFloatPositions',position),('quantized1e-5',np.round(position/1e-5).astype(np.int64))]:
            _,ids=np.unique(points,axis=0,return_inverse=True)
            edge_faces=defaultdict(list);coincident=defaultdict(list)
            for face,vertices in enumerate(ids[triangles]):
                if len(set(vertices))<3:continue
                coincident[tuple(sorted(vertices))].append(face)
                for a,b in zip(vertices,np.roll(vertices,-1)):
                    edge_faces[(min(a,b),max(a,b))].append((face,int(a>b)))
            duplicate_groups=[faces for faces in coincident.values() if len(faces)>1]
            opposing=[];same=[]
            for faces in duplicate_groups:
                vectors=np.cross(position[triangles[faces,1]]-position[triangles[faces,0]],position[triangles[faces,2]]-position[triangles[faces,0]])
                for i in range(1,len(faces)):
                    (opposing if np.dot(vectors[0],vectors[i])<0 else same).append([faces[0],faces[i]])
            modes.append(dict(mode=name,distinctPositions=int(ids.max()+1),boundaryEdges=sum(len(v)==1 for v in edge_faces.values()),
                nonManifoldEdges=sum(len(v)>2 for v in edge_faces.values()),
                sameWindingManifoldEdges=sum(len(v)==2 and v[0][1]==v[1][1] for v in edge_faces.values()),
                coincidentTriangleGroups=len(duplicate_groups),opposingCoincidentPairs=opposing,sameWindingCoincidentPairs=same))
        reports.append(dict(category=receipt['category'],mesh=node['name'],sourceVertices=len(position),sourceTriangles=len(triangles),interfaces=modes,
            limitations=['Quantized merges do not establish exact coincidence or permit welding.',
                'An intersecting plant organ can be intentional; manifold counts alone are insufficient.',
                'Opposing coincident triangles may already encode a two-sided surface; retain map and driver provenance before any deduplication.']))
output=dict(status='INTERFACE_DIAGNOSTIC_NOT_APPROVED',meshes=reports)
(ROOT/'docs/qa/frontside-model-pilot/interface-diagnostics.json').write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps([dict(mesh=r['mesh'],modes=[{k:v for k,v in m.items() if not k.endswith('Pairs')} for m in r['interfaces']]) for r in reports]))

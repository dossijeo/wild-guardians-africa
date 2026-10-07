"""A controlled inner wall/rim proposal for one rigid thin component.

Original attributes/indices are never welded. Numerical seam matching at1e-12
only identifies physical open rims for the new wall, not production welding.
"""
from collections import defaultdict
import numpy as np

def propose_shell(position,normal,indices,faces,thickness=0.00005):
    assert thickness>0 and thickness<=0.0001
    _,ids=np.unique(np.round(position.astype(np.float64)/1e-12).astype(np.int64),axis=0,return_inverse=True)
    edges=defaultdict(list)
    for face in faces:
        vertices=indices[face]
        for a,b in zip(vertices,np.roll(vertices,-1)):
            key=tuple(sorted((int(ids[a]),int(ids[b]))))
            if key[0]!=key[1]:edges[key].append((int(a),int(b)))
    assert all(len(v)<=2 for v in edges.values()),'Non-manifold component requires separate inspection'
    boundary=[edge[0] for edge in edges.values() if len(edge)==1]
    vertices=np.unique(indices[faces].reshape(-1))
    lengths=np.linalg.norm(normal[vertices],axis=1)
    assert np.all(np.abs(lengths-1)<.0005),'Cannot offset an undefined normal'
    inner=position.astype(np.float64)-normal.astype(np.float64)*thickness
    caps=[]
    for a,b in boundary:
        for sources,roles in [([b,a,a],[False,False,True]),([b,a,b],[False,True,True])]:
            points=np.array([inner[v] if inward else position[v] for v,inward in zip(sources,roles)])
            cross=np.cross(points[1]-points[0],points[2]-points[0]);area=np.linalg.norm(cross)/2
            if area<=1e-12:continue
            flat=cross/(area*2);tangent=points[1]-points[0];tangent/=np.linalg.norm(tangent)
            caps.append(dict(sourceCorners=sources,innerCorners=roles,positions=points.tolist(),normal=flat.tolist(),tangent=[*tangent.tolist(),1.],area=float(area)))
    return dict(thickness=thickness,sourceFaces=[int(f) for f in faces],boundaryEdges=boundary,caps=caps,
        warning='Local proposal only; map/visual/depth/self-intersection/performance gates remain required.')

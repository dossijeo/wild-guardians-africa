"""Positive-weight disk parameterization, independent of cameras/shading UVs.

Closed charts, holes and unsupported incidence are reported, never capped or
forced into one plane. The parameter coordinates do not replace authored UVs.
"""
from collections import defaultdict
import math
import numpy as np
from frontside_surface_charts import boundary_edges,topology_summary

def disk_parameters(points,triangles):
    top=topology_summary(triangles);boundary,edges=boundary_edges(triangles)
    vertices=sorted({v for tri in triangles for v in tri});chi=len(vertices)-len(edges)+len(triangles)
    summary=dict(top,eulerCharacteristic=chi)
    if top['nonManifoldEdges'] or top['boundaryJunctions']:return None,dict(summary,status='UNSUPPORTED_INCIDENCE')
    if not boundary:return None,dict(summary,status='CLOSED_NEEDS_SEAMS_OR_OTHER_REPRESENTATION')
    adjacency=defaultdict(set)
    for a,b in boundary:adjacency[a].add(b);adjacency[b].add(a)
    start=min(adjacency);loop=[start];previous=None;current=start
    while True:
        candidates=sorted(adjacency[current]-({previous} if previous is not None else set()))
        if not candidates:return None,dict(summary,status='UNSUPPORTED_OPEN_BOUNDARY_CHAIN')
        nxt=candidates[0]
        if nxt==start:break
        if nxt in loop:return None,dict(summary,status='UNSUPPORTED_BOUNDARY_CYCLE')
        loop.append(nxt);previous,current=current,nxt
    if len(loop)!=len(adjacency) or chi!=1:return None,dict(summary,status='NON_DISK_NEEDS_EXPLICIT_SEAMS',boundaryVertices=len(adjacency),firstLoopVertices=len(loop))
    lengths=[math.dist(points[a],points[b]) for a,b in zip(loop,loop[1:]+loop[:1])]
    if not all(math.isfinite(x) and x>0 for x in lengths):return None,dict(summary,status='DEGENERATE_BOUNDARY_LENGTH')
    # Positive weights and convex circular boundary; no geometric/UV field weld.
    angles=np.r_[0.,np.cumsum(lengths[:-1])]/sum(lengths)*2*math.pi
    uv=np.zeros((len(points),2),dtype=np.float64);uv[loop]=np.stack([.5+.5*np.cos(angles),.5+.5*np.sin(angles)],axis=1)
    neighbors=defaultdict(set)
    for a,b in edges:neighbors[a].add(b);neighbors[b].add(a)
    interior=sorted(set(vertices)-set(loop));index={v:i for i,v in enumerate(interior)}
    if interior:
        A=np.zeros((len(interior),len(interior)));B=np.zeros((len(interior),2))
        for v,i in index.items():
            A[i,i]=len(neighbors[v])
            for n in neighbors[v]:
                if n in index:A[i,index[n]]-=1
                else:B[i]+=uv[n]
        try:uv[interior]=np.linalg.solve(A,B)
        except np.linalg.LinAlgError:return None,dict(summary,status='SINGULAR_INTERIOR_SOLVE')
    def determinants(values):
        t=values[np.asarray(triangles)];a=t[:,1]-t[:,0];b=t[:,2]-t[:,0]
        return a[:,0]*b[:,1]-a[:,1]*b[:,0]
    det=determinants(uv)
    if np.median(det)<0:uv[:,1]=1-uv[:,1];det=determinants(uv)
    # Test the actual proposed Float32 representation, not only a Float64 solve.
    encoded=uv.astype(np.float32);encoded_det=determinants(encoded.astype(float))
    if not np.isfinite(encoded).all() or np.any(encoded_det<=0):
        return None,dict(summary,status='FLOAT32_PARAMETER_FOLD_OR_DEGENERACY',nonpositiveTriangles=int((encoded_det<=0).sum()))
    return encoded,dict(summary,status='DISK_PARAMETER_DRAFT_NOT_FIELD_ACCEPTANCE',boundaryVertices=len(loop),interiorVertices=len(interior),minParameterDoubleArea=float(encoded_det.min()),maxParameterDoubleArea=float(encoded_det.max()))

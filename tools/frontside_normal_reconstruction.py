"""Conservative local proposals for undefined rigid-accessory normals."""
import numpy as np

def reconstruct(position, normal, triangles, maximum_angle_degrees=15):
    position=np.asarray(position,dtype=np.float64);normal=np.asarray(normal)
    if normal.dtype!=np.float32:raise ValueError('Source NORMAL lanes must be Float32')
    if position.ndim!=2 or position.shape[1]!=3 or normal.shape!=position.shape:raise ValueError('Expected matching POSITION/NORMAL VEC3 arrays')
    if not np.isfinite(position).all() or not np.isfinite(normal).all():raise ValueError('Nonfinite geometry/normal input')
    result=normal.copy();bad=np.flatnonzero(np.linalg.norm(normal.astype(np.float64),axis=1)<1e-10)
    cross=np.cross(position[triangles[:,1]]-position[triangles[:,0]],position[triangles[:,2]]-position[triangles[:,0]])
    area=np.linalg.norm(cross,axis=1);valid=area>1e-12;sums=np.zeros_like(position)
    for corner in range(3):np.add.at(sums,triangles[valid,corner],cross[valid])
    groups={}
    for vertex,p in enumerate(position):groups.setdefault(tuple(p),[]).append(vertex)
    changes=[];unresolved=[]
    for vertex in bad:
        vector=sums[vertex];support=np.flatnonzero(valid&np.any(triangles==vertex,axis=1));method='original-area-weighted'
        if np.linalg.norm(vector)<=1e-12:
            support=np.flatnonzero(valid&np.isin(triangles,groups[tuple(position[vertex])]).any(axis=1))
            vector=cross[support].sum(0);method='exact-position-area-support'
        if not len(support) or np.linalg.norm(vector)<=1e-12:
            unresolved.append(dict(vertex=int(vertex),reason='No geometric direction',method=method));continue
        direction=vector/np.linalg.norm(vector);agreement=(cross[support]/area[support,None])@direction
        angle=float(np.rad2deg(np.arccos(np.clip(np.min(agreement),-1,1))))
        if angle>maximum_angle_degrees:
            unresolved.append(dict(vertex=int(vertex),reason='Incident support is ambiguous across normals',maximumDisagreementDegrees=angle,method=method,supportFaces=support.tolist()));continue
        result[vertex]=direction.astype(np.float32)
        assert np.isfinite(result[vertex]).all() and abs(np.linalg.norm(result[vertex].astype(np.float64))-1)<1e-6
        changes.append(dict(vertex=int(vertex),normal=result[vertex].tolist(),method=method,maximumDisagreementDegrees=angle,supportFaces=support.tolist()))
    keep=np.ones(len(normal),bool);keep[bad]=False
    assert np.array_equal(normal[keep].view(np.uint32),result[keep].view(np.uint32))
    return result,changes,unresolved

def prune_repeated_position_fans(position, triangles, vertices):
    """Remove ambiguous vertices only when all their faces repeat a position.

    Caller must first prove the shader/rig cannot move equal input positions
    differently. This helper performs no tolerance/quantization/near-area test.
    """
    if not np.isfinite(position).all():raise ValueError('Nonfinite POSITION input')
    drop=np.flatnonzero(np.isin(triangles,vertices).any(axis=1))
    for face in drop:
        points=position[triangles[face]]
        if not any(np.array_equal(points[a],points[b]) for a,b in [(0,1),(1,2),(2,0)]):
            raise ValueError('Ambiguous vertex affects a triangle without repeated exact position')
    keep=np.delete(np.arange(len(triangles)),drop);retained=np.unique(triangles[keep].reshape(-1))
    remap=np.full(len(position),-1,dtype=np.int64);remap[retained]=np.arange(len(retained))
    indices=remap[triangles[keep]]
    assert not np.isin(retained,vertices).any()
    assert np.array_equal(position[retained][indices],position[triangles[keep]])
    return indices,retained,keep,drop

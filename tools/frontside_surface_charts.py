"""Geometry topology utilities; source shading-corner identity stays separate.

Split coincident vertex fans by source face-edge incidence, without moving any
point, inserting caps, merging UV/normal fields or consulting a camera.
"""
from collections import defaultdict
import heapq,math

def split_vertex_fans(positions, triangles):
    count=3*len(triangles);parent=list(range(count))
    def find(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]];i=parent[i]
        return i
    def union(a,b):
        a,b=find(a),find(b)
        if a!=b:parent[max(a,b)]=min(a,b)
    edges=defaultdict(list)
    for face,tri in enumerate(triangles):
        for lane in range(3):
            next_lane=(lane+1)%3
            a=tuple(map(float,positions[tri[lane]]));b=tuple(map(float,positions[tri[next_lane]]))
            edges[tuple(sorted((a,b)))].append((face,lane,next_lane,a,b))
    for owners in edges.values():
        if len(owners)!=2:continue
        a,b=owners
        if a[3]!=b[4] or a[4]!=b[3] or a[3]==a[4]:continue
        union(3*a[0]+a[1],3*b[0]+b[2]);union(3*a[0]+a[2],3*b[0]+b[1])
    roots={};points=[];original_corners=[];result=[]
    for face,tri in enumerate(triangles):
        new=[]
        for lane,source_vertex in enumerate(tri):
            root=find(3*face+lane)
            if root not in roots:
                roots[root]=len(points);points.append(tuple(map(float,positions[source_vertex])));original_corners.append([])
            vertex=roots[root];new.append(vertex);original_corners[vertex].append((face,lane,int(source_vertex)))
        result.append(tuple(new))
    # Every output corner retains an explicit source corner. Distinct fan IDs
    # may have identical positions; that is intentional, not an open gap/cap.
    assert all(points[result[f][lane]]==tuple(map(float,positions[source_vertex])) for f,tri in enumerate(triangles) for lane,source_vertex in enumerate(tri))
    return points,result,original_corners

def boundary_edges(triangles):
    edges=defaultdict(list)
    for face,tri in enumerate(triangles):
        for a,b in zip(tri,tri[1:]+tri[:1]):edges[tuple(sorted((a,b)))].append(face)
    return {edge for edge,owners in edges.items() if len(owners)==1},edges

def topology_summary(triangles):
    boundary,edges=boundary_edges(triangles);degree=defaultdict(int)
    for a,b in boundary:degree[a]+=1;degree[b]+=1
    return dict(boundaryEdges=len(boundary),boundaryJunctions=sum(v!=2 for v in degree.values()),nonManifoldEdges=sum(len(o)>2 for o in edges.values()))

def collapse_interior_geometry(points,triangles,target_faces,parameter_coordinates=None):
    """Approximate endpoint QEM with hard original boundary preservation.

    No UV/normal field is averaged or invented. Optional auxiliary domain
    coordinates reject nonpositive parameter orientation during generation.
    This returns geometry only; continuous deformation, closest-surface error
    and pixel gates remain open. Auxiliary coordinates never replace UVs.
    """
    faces={i:tuple(t) for i,t in enumerate(triangles)};vf=defaultdict(set)
    boundary,_=boundary_edges(triangles);locked={v for edge in boundary for v in edge}
    version=[0]*len(points);quadrics=[[0.]*16 for _ in points]
    def normal(tri):
        p,a,b=[points[v] for v in tri];x=[a[i]-p[i] for i in range(3)];y=[b[i]-p[i] for i in range(3)]
        return (x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0])
    def parameter_area(tri):
        p,a,b=[parameter_coordinates[v] for v in tri]
        return (float(a[0])-float(p[0]))*(float(b[1])-float(p[1]))-(float(a[1])-float(p[1]))*(float(b[0])-float(p[0]))
    if parameter_coordinates is not None:
        assert len(parameter_coordinates)==len(points)
        assert all(math.isfinite(parameter_area(tri)) and parameter_area(tri)>0 for tri in triangles),'Source parameter triangles must be positive'
    for f,tri in faces.items():
        for v in tri:vf[v].add(f)
        N=normal(tri);length=math.sqrt(sum(x*x for x in N))
        if not length:continue
        plane=[x/length for x in N];plane.append(-sum(plane[i]*points[tri[0]][i] for i in range(3)))
        for v in tri:
            quadrics[v]=[quadrics[v][i]+plane[i//4]*plane[i%4] for i in range(16)]
    heap=[];attempted=0;collapsed=0
    def enqueue(a,b):
        if a==b or not vf[a] or not vf[b] or (a in locked and b in locked):return
        options=[(a,b)] if a in locked else [(b,a)] if b in locked else [(a,b),(b,a)]
        Q=[quadrics[a][i]+quadrics[b][i] for i in range(16)]
        for keep,drop in options:
            x=list(points[keep])+[1.];cost=max(0.,sum(Q[i]*x[i//4]*x[i%4] for i in range(16)))
            heapq.heappush(heap,(cost,keep,drop,version[keep],version[drop]))
    initial_edges={tuple(sorted((a,b))) for tri in triangles for a,b in zip(tri,tri[1:]+tri[:1])}
    for a,b in sorted(initial_edges):enqueue(a,b)
    while heap and len(faces)>target_faces:
        _,keep,drop,vk,vd=heapq.heappop(heap)
        if version[keep]!=vk or version[drop]!=vd or not vf[keep] or not vf[drop]:continue
        attempted+=1;owners=vf[keep]&vf[drop]
        if len(owners)!=2:continue
        neighbors=lambda v:{q for f in vf[v] for q in faces[f] if q!=v}
        opposite={v for f in owners for v in faces[f] if v not in (keep,drop)}
        if neighbors(keep)&neighbors(drop)!=opposite:continue
        changed=vf[drop]-owners;replacement={f:tuple(keep if v==drop else v for v in faces[f]) for f in changed}
        existing={tuple(sorted(faces[f])) for f in vf[keep]-owners}
        canonical=[tuple(sorted(t)) for t in replacement.values()]
        if len(set(canonical))!=len(canonical) or any(t in existing for t in canonical):continue
        valid=True
        for f,tri in replacement.items():
            old,new=normal(faces[f]),normal(tri)
            area=parameter_area(tri) if parameter_coordinates is not None else 1.
            if not all(math.isfinite(x) for x in new) or sum(old[i]*new[i] for i in range(3))<=0 or not math.isfinite(area) or area<=0:
                valid=False;break
        if not valid:continue
        affected=neighbors(keep)|neighbors(drop)|{keep,drop}
        for f in owners:
            for v in faces[f]:vf[v].remove(f)
            del faces[f]
        for f,tri in replacement.items():
            vf[drop].remove(f);vf[keep].add(f);faces[f]=tri
        quadrics[keep]=[quadrics[keep][i]+quadrics[drop][i] for i in range(16)]
        for v in affected:version[v]+=1
        collapsed+=1
        new_edges={tuple(sorted((a,b))) for v in affected for f in vf[v] for a,b in zip(faces[f],faces[f][1:]+faces[f][:1])}
        for a,b in sorted(new_edges):enqueue(a,b)
    result=[faces[f] for f in sorted(faces)]
    actual_boundary,_=boundary_edges(result)
    assert actual_boundary==boundary,'An original chart boundary was changed'
    return result,dict(targetFaces=target_faces,outputFaces=len(result),collapsedInteriorEdges=collapsed,attemptedCandidates=attempted,originalBoundaryPreserved=True,
        parameterOrientationConstrained=parameter_coordinates is not None,retainedInputFaces=sorted(faces))

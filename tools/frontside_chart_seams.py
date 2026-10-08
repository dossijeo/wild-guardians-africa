"""Camera-independent cuts of genus-zero charts with multiple boundary loops.

Cutting duplicates corner fans at identical positions. No face, cap or UV value
is invented. Source fields remain associated with their original corners.
"""
from collections import defaultdict
import heapq,math
from frontside_surface_charts import boundary_edges,topology_summary

def cut_boundary_loops(points,triangles):
    boundary,edges=boundary_edges(triangles);top=topology_summary(triangles)
    vertices={v for tri in triangles for v in tri};chi=len(vertices)-len(edges)+len(triangles)
    if top['nonManifoldEdges'] or top['boundaryJunctions'] or not boundary:
        return None,dict(status='UNSUPPORTED_OR_CLOSED',topology=top,eulerCharacteristic=chi)
    adjacency=defaultdict(set)
    for a,b in boundary:adjacency[a].add(b);adjacency[b].add(a)
    unseen=set(adjacency);loops=[]
    while unseen:
        start=min(unseen);component=set();pending=[start]
        while pending:
            v=pending.pop()
            if v in component:continue
            component.add(v);pending.extend(adjacency[v]-component)
        unseen-=component;loops.append(component)
    # Do not pretend boundary-to-boundary paths can remove a topological handle.
    if chi!=2-len(loops):
        return None,dict(status='GENUS_OR_CONNECTIVITY_REQUIRES_OTHER_CUT',boundaryLoops=len(loops),eulerCharacteristic=chi)
    graph=defaultdict(list)
    for a,b in edges:
        length=math.dist(points[a],points[b])
        if not math.isfinite(length) or length<=0:
            return None,dict(status='DEGENERATE_SOURCE_EDGE')
        graph[a].append((b,length));graph[b].append((a,length))
    perimeter=lambda loop:sum(math.dist(points[a],points[b]) for a,b in boundary if a in loop)
    loops.sort(key=lambda loop:(-perimeter(loop),min(loop)))
    connected=set(loops[0]);remaining=loops[1:];seams=set();paths=[]
    while remaining:
        targets={v:i for i,loop in enumerate(remaining) for v in loop}
        distances={v:0. for v in connected};previous={};queue=[(0.,v) for v in sorted(connected)];heapq.heapify(queue)
        end=None
        while queue:
            distance,v=heapq.heappop(queue)
            if distance!=distances[v]:continue
            if v in targets:end=v;break
            for n,length in sorted(graph[v]):
                value=distance+length
                if value<distances.get(n,float('inf')):
                    distances[n]=value;previous[n]=v;heapq.heappush(queue,(value,n))
        if end is None:return None,dict(status='DISCONNECTED_BOUNDARY_GRAPH')
        path=[end]
        while path[-1] not in connected:path.append(previous[path[-1]])
        path.reverse()
        cuts={tuple(sorted((a,b))) for a,b in zip(path,path[1:])}
        if any(len(edges[edge])!=2 for edge in cuts):
            return None,dict(status='PATH_NOT_INTERNAL_EDGE_CHAIN')
        seams|=cuts;paths.append(dict(vertices=path,length=distances[end]))
        connected.update(path);connected.update(remaining.pop(targets[end]))
    parent=list(range(3*len(triangles)))
    def find(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    def union(a,b):
        a,b=find(a),find(b)
        if a!=b:parent[max(a,b)]=min(a,b)
    owners=defaultdict(list)
    for f,tri in enumerate(triangles):
        for lane in range(3):
            nxt=(lane+1)%3;a,b=tri[lane],tri[nxt]
            owners[tuple(sorted((a,b)))].append((f,lane,nxt,a,b))
    for edge,incidence in owners.items():
        if edge in seams or len(incidence)!=2:continue
        a,b=incidence
        if a[3]!=b[4] or a[4]!=b[3]:return None,dict(status='INCONSISTENT_SOURCE_WINDING')
        union(3*a[0]+a[1],3*b[0]+b[2]);union(3*a[0]+a[2],3*b[0]+b[1])
    ids={};output=[];corners=[];J=[];source_vertex=[]
    for f,tri in enumerate(triangles):
        row=[]
        for lane,v in enumerate(tri):
            root=find(3*f+lane)
            if root not in ids:
                ids[root]=len(output);output.append(points[v]);source_vertex.append(v);corners.append([])
            index=ids[root];row.append(index);corners[index].append((f,lane,v))
        J.append(tuple(row))
    after=topology_summary(J);_,after_edges=boundary_edges(J)
    after_chi=len(output)-len(after_edges)+len(J)
    if after['boundaryJunctions'] or after['nonManifoldEdges'] or after_chi!=1:
        return None,dict(status='CUT_NOT_VERIFIED_DISK',topology=after,eulerCharacteristic=after_chi,paths=paths)
    assert all(tuple(output[J[f][lane]])==tuple(points[v]) for f,tri in enumerate(triangles) for lane,v in enumerate(tri))
    return (output,J,corners),dict(status='GENUS_ZERO_SEAM_DRAFT',sourceBoundaryLoops=len(loops),paths=paths,seamEdges=[list(e) for e in sorted(seams)],
        inputVertices=len(points),outputVertices=len(output),sourceFaces=len(triangles),outputFaces=len(J),afterTopology=after,eulerCharacteristic=after_chi)

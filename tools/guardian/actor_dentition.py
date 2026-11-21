"""Find and detach authored dental islands joined through articulation vertices.
Uses topology, not a color mask or mirrored proximity approximation.
"""
import bmesh,sys

def detach_hyena_dentition(bm,world):
    face_tag=bm.faces.layers.int.get('rigidDentalIsland') or bm.faces.layers.int.new('rigidDentalIsland')
    bm.verts.ensure_lookup_table();bm.verts.index_update()
    verts=list(bm.verts);points=[world@v.co for v in verts]
    adjacency=[[e.other_vert(v).index for e in v.link_edges] for v in verts]
    seen={};low={};stack=[];components=[];counter=0
    old_limit=sys.getrecursionlimit();sys.setrecursionlimit(max(old_limit,40000))
    def visit(v,parent):
        nonlocal counter
        counter+=1;seen[v]=low[v]=counter
        for w in adjacency[v]:
            if w==parent:continue
            if w not in seen:
                stack.append((v,w));visit(w,v);low[v]=min(low[v],low[w])
                if low[w]>=seen[v]:
                    component=set()
                    while stack:
                        edge=stack.pop();component.update(edge)
                        if edge==(v,w):break
                    components.append(component)
            elif seen[w]<seen[v]:
                low[v]=min(low[v],seen[w]);stack.append((v,w))
    try:
        for i in range(len(verts)):
            if i not in seen:visit(i,-1)
    finally:sys.setrecursionlimit(old_limit)
    dental=[]
    for component in components:
        if not 20<len(component)<200:continue
        ps=[points[i] for i in component]
        if min(p.z for p in ps)>1.36 and max(p.z for p in ps)<1.51 and max(p.y for p in ps)<-.53:
            dental.append(component)
    assert sorted(map(len,dental))==[57,90,91], 'Unexpected dentition topology; recalibrate against source'
    face_groups=[]
    for number,component in enumerate(dental,1):
        faces=[f for f in bm.faces if all(v.index in component for v in f.verts)]
        assert faces,'Dental component has no faces'
        for f in faces:f[face_tag]=number
        face_groups.append(number)
    # Reacquire faces after each split; other BMesh element handles may change.
    for number in face_groups:
        faces=[f for f in bm.faces if f[face_tag]==number]
        bmesh.ops.split(bm,geom=faces,use_only_faces=True)
    for v in bm.verts:
        tags={f[face_tag] for f in v.link_faces}
        assert not (0 in tags and len(tags)>1),'Dental vertex still joined to skin'
    return face_tag,{'islandVertices':sorted(map(len,dental)),'method':'biconnected components and face isolation','geometryReplaced':False}

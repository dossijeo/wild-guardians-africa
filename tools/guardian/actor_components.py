"""Biconnected vertex regions on a disposable welded BMesh.

Unlike connected components, this separates parts touching at a single vertex.
Never weld the production mesh merely to classify regions.
"""
def biconnected_regions(bm):
    bm.verts.ensure_lookup_table();bm.verts.index_update()
    adjacency={v.index:[e.other_vert(v).index for e in v.link_edges] for v in bm.verts}
    discovered={};low={};stack=[];parts=[]
    def visit(u,parent=None):
        discovered[u]=low[u]=len(discovered)
        for v in adjacency[u]:
            if v==parent:continue
            if v not in discovered:
                stack.append((u,v));visit(v,u);low[u]=min(low[u],low[v])
                if low[v]>=discovered[u]:
                    part=set()
                    while stack:
                        edge=stack.pop();part.update(edge)
                        if edge==(u,v):break
                    parts.append([bm.verts[i] for i in part])
            elif discovered[v]<discovered[u]:
                low[u]=min(low[u],discovered[v]);stack.append((u,v))
    for v in adjacency:
        if v not in discovered:visit(v)
    return parts

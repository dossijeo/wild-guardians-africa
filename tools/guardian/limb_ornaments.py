"""Keep detached wrist/hand ornaments rigid after spatial weight relaxation."""
def bind_limb_ornaments(body):
    vertices = body.data.vertices
    adjacency = [set() for _ in vertices]
    seams = {}
    for edge in body.data.edges:
        a, b = edge.vertices
        adjacency[a].add(b)
        adjacency[b].add(a)
    for v in vertices:
        seams.setdefault(tuple(round(x, 6) for x in v.co), []).append(v.index)
    for ids in seams.values():
        for i in ids:
            adjacency[i].update(ids)
    unseen = set(range(len(vertices)))
    report = []
    while unseen:
        pending = [min(unseen)]
        island = set()
        while pending:
            i = pending.pop()
            if i in island:
                continue
            island.add(i)
            pending.extend(adjacency[i] - island)
        unseen.difference_update(island)
        if len(island) > 200:
            continue
        extent = max(max(vertices[i].co[j] for i in island) - min(vertices[i].co[j] for i in island) for j in range(3))
        if extent > .035:
            continue
        totals = {}
        for i in island:
            for g in vertices[i].groups:
                totals[g.group] = totals.get(g.group, 0.) + g.weight
        if not totals:
            continue
        group = max(totals, key=totals.get)
        name = body.vertex_groups[group].name
        if not name.startswith(('Forearm.', 'Hand.')) or totals[group] / len(island) < .75:
            continue
        ids = sorted(island)
        for vg in body.vertex_groups:
            vg.remove(ids)
        body.vertex_groups[group].add(ids, 1., 'REPLACE')
        report.append({'vertices':len(ids), 'bone':name, 'extent':extent})
    return report


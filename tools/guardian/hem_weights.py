"""Relax lower cloth skin gradients without touching rigid hanging ornaments."""
import math
from mathutils.kdtree import KDTree


def relax_hem(body):
    names = {g.index: g.name for g in body.vertex_groups}
    skin = [{g.group: g.weight for g in v.groups} for v in body.data.vertices]
    def cloth(weights):
        return any(names[g].startswith('Mantle.') for g in weights) and all(
            names[g] == 'Torso' or names[g].startswith('Mantle.') for g in weights)
    eligible = {v.index for v in body.data.vertices if v.co.z < -.12 and cloth(skin[v.index])}
    tree = KDTree(len(eligible))
    for i in eligible:
        tree.insert(body.data.vertices[i].co, i)
    tree.balance()
    changed = 0
    for _ in range(3):
        result = list(skin)
        for i in eligible:
            v = body.data.vertices[i]
            strength = min(1., max(0., (-v.co.z - .15) / .06))
            strength = strength * strength * (3 - 2 * strength)
            if not strength:
                continue
            average, total = {}, 0.
            for _, j, distance in tree.find_range(v.co, .024):
                factor = math.exp(-(distance / .012) ** 2)
                total += factor
                for g, weight in skin[j].items():
                    average[g] = average.get(g, 0.) + weight * factor
            result[i] = {g: skin[i].get(g, 0.) * (1-strength) + average.get(g, 0.) / total * strength
                         for g in set(skin[i]) | set(average)}
        skin = result
    for i in eligible:
        if body.data.vertices[i].co.z >= -.15:
            continue
        ranked = sorted(skin[i].items(), key=lambda pair: -pair[1])
        cutoff = ranked[4][1] if len(ranked) > 4 else 0.
        weights = [(g, max(0., w-cutoff)) for g, w in ranked[:4]]
        total = sum(w for _, w in weights)
        for group in body.vertex_groups:
            group.remove([i])
        for g, w in weights:
            if w:
                body.vertex_groups[g].add([i], w / total, 'REPLACE')
        changed += 1
    return changed

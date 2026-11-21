"""Deterministic local diffuse visibility; Blender mathutils only, no scene edits."""
import math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def bake_visibility(vertices, normals, indices, uv=None, alpha=None, opacity=1., samples=32, radius_fraction=.12, groups=None):
    if samples < 8:
        raise ValueError('At least eight samples required')
    hemisphere=[]
    for i in range(samples):
        r=math.sqrt((i+.5)/samples)
        angle=i*math.pi*(3-math.sqrt(5))
        hemisphere.append((r*math.cos(angle),r*math.sin(angle),math.sqrt(1-r*r)))
    vectors = [Vector(v) for v in vertices]
    tree = BVHTree.FromPolygons(vectors, indices.tolist(), all_triangles=True)
    extent = float(np.linalg.norm(np.ptp(vertices, axis=0)))
    radius, epsilon = max(.01, extent * radius_fraction), max(.00001, extent * .0001)
    def blocks(origin, direction, group):
        remaining = radius
        # Alpha-cutout traversal. Cap pathological stacks conservatively;
        # max-layer counters make such inputs visible in the report.
        for _ in range(32):
            hit, _, face, distance = tree.ray_cast(origin, direction, remaining)
            if hit is None:
                return False
            opaque = groups is None or np.any(groups[indices[face]] == group)
            if opaque and alpha is not None:
                ids = indices[face]
                v0, v1, v2 = (vectors[int(j)] for j in ids)
                e0, e1, delta = v1-v0, v2-v0, hit-v0
                d00, d01, d11 = e0.dot(e0), e0.dot(e1), e1.dot(e1)
                denominator = d00*d11-d01*d01
                if abs(denominator) > 1e-16:
                    u = (d11*delta.dot(e0)-d01*delta.dot(e1))/denominator
                    v = (d00*delta.dot(e1)-d01*delta.dot(e0))/denominator
                    coord = uv[ids[0]]*(1-u-v)+uv[ids[1]]*u+uv[ids[2]]*v
                    # Native textures use flipY=false and ClampToEdgeWrapping.
                    x = min(alpha.shape[1]-1, max(0, int(float(coord[0])*alpha.shape[1])))
                    y = min(alpha.shape[0]-1, max(0, int(float(coord[1])*alpha.shape[0])))
                    opaque = alpha[y, x] * opacity >= .35
            if opaque:
                return True
            remaining -= distance + epsilon
            if remaining <= 0:
                return False
            origin = hit + direction * epsilon
        stats['traversalLimit'] += 1
        return True
    stats = {'traversalLimit': 0, 'invalidNormals': 0}
    values = np.empty(len(vertices), dtype=np.uint8)
    shared = {}
    for i, position in enumerate(vectors):
        normal = Vector(normals[i])
        if normal.length_squared < 1e-12:
            stats['invalidNormals'] += 1
            values[i] = 255
            continue
        normal.normalize()
        vertex_key = tuple(position) + tuple(normal) + (() if groups is None else (int(groups[i]),))
        if vertex_key in shared:
            values[i] = shared[vertex_key]
            continue
        axis = Vector((0,1,0)) if abs(normal.y) < .95 else Vector((1,0,0))
        tangent = normal.cross(axis).normalized()
        bitangent = normal.cross(tangent)
        origin = position + normal*epsilon
        blocked = sum(blocks(origin, tangent*x+bitangent*y+normal*z, None if groups is None else groups[i]) for x,y,z in hemisphere)
        values[i] = round(255*(1-blocked/samples))
        shared[vertex_key] = int(values[i])
    return values, radius, stats

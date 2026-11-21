"""Correct exposed downward roof faces on the supplied, normalized Sahelian copy.

This is deliberately asset-specific. UV seams and authored split normals elsewhere
are preserved. No welding, new cap geometry, or global normal recalculation.
"""
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def repair_roof(mesh):
    tree = BVHTree.FromPolygons([v.co for v in mesh.vertices],
                               [list(p.vertices) for p in mesh.polygons])
    faces = set()
    # Inspected roof band in the 9 m tall normalized source. Ignore lower floors,
    # vertical walls, towers, and faces occluded by the upper roof surface.
    for ix in range(221):
        for iy in range(171):
            point, normal, index, _ = tree.ray_cast(
                Vector((-5.5 + ix * .05, -3.5 + iy * .05, 10)), Vector((0, 0, -1)))
            if point is not None and 4 < point.z < 4.8 and normal.z < -.1:
                faces.add(index)
    if len(faces) != 77:
        raise RuntimeError(f'Sahelian roof input changed: expected 77 exposed backfaces, got {len(faces)}')
    normals = [{mesh.loops[i].vertex_index: mesh.corner_normals[i].vector.copy()
                for i in p.loop_indices} for p in mesh.polygons]
    uv = [{mesh.loops[i].vertex_index: mesh.uv_layers.active.data[i].uv.copy()
           for i in p.loop_indices} for p in mesh.polygons]
    for index in faces:
        mesh.polygons[index].flip()
    mesh.update()
    custom = [None] * len(mesh.loops)
    for polygon in mesh.polygons:
        for i in polygon.loop_indices:
            vertex = mesh.loops[i].vertex_index
            # Several authored corner normals oppose even the original face winding.
            # Rebuild only corrected roof corners from their outward surface normal.
            custom[i] = polygon.normal.copy() if polygon.index in faces else normals[polygon.index][vertex]
            mesh.uv_layers.active.data[i].uv = uv[polygon.index][vertex]
    mesh.normals_split_custom_set(custom)
    mesh.update()
    return {'reorientedFaces': len(faces), 'faceIndices': sorted(faces),
            'addedFaces': 0, 'movedVertices': 0, 'uvChanged': False}

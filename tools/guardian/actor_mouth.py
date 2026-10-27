"""Localized lip seam authoring; preserves UVs and interpolates skin weights."""
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def split_lip_seam(mesh,z=1.385):
 bm=bmesh.new();bm.from_mesh(mesh.data);world=mesh.matrix_world.copy();inv=world.inverted()
 for v in bm.verts:v.co=world@v.co
 tree=BVHTree.FromBMesh(bm)
 faces=[f for f in bm.faces if abs(f.calc_center_median().x)<.17 and f.calc_center_median().y<-.5 and 1.32<f.calc_center_median().z<1.44]
 edges={e for f in faces for e in f.edges};verts={v for f in faces for v in f.verts}
 result=bmesh.ops.bisect_plane(bm,geom=list(verts)+list(edges)+faces,dist=1e-6,plane_co=Vector((0,0,z)),plane_no=Vector((0,0,1)))
 cut=[e for e in result['geom_cut'] if isinstance(e,bmesh.types.BMEdge) and e.is_valid]
 segments=[]
 for e in cut:
  mid=(e.verts[0].co+e.verts[1].co)*.5
  hit,normal,index,d=tree.ray_cast(Vector((mid.x,-3,z)),Vector((0,1,0)))
  if hit is not None and abs(hit.y-mid.y)<.012:segments.append((tuple(e.verts[0].co),tuple(e.verts[1].co)))
 bmesh.ops.split_edges(bm,edges=cut)
 bm.verts.ensure_lookup_table();bm.verts.index_update()
 lower={v.index for v in bm.verts if abs(v.co.z-z)<1e-5 and v.link_faces and all(f.calc_center_median().z<z+1e-6 for f in v.link_faces)}
 for v in bm.verts:v.co=inv@v.co
 bm.to_mesh(mesh.data);bm.free();mesh.data.update();return lower,segments

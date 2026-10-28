"""Local rhino subnasal lip incision; diagnostic candidate, no oral interior yet."""
import argparse, bisect, hashlib, json, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector, Matrix

p=argparse.ArgumentParser()
for name in ['input','source-glb','landmarks','output']:p.add_argument('--'+name,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
assert hashlib.sha256(Path(a.source_glb).read_bytes()).hexdigest()=='e77e4a48a6d072d58420575e0e58b3545e8f4eb5d8ea54f4a7f38819e93f1cff'
assert Path(a.input).resolve()!=Path(a.output).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(a.input).resolve()))
mesh=bpy.data.objects['Mesh_0'];assert not mesh.data.shape_keys
world=mesh.matrix_world.copy();inverse=world.inverted()
# Calibrated below nostrils, above the chin silhouette; candidate must be inspected.
profile=[(-.86,2.315),(-.75,2.315),(-.65,2.32),(-.56,2.32),(-.48,2.34)]

def lip(y):
    j=max(1,min(len(profile)-1,bisect.bisect_right([p[0] for p in profile],y)))
    l,r=profile[j-1],profile[j];return l[1]+(r[1]-l[1])*(y-l[0])/(r[0]-l[0])
def smooth(l,r,x):
    t=max(0,min(1,(x-l)/(r-l)));return t*t*(3-2*t)
bm=bmesh.new();bm.from_mesh(mesh.data)
normals=bm.loops.layers.float_vector.new('authoredNormal')
for face,polygon in zip(bm.faces,mesh.data.polygons):
    for loop,index in zip(face.loops,polygon.loop_indices):loop[normals]=mesh.data.corner_normals[index].vector
for v in bm.verts:v.co=world@v.co
def local(v):return abs(v.co.x)<.22 and -.87<v.co.y<-.47 and 2.18<v.co.z<2.44
bmesh.ops.remove_doubles(bm,verts=[v for v in bm.verts if local(v)],dist=1e-5)
def region():
    return [f for f in bm.faces if all(local(v) for v in f.verts)]
def geom(faces):return list({v for f in faces for v in f.verts})+list({e for f in faces for e in f.edges})+faces
for y,z in profile[1:-1]:bmesh.ops.bisect_plane(bm,geom=geom(region()),dist=1e-7,plane_co=(0,y,0),plane_no=(0,1,0))
for l,r in zip(profile,profile[1:]):
    faces=[f for f in region() if l[0]-1e-6<f.calc_center_median().y<r[0]+1e-6]
    bmesh.ops.bisect_plane(bm,geom=geom(faces),dist=1e-7,plane_co=(0,l[0],l[1]),plane_no=(0,-(r[1]-l[1])/(r[0]-l[0]),1))
bmesh.ops.remove_doubles(bm,verts=[v for v in bm.verts if local(v)],dist=1e-6)
lower=bm.faces.layers.int.new('lowerJaw')
for f in bm.faces:f[lower]=int(sum(v.co.z-lip(v.co.y) for v in f.verts)<-1e-7)
seam=[e for e in bm.edges if len(e.link_faces)==2 and all(local(v) for v in e.verts) and e.link_faces[0][lower]!=e.link_faces[1][lower]]
assert seam,'No local mouth seam'
segments=[[list(v.co) for v in e.verts] for e in seam]
bmesh.ops.split_edges(bm,edges=seam)
bm.verts.ensure_lookup_table();bm.verts.index_update();weights=[]
for v in bm.verts:
    point=v.co
    allowed=bool(v.link_faces) and all(f[lower] for f in v.link_faces)
    weight=float(allowed)*smooth(2.12,2.21,point.z)*(1-smooth(-.60,-.48,point.y))*(1-smooth(.16,.22,abs(point.x)))
    weights.append(weight);v.co=inverse@point
corner_normals=[tuple(loop[normals].normalized()) for f in bm.faces for loop in f.loops]
bm.to_mesh(mesh.data);bm.free();mesh.data.update();mesh.data.normals_split_custom_set(corner_normals)
mesh.shape_key_add(name='Basis');key=mesh.shape_key_add(name='mouthOpen')
pivot=Vector((0,-.48,2.34));rotation=Matrix.Rotation(.24,3,'X')
for v,dest in zip(mesh.data.vertices,key.data):
    point=world@v.co;dest.co=inverse@point.lerp(pivot+rotation@(point-pivot),weights[v.index])
output=Path(a.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output),compress=True)
bpy.ops.export_scene.gltf(filepath=str(output.with_suffix('.glb')),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_source_animations import restore
restore(a.source_glb,output.with_suffix('.glb'))
output.with_suffix('.json').write_text(json.dumps({'status':'jaw-only candidate, missing interior; not installed','profile':profile,'seam':segments,'movingVertices':sum(w>0 for w in weights),'vertices':len(weights),'pivot':list(pivot),'angle':.24,'sourceSkinning':'retained; new incision vertices interpolate original weights'},indent=2),encoding='utf-8')

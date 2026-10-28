"""Local Kofi lip-seam incision; diagnostic candidate, no oral interior yet."""
import argparse, bisect, hashlib, json, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector, Matrix

p=argparse.ArgumentParser()
for name in ['input','source-glb','landmarks','output']:p.add_argument('--'+name,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
assert hashlib.sha256(Path(a.source_glb).read_bytes()).hexdigest()=='a748ca0cea0d4d0d4abd95071577a8457e63f22433e618be77934c079f4cf89c'
assert Path(a.input).resolve()!=Path(a.output).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(a.input).resolve()))
mesh=bpy.data.objects['Mesh0'];assert not mesh.data.shape_keys
world=mesh.matrix_world.copy();inverse=world.inverted()
# Front-view dark lip seam, checked against side/quarter closeups.
landmarks=json.loads(Path(a.landmarks).read_text(encoding='utf-8'))['landmarks']
points=sorted([r['position'] for r in landmarks if r['name'].startswith('lip-') and r.get('hit')])
assert len(points)==5,'Expected five calibrated lip landmarks'
profile=[(v[0],v[2]) for v in points]
def lip(x):
    j=max(1,min(len(profile)-1,bisect.bisect_right([p[0] for p in profile],x)))
    l,r=profile[j-1],profile[j];return l[1]+(r[1]-l[1])*(x-l[0])/(r[0]-l[0])

def smooth(l,r,x):
    t=max(0,min(1,(x-l)/(r-l)));return t*t*(3-2*t)
bm=bmesh.new();bm.from_mesh(mesh.data)
normals=bm.loops.layers.float_vector.new('authoredNormal')
for face,polygon in zip(bm.faces,mesh.data.polygons):
    for loop,index in zip(face.loops,polygon.loop_indices):loop[normals]=mesh.data.corner_normals[index].vector
for v in bm.verts:v.co=world@v.co
def local(v):return abs(v.co.x)<.105 and -.28<v.co.y<-.185 and 1.18<v.co.z<1.28
bmesh.ops.remove_doubles(bm,verts=[v for v in bm.verts if local(v)],dist=1e-5)
def region():
    return [f for f in bm.faces if all(local(v) for v in f.verts)]
def geom(faces):return list({v for f in faces for v in f.verts})+list({e for f in faces for e in f.edges})+faces
for x,z in profile[1:-1]:bmesh.ops.bisect_plane(bm,geom=geom(region()),dist=1e-7,plane_co=(x,0,0),plane_no=(1,0,0))
for l,r in zip(profile,profile[1:]):
    faces=[f for f in region() if l[0]-1e-6<f.calc_center_median().x<r[0]+1e-6]
    bmesh.ops.bisect_plane(bm,geom=geom(faces),dist=1e-7,plane_co=(l[0],0,l[1]),plane_no=(-(r[1]-l[1])/(r[0]-l[0]),0,1))
bmesh.ops.remove_doubles(bm,verts=[v for v in bm.verts if local(v)],dist=1e-6)
lower=bm.faces.layers.int.new('lowerJaw')
for f in bm.faces:f[lower]=int(sum(v.co.z-lip(v.co.x) for v in f.verts)<-1e-7)
seam=[e for e in bm.edges if len(e.link_faces)==2 and all(local(v) for v in e.verts) and e.link_faces[0][lower]!=e.link_faces[1][lower]]
assert seam,'No local mouth seam'
# Round only the incision contour; preserve the surrounding authored surface.
# Smooth before splitting so the neutral upper and lower lips still coincide.
neighbors={}
for edge in seam:
    l,r=edge.verts;neighbors.setdefault(l,[]).append(r);neighbors.setdefault(r,[]).append(l)
for _ in range(1):
    moves={v:v.co.lerp((ns[0].co+ns[1].co)*.5,.35) for v,ns in neighbors.items() if len(ns)==2}
    for v,co in moves.items():
        delta=co-v.co
        if delta.length>.001:delta*=.001/delta.length
        v.co+=delta
segments=[[list(v.co) for v in e.verts] for e in seam]
bmesh.ops.split_edges(bm,edges=seam)
bm.verts.ensure_lookup_table();bm.verts.index_update();weights=[]
for v in bm.verts:
    point=v.co
    allowed=bool(v.link_faces) and all(f[lower] for f in v.link_faces)
    weight=float(allowed)*smooth(1.13,1.19,point.z)*(1-smooth(-.23,-.185,point.y))*(1-smooth(.06,.095,abs(point.x)))
    weights.append(weight);v.co=inverse@point
corner_normals=[tuple(loop[normals].normalized()) for f in bm.faces for loop in f.loops]
bm.to_mesh(mesh.data);bm.free();mesh.data.update();mesh.data.normals_split_custom_set(corner_normals)
mesh.shape_key_add(name='Basis');key=mesh.shape_key_add(name='mouthOpen')
pivot=Vector((0,-.15,1.25));rotation=Matrix.Rotation(.30,3,'X')
for v,dest in zip(mesh.data.vertices,key.data):
    point=world@v.co;dest.co=inverse@point.lerp(pivot+rotation@(point-pivot),weights[v.index])
output=Path(a.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output),compress=True)
bpy.ops.export_scene.gltf(filepath=str(output.with_suffix('.glb')),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False)
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_source_animations import restore
restore(a.source_glb,output.with_suffix('.glb'))
output.with_suffix('.json').write_text(json.dumps({'status':'jaw-only candidate, missing interior; not installed','profile':profile,'seam':segments,'movingVertices':sum(w>0 for w in weights),'vertices':len(weights),'pivot':list(pivot),'angle':.30,'sourceSkinning':'retained; new incision vertices interpolate original weights'},indent=2),encoding='utf-8')

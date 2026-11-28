"""Uninstalled jaw-motion candidate using the original lateral mouth opening.
No new incision, teeth, cavity or alteration to the original UV/topology.
"""
import argparse,hashlib,json,sys
from pathlib import Path
import bpy,bmesh
from mathutils import Vector,Matrix
from mathutils.kdtree import KDTree
sys.path.insert(0,str(Path(__file__).resolve().parent));sys.setrecursionlimit(20000)
from actor_components import biconnected_regions
from warthog_jaw_profile import lower_weight
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True)
p.add_argument('--source-glb',help='Export GLB and restore animation channels from this original source')
p.add_argument('--oral-cavity',action='store_true')
p.add_argument('--hollow-interior',action='store_true',help='Remove recessed native pocket walls before adding anatomy')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
assert Path(a.input).resolve()!=Path(a.output).resolve()
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
obj=bpy.data.objects['Mesh_0'];world=obj.matrix_world.copy();inverse=world.inverted()
assert len(obj.data.vertices)==16597,'Only calibrated to original warthog topology'
assert not obj.data.shape_keys,'Jaw already authored'
bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-5)
regions=biconnected_regions(bm);teeth=[];head=[];selected=[]
for part in regions:
    points=[world@v.co for v in part]
    lo=[min(v[i] for v in points) for i in range(3)];hi=[max(v[i] for v in points) for i in range(3)]
    if 90<len(part)<200 and lo[2]>1.3 and hi[2]<1.85:
        teeth+=points;selected.append({'vertices':len(part),'min':lo,'max':hi})
    if len(part)>2000 and lo[2]>1:head=points
assert len(selected)==4 and head,'Four native tusks and head region required'
def tree(points):
    kd=KDTree(len(points))
    for i,point in enumerate(points):kd.insert(point,i)
    kd.balance();return kd
tooth_tree=tree(teeth);head_tree=tree(head);bm.free()
removed_faces=0
if a.hollow_interior:
    assert a.oral_cavity,'Carved pocket requires replacement oral anatomy'
    edit=bmesh.new();edit.from_mesh(obj.data);normal_layer=edit.loops.layers.float_vector.new('authoredNormal')
    for face,polygon in zip(edit.faces,obj.data.polygons):
        for loop,index in zip(face.loops,polygon.loop_indices):loop[normal_layer]=obj.data.corner_normals[index].vector
    remove=[]
    for face in edit.faces:
        points=[world@v.co for v in face.verts];center=sum(points,Vector())/len(points)
        normal=(world.to_3x3()@face.normal).normalized()
        if abs(center.x)<.20 and -.58<center.y<-.29 and 1.34<center.z<1.505 and abs(normal.x)>.3:
            if all(head_tree.find(v)[2]<2e-5 for v in points) and not any(tooth_tree.find(v)[2]<2e-5 for v in points):remove.append(face)
    removed_faces=len(remove);assert removed_faces,'No recessed pocket faces selected'
    bmesh.ops.delete(edit,geom=remove,context='FACES_ONLY')
    normals=[tuple(loop[normal_layer]) for face in edit.faces for loop in face.loops]
    edit.to_mesh(obj.data);edit.free();obj.data.update();obj.data.normals_split_custom_set(normals)
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
obj.shape_key_add(name='Basis');key=obj.shape_key_add(name='mouthOpen')
pivot=Vector((0,-.25,1.43));rotation=Matrix.Rotation(.28,3,'X');weights=[]
for v,dst in zip(obj.data.vertices,key.data):
    point=world@v.co
    if tooth_tree.find(point)[2]<2e-5:weight=1
    elif head_tree.find(point)[2]<2e-5:
        # The snout overhang is upper-face geometry. Keep it stationary;
        # only the lower lip behind it and the attached beard follow the jaw.
        weight=lower_weight(point)
    else:weight=0
    weights.append(weight);dst.co=inverse@point.lerp(pivot+rotation@(point-pivot),weight)
oral=None
if a.oral_cavity:
    from warthog_oral_cavity import add_cavity
    oral=add_cavity(obj)
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
if a.source_glb:
    assert hashlib.sha256(Path(a.source_glb).read_bytes()).hexdigest()=='6d41a31b6bc7ac4163f8e484f001c7a4b7debac0fc6c93fefd3ff4a9a9fec275','Wrong animation source'
    glb=Path(a.output).with_suffix('.glb')
    bpy.ops.export_scene.gltf(filepath=str(glb.resolve()),export_format='GLB',export_animations=True,
        export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,
        export_frame_range=False,export_yup=True,export_skins=True,export_extras=True)
    from restore_source_animations import restore
    restore(a.source_glb,glb)
Path(a.output).with_suffix('.json').write_text(json.dumps({'status':'uninstalled jaw-motion experiment; cavity and dental attachment require review','removedPocketFaces':removed_faces,'oralCavity':oral,'input':a.input,'pivot':list(pivot),'angle':.28,'movingVertices':sum(w>0 for w in weights),'teeth':selected,'topology':'original lateral opening reused; optional recessed pocket carving'},indent=2))

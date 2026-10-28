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
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True)
p.add_argument('--source-glb',help='Export GLB and restore animation channels from this original source')
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
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
obj.shape_key_add(name='Basis');key=obj.shape_key_add(name='mouthOpen')
pivot=Vector((0,-.25,1.43));rotation=Matrix.Rotation(.28,3,'X');weights=[]
for v,dst in zip(obj.data.vertices,key.data):
    point=world@v.co
    if tooth_tree.find(point)[2]<2e-5:weight=1
    elif head_tree.find(point)[2]<2e-5:
        line=1.33+.05*max(0,min(1,(point.y+.65)/.35))
        # The snout overhang is upper-face geometry. Keep it stationary;
        # only the lower lip behind it and the attached beard follow the jaw.
        weight=(1-smooth(line-.015,line+.04,point.z))*smooth(-.60,-.55,point.y)*(1-smooth(-.34,-.21,point.y))
    else:weight=0
    weights.append(weight);dst.co=inverse@point.lerp(pivot+rotation@(point-pivot),weight)
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
if a.source_glb:
    assert hashlib.sha256(Path(a.source_glb).read_bytes()).hexdigest()=='6d41a31b6bc7ac4163f8e484f001c7a4b7debac0fc6c93fefd3ff4a9a9fec275','Wrong animation source'
    glb=Path(a.output).with_suffix('.glb')
    bpy.ops.export_scene.gltf(filepath=str(glb.resolve()),export_format='GLB',export_animations=True,
        export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,
        export_frame_range=False,export_yup=True,export_skins=True,export_extras=True)
    from restore_source_animations import restore
    restore(a.source_glb,glb)
Path(a.output).with_suffix('.json').write_text(json.dumps({'status':'uninstalled jaw-motion experiment; cavity and dental attachment require review','input':a.input,'pivot':list(pivot),'angle':.28,'movingVertices':sum(w>0 for w in weights),'teeth':selected,'topology':'unchanged; original lateral opening reused'},indent=2))

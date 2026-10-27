"""Author lion lids from reviewed eye contours in the neutral inspection image.

Candidate only. Coordinates reference center (0,-.18,1.67), extent .26,
768px orthographic front view from inspect_actor_face.py. Original mesh stays intact.
"""
import argparse, sys, json
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

p=argparse.ArgumentParser()
p.add_argument('--input',required=True)
p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
assert not bpy.data.objects.get('LionFacialLids')
mesh=bpy.data.objects['Mesh_0']
world=mesh.matrix_world.copy(); inv=world.inverted()
mesh.data.calc_loop_triangles(); tris=list(mesh.data.loop_triangles)
tree=BVHTree.FromPolygons([world@v.co for v in mesh.data.vertices],
    [list(t.vertices) for t in tris],all_triangles=True)
uv=mesh.data.uv_layers.active.data
center=Vector((0,-.18,1.67))
camera=center+Vector((0,-1,.05)).normalized()*.26*4
rotation=(center-camera).to_track_quat('-Z','Y')
direction=rotation@Vector((0,0,-1))
# Project base color into one continuous atlas: interpolating the original
# island UVs across newly authored polygons produces unrelated texture stripes.
original=mesh.data.materials[0]; bake=original.copy()
nodes=bake.node_tree.nodes; links=bake.node_tree.links
bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
emission=nodes.new('ShaderNodeEmission')
links.new(bs.inputs['Base Color'].links[0].from_socket,emission.inputs['Color'])
links.new(emission.outputs[0],output.inputs['Surface']);mesh.data.materials[0]=bake
rigs=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']
for rig in rigs:rig.data.pose_position='REST'
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1
scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.render.film_transparent=True
bpy.ops.object.camera_add(location=camera);cam=bpy.context.object
cam.rotation_euler=rotation.to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.26;scene.camera=cam
atlas_path=str(Path(a.output).with_suffix('.atlas.png'))
scene.render.filepath=atlas_path;bpy.ops.render.render(write_still=True)
atlas=bpy.data.images.load(atlas_path);atlas.pack()
mesh.data.materials[0]=original;bpy.data.objects.remove(cam,do_unlink=True)
for rig in rigs:rig.data.pose_position='POSE'
def sample(x,y):
    origin=camera+rotation@Vector(((x+.5)/768*.26-.13,.13-(y+.5)/768*.26,0))
    hit,normal,index,_=tree.ray_cast(origin,direction)
    if hit is None: raise ValueError('Eye contour missed source surface')
    tri=tris[index]
    coords=barycentric_transform(hit,*[world@mesh.data.vertices[i].co for i in tri.vertices],
        *[Vector((*uv[i].uv,0)) for i in tri.loops])
    return hit-direction*.0006,coords

# Asymmetric lids follow the actual slanted brows, including the outer corners.
contours={'L':[(253,450,451),(265,449,477),(280,456,489),(295,464,494),
    (310,470,494),(325,476,487),(334,480,481)],
    'R':[(495,480,481),(506,474,488),(520,466,493),(535,457,489),
    (549,449,480),(562,446,461),(566,449,450)]}
def bounds(points,x):
    for left,right in zip(points,points[1:]):
        if left[0]<=x<=right[0]:
            t=(x-left[0])/(right[0]-left[0])
            return [left[k]+t*(right[k]-left[k]) for k in (1,2)]
    raise ValueError(x)
verts=[]; faces=[]; tex=[]; metadata=[]; columns=33; rows=9
for side,points in contours.items():
    start=len(verts)
    for row in range(rows):
        t=row/(rows-1)
        for col in range(columns):
            x=points[0][0]+(points[-1][0]-points[0][0])*col/(columns-1)
            top,bottom=bounds(points,x)
            pos,_=sample(x,top-.3+t*.1)
            # Fur immediately above the eye, avoiding painted iris/black socket.
            coord=((x+.5)/768,1-(top-15-12*t+.5)/768)
            verts.append(inv@pos);tex.append(coord);metadata.append((side,x,top,bottom,t))
    for row in range(rows-1):
        for col in range(columns-1):
            i=start+row*columns+col
            faces.append((i,i+columns,i+columns+1,i+1))
data=bpy.data.meshes.new('Lion eyelid surfaces');data.from_pydata(verts,[],faces);data.update()
obj=bpy.data.objects.new('LionFacialLids',data);bpy.context.collection.objects.link(obj)
obj.matrix_world=world
material=mesh.data.materials[0].copy();material.name='Lion eyelid original fur'
bs=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for link in list(bs.inputs['Normal'].links):material.node_tree.links.remove(link)
color=material.node_tree.nodes.new('ShaderNodeTexImage');color.image=atlas
material.node_tree.links.new(color.outputs['Color'],bs.inputs['Base Color'])
data.materials.append(material)
layer=data.uv_layers.new(name='UVMap')
for face in data.polygons:
    face.use_smooth=True
    for i in face.loop_indices:layer.data[i].uv=tex[data.loops[i].vertex_index]
head=next(g.name for g in mesh.vertex_groups if g.name.replace('mixamorig:','')=='Head')
obj.vertex_groups.new(name=head).add(list(range(len(verts))),1,'REPLACE')
for mod in mesh.modifiers:
    if mod.type=='ARMATURE':obj.modifiers.new('Face skeleton','ARMATURE').object=mod.object
obj.shape_key_add(name='Basis')
for side in contours:
    for amount in (.25,.5,.75,1):
        key=obj.shape_key_add(name='blink'+side+('' if amount==1 else str(round(amount*100))))
        for i,(which,x,top,bottom,t) in enumerate(metadata):
            if which==side:key.data[i].co=inv@sample(x,top+(bottom-top)*t*amount)[0]
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
Path(a.output).with_suffix('.json').write_text(json.dumps({'status':'unvalidated eyelid candidate',
    'contours':contours,'vertices':len(verts),'faces':len(faces)},indent=2),encoding='utf-8')

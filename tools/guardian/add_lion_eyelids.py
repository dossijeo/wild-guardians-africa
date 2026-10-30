"""Author lion lids from reviewed eye contours in the neutral inspection image.

Candidate only. Coordinates reference center (0,-.18,1.67), extent .26,
768px orthographic front view from inspect_actor_face.py. Original mesh stays intact.
"""
import argparse, sys, json, math
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

p=argparse.ArgumentParser()
p.add_argument('--input',required=True)
p.add_argument('--output',required=True)
p.add_argument('--export-glb',action='store_true')
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
envelopes={}
def features(points,x,y):
    u=(x-(points[0][0]+points[-1][0])*.5)/40
    v=(y-470)/25
    return np.array([1,u,v,u*u,u*v,v*v])
for side,points in contours.items():
    samples=[];depths=[]
    for x in np.linspace(points[0][0],points[-1][0],49):
        top,bottom=bounds(points,x)
        for y in np.linspace(top,bottom,17):
            point,_=sample(x,y)
            samples.append(features(points,x,y));depths.append((point-camera).dot(direction))
    matrix=np.array(samples);depths=np.array(depths)
    coefficients=np.linalg.lstsq(matrix,depths,rcond=None)[0]
    # Shift the smooth surface toward the camera enough to clear every sampled
    # source triangle. Do not follow individual eye facets into the lid.
    clearance=float(max(0,np.max(matrix@coefficients-depths)))
    coefficients[0]-=clearance
    envelopes[side]=(coefficients,clearance)
def envelope(side,x,y):
    origin=camera+rotation@Vector(((x+.5)/768*.26-.13,.13-(y+.5)/768*.26,0))
    smooth=origin+direction*float(features(contours[side],x,y)@envelopes[side][0])
    points=contours[side];top,bottom=bounds(points,x)
    u=(x-points[0][0])/(points[-1][0]-points[0][0])
    v=max(0,min(1,(y-top)/max(.01,bottom-top)))
    blend=max(0,math.sin(math.pi*u)*math.sin(math.pi*v))**.35
    actual=sample(x,y)[0]+direction*.00035
    return actual.lerp(smooth,blend)
verts=[]; faces=[]; tex=[]; metadata=[]; columns=33; rows=9
for side,points in contours.items():
    start=len(verts)
    for row in range(rows):
        t=row/(rows-1)
        for col in range(columns):
            x=points[0][0]+(points[-1][0]-points[0][0])*col/(columns-1)
            top,bottom=bounds(points,x)
            pos=envelope(side,x,top-.3+t*.1)
            # Reviewed clean fur on the nasal bridge. The brow itself includes
            # dark socket paint and white markings which looked like creases
            # when projected onto the closed lid.
            coord=((375+50*col/(columns-1)+.5)/768,1-(510+30*t+.5)/768)
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
tone=material.node_tree.nodes.new('ShaderNodeMixRGB');tone.blend_type='MULTIPLY'
tone.inputs[0].default_value=1;tone.inputs[2].default_value=(.6,.6,.6,1)
material.node_tree.links.new(color.outputs['Color'],tone.inputs[1])
material.node_tree.links.new(tone.outputs[0],bs.inputs['Base Color'])
data.materials.append(material)
layer=data.uv_layers.new(name='UVMap')
for face in data.polygons:
    face.use_smooth=True
    for i in face.loop_indices:layer.data[i].uv=tex[data.loops[i].vertex_index]
head=next(g.name for g in mesh.vertex_groups if g.name.replace('mixamorig:','')=='Head')
# Source eyelid/iris vertices inherit some Neck rotation. A rigid new lid
# otherwise separates from them during Running even when neutral looks closed.
# Restrict correction to visible facial skin around the reviewed contours,
# with a 20px transition; do not touch back-of-head or overlapping mane sheets.
head_index=mesh.vertex_groups[head].index; skin_changes=[]
inverse_camera=rotation.inverted()
for vertex in mesh.data.vertices:
    point=world@vertex.co;view=inverse_camera@(point-camera)
    px=(view.x/.26+.5)*768-.5;py=(.5-view.y/.26)*768-.5
    weight=0
    for points in contours.values():
        left=points[0][0]-5;right=points[-1][0]+5
        top=min(p[1] for p in points)-5;bottom=max(p[2] for p in points)+5
        distance=max(left-px,px-right,top-py,py-bottom,0)
        t=max(0,1-distance/20);weight=max(weight,t*t*(3-2*t))
    if not weight:continue
    hit,_=sample(px,py)
    if (point-hit).length>.004:continue
    old={g.group:g.weight for g in vertex.groups}
    if old.get(head_index,0)>.999999:continue
    values={i:w*(1-weight) for i,w in old.items()}
    values[head_index]=values.get(head_index,0)+weight
    for index in old:mesh.vertex_groups[index].remove([vertex.index])
    for index,w in values.items():
        if w>1e-7:mesh.vertex_groups[index].add([vertex.index],w,'REPLACE')
    skin_changes.append({'vertex':vertex.index,'position':list(point),'blend':weight})
obj.vertex_groups.new(name=head).add(list(range(len(verts))),1,'REPLACE')
for mod in mesh.modifiers:
    if mod.type=='ARMATURE':obj.modifiers.new('Face skeleton','ARMATURE').object=mod.object
obj.shape_key_add(name='Basis')
for side in contours:
    for amount in (.25,.5,.75,1):
        key=obj.shape_key_add(name='blink'+side+('' if amount==1 else str(round(amount*100))))
        for i,(which,x,top,bottom,t) in enumerate(metadata):
            if which==side:key.data[i].co=inv@envelope(side,x,top+(bottom-top)*t*amount)
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
if a.export_glb:
    bpy.ops.export_scene.gltf(filepath=str(Path(a.output).with_suffix('.glb').resolve()),
        export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',
        export_nla_strips=True,export_force_sampling=True,export_frame_range=False,
        export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)
Path(a.output).with_suffix('.json').write_text(json.dumps({'status':'unvalidated eyelid candidate',
    'contours':contours,'vertices':len(verts),'faces':len(faces),
    'eyeSkinning':skin_changes,
    'envelopeClearance':{side:value[1] for side,value in envelopes.items()}},indent=2),encoding='utf-8')

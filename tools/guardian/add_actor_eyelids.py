"""Candidate eyelid authoring from per-actor reviewed orthographic contours.
Derived from add_lion_eyelids; requires explicit camera and fur-patch calibration.
"""
import argparse, sys, json, math, hashlib
from pathlib import Path
import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

p=argparse.ArgumentParser()
p.add_argument('--input',required=True)
p.add_argument('--profile',required=True)
p.add_argument('--output',required=True)
p.add_argument('--export-glb',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
profile=json.loads(Path(a.profile).read_text(encoding='utf-8'))
if a.input.endswith('.glb') and profile.get('sourceSha256'):
    assert hashlib.sha256(Path(a.input).read_bytes()).hexdigest()==profile['sourceSha256'], 'Profile belongs to another source topology'
if a.input.endswith('.blend'):bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(Path(a.input).resolve()))
assert not bpy.data.objects.get('ActorFacialLids')
mesh=bpy.data.objects['Mesh_0']
world=mesh.matrix_world.copy(); inv=world.inverted()
mesh.data.calc_loop_triangles(); tris=list(mesh.data.loop_triangles)
tree=BVHTree.FromPolygons([world@v.co for v in mesh.data.vertices],
    [list(t.vertices) for t in tris],all_triangles=True)
uv=mesh.data.uv_layers.active.data
center=Vector(profile['center']);extent=profile['extent']
camera=center+Vector((0,-1,.05)).normalized()*extent*4
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
cam.rotation_euler=rotation.to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;scene.camera=cam
atlas_path=str(Path(a.output).with_suffix('.atlas.png'))
scene.render.filepath=atlas_path;bpy.ops.render.render(write_still=True)
atlas=bpy.data.images.load(atlas_path);atlas.pack()
mesh.data.materials[0]=original;bpy.data.objects.remove(cam,do_unlink=True)
for rig in rigs:rig.data.pose_position='POSE'
def sample(x,y):
    origin=camera+rotation@Vector(((x+.5)/768*extent-extent/2,extent/2-(y+.5)/768*extent,0))
    hit,normal,index,_=tree.ray_cast(origin,direction)
    if hit is None: raise ValueError('Eye contour missed source surface')
    tri=tris[index]
    coords=barycentric_transform(hit,*[world@mesh.data.vertices[i].co for i in tri.vertices],
        *[Vector((*uv[i].uv,0)) for i in tri.loops])
    return hit-direction*.0006,coords

# Asymmetric lids follow the actual slanted brows, including the outer corners.
contours=profile['contours']

def bounds(points,x):
    for left,right in zip(points,points[1:]):
        if left[0]<=x<=right[0]:
            t=(x-left[0])/(right[0]-left[0])
            return [left[k]+t*(right[k]-left[k]) for k in (1,2)]
    raise ValueError(x)
envelopes={}
eye_spheres={}
if profile.get('eyeCenters'):
    bm=bmesh.new();bm.from_mesh(mesh.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-5)
    unseen=set(bm.verts);components=[]
    while unseen:
        pending=[unseen.pop()];part=[]
        while pending:
            vertex=pending.pop();part.append(world@vertex.co)
            for edge in vertex.link_edges:
                neighbor=edge.other_vert(vertex)
                if neighbor in unseen:unseen.remove(neighbor);pending.append(neighbor)
        if 30<=len(part)<=150:components.append(part)
    for side,expected in profile['eyeCenters'].items():
        part=min(components,key=lambda points:(sum(points,Vector())/len(points)-Vector(expected)).length)
        data=np.array([list(v) for v in part]);matrix=np.column_stack((2*data,np.ones(len(data))))
        fit=np.linalg.lstsq(matrix,np.sum(data*data,axis=1),rcond=None)[0]
        center_eye=Vector(fit[:3]);radius=max((v-center_eye).length for v in part)+.0015
        if (center_eye-Vector(expected)).length>.03:raise ValueError('Eye component calibration mismatch')
        eye_spheres[side]=(center_eye,radius)
    bm.free()
# Connected eye meshes cannot be isolated by welded component. Fit only
# explicitly reviewed visible eye samples, never the surrounding brow.
for side,pixels in profile.get('eyeSurfaceSamples',{}).items():
    points=[sample(x,y)[0] for x,y in pixels]
    data=np.array([list(v) for v in points]);matrix=np.column_stack((2*data,np.ones(len(data))))
    fit=np.linalg.lstsq(matrix,np.sum(data*data,axis=1),rcond=None)[0]
    center_eye=Vector(fit[:3]);radius=max((v-center_eye).length for v in points)+.0015
    if not .005<radius<.08:raise ValueError('Sampled eye sphere radius outside facial bounds')
    eye_spheres[side]=(center_eye,radius)

def features(points,x,y):
    u=(x-(points[0][0]+points[-1][0])*.5)/max(1,(points[-1][0]-points[0][0])*.5)
    v=(y-sum(p[1]+p[2] for p in points)/(2*len(points)))/max(1,max(p[2]-p[1] for p in points))
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
    origin=camera+rotation@Vector(((x+.5)/768*extent-extent/2,extent/2-(y+.5)/768*extent,0))
    if side in eye_spheres:
        center_eye,radius=eye_spheres[side];offset=origin-center_eye
        along=offset.dot(direction);discriminant=along*along-offset.length_squared+radius*radius
        # Extend the curved skin under the surrounding brow at its silhouette.
        depth=-along-math.sqrt(max(.000001,discriminant))
        return origin+direction*depth
    smooth=origin+direction*float(features(contours[side],x,y)@envelopes[side][0])
    points=contours[side];top,bottom=bounds(points,x)
    u=(x-points[0][0])/(points[-1][0]-points[0][0])
    v=max(0,min(1,(y-top)/max(.01,bottom-top)))
    blend=max(0,math.sin(math.pi*u)*math.sin(math.pi*v))**.35
    actual=sample(x,y)[0]-direction*profile.get('edgeClearance',.001)
    result=actual.lerp(smooth,blend)
    # Interpolation must never put the lid behind the sampled eyeball.
    depth=(result-actual).dot(direction)
    if depth>0:result-=direction*depth
    return result
verts=[]; faces=[]; tex=[]; metadata=[]; columns=profile.get('columns',65); rows=profile.get('rows',17)
def spherical_lid(side,column,row,amount):
    c,r=eye_spheres[side];phi=column*math.tau
    # Linear GLB morph interpolation follows chords, not the sphere. Bound
    # the sagitta between quarter-step correctives at each latitude so even
    # their midpoint stays outside the native eye (no runtime correction).
    r/=math.cos(row*(math.pi-.052)/8)
    # A small hidden cap at rest keeps triangles non-degenerate and gives
    # exported morph normals a valid basis instead of a collapsed point.
    theta=.001+row*(.05+amount*(math.pi-.052))
    return c+Vector((r*math.sin(theta)*math.cos(phi),r*math.sin(theta)*math.sin(phi),r*math.cos(theta)))
for side,points in contours.items():
    start=len(verts)
    for row in range(rows):
        t=row/(rows-1)
        for col in range(columns):
            x=points[0][0]+(points[-1][0]-points[0][0])*col/(columns-1)
            top,bottom=bounds(points,x)
            pos=spherical_lid(side,col/(columns-1),t,0) if side in eye_spheres else envelope(side,x,top-.3+t*.1)
            # Reviewed clean fur on the nasal bridge. The brow itself includes
            # dark socket paint and white markings which looked like creases
            # when projected onto the closed lid.
            tx,ty,tw,th=profile['furPatch'];coord=((tx+tw*col/(columns-1)+.5)/768,1-(ty+th*t+.5)/768)
            verts.append(inv@pos);tex.append(coord);metadata.append((side,x,top,bottom,t))
    for row in range(rows-1):
        for col in range(columns-1):
            i=start+row*columns+col
            faces.append((i,i+columns,i+columns+1,i+1))
data=bpy.data.meshes.new('Actor eyelid surfaces');data.from_pydata(verts,[],faces);data.update()
obj=bpy.data.objects.new('ActorFacialLids',data);bpy.context.collection.objects.link(obj)
obj.matrix_world=world
material=mesh.data.materials[0].copy();material.name='Actor eyelid original fur'
bs=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for channel in ('Normal','Metallic','Roughness'):
    for link in list(bs.inputs[channel].links):material.node_tree.links.remove(link)
bs.inputs['Metallic'].default_value=0
bs.inputs['Roughness'].default_value=profile.get('roughness',.95)
color=material.node_tree.nodes.new('ShaderNodeTexImage');color.image=atlas
tone=material.node_tree.nodes.new('ShaderNodeMixRGB');tone.blend_type='MULTIPLY'
tone.inputs[0].default_value=1;tone.inputs[2].default_value=(*([profile.get('tone',1)]*3),1)
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
for vertex in ([] if profile.get('surfaceSkinning') else mesh.data.vertices):
    point=world@vertex.co;view=inverse_camera@(point-camera)
    px=(view.x/extent+.5)*768-.5;py=(.5-view.y/extent)*768-.5
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
surface_bindings=[]
if profile.get('surfaceSkinning'):
    for group in mesh.vertex_groups:obj.vertex_groups.new(name=group.name)
    for i,(side,x,top,bottom,t) in enumerate(metadata):
        point=spherical_lid(side,(i%columns)/(columns-1),t,1) if side in eye_spheres else envelope(side,x,top+(bottom-top)*t)
        hit,_,index,_=tree.find_nearest(point)
        if hit is None:raise ValueError('Cannot bind eyelid to source surface')
        triangle=tris[index]
        bary=barycentric_transform(hit,*[world@mesh.data.vertices[v].co for v in triangle.vertices],
            Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
        weights={}
        for vertex,factor in zip(triangle.vertices,bary):
            for group in mesh.data.vertices[vertex].groups:
                weights[group.group]=weights.get(group.group,0)+max(0,factor)*group.weight
        strongest=sorted(weights.items(),key=lambda pair:pair[1],reverse=True)[:4]
        total=sum(w for _,w in strongest)
        if total<=0:raise ValueError('Source surface has no skin weights')
        for group,w in strongest:obj.vertex_groups[group].add([i],w/total,'REPLACE')
        surface_bindings.append({'vertex':i,'triangle':index,'distance':(point-hit).length})
else:
    obj.vertex_groups.new(name=head).add(list(range(len(verts))),1,'REPLACE')
for mod in mesh.modifiers:
    if mod.type=='ARMATURE':obj.modifiers.new('Face skeleton','ARMATURE').object=mod.object
obj.shape_key_add(name='Basis')
for side in contours:
    for amount in (.25,.5,.75,1):
        key=obj.shape_key_add(name='blink'+side+('' if amount==1 else str(round(amount*100))))
        for i,(which,x,top,bottom,t) in enumerate(metadata):
            if which==side:
                column=(i%columns)/(columns-1)
                point=spherical_lid(side,column,t,amount) if side in eye_spheres else envelope(side,x,top+(bottom-top)*t*amount)
                key.data[i].co=inv@point
        # Vertex clearance alone misses narrow eyeball facets between grid
        # vertices. Check triangle interiors before export and move only their
        # incident vertices, preserving the shared corrective topology.
        for iteration in range(0 if side in eye_spheres else 3):
            shifts={}
            for face in faces:
                if metadata[face[0]][0]!=side:continue
                for triangle in ((face[0],face[1],face[2]),(face[0],face[2],face[3])):
                    pts=[world@key.data[i].co for i in triangle]
                    for weights in ((u/6,v/6,1-(u+v)/6) for u in range(7) for v in range(7-u)):
                        point=sum((v*w for v,w in zip(pts,weights)),Vector())
                        hit,_,_,_=tree.ray_cast(point-direction*extent*4,direction)
                        if hit is None:continue
                        deficit=(point-hit).dot(direction)+.0012
                        if deficit>0:
                            for i in triangle:shifts[i]=max(shifts.get(i,0),deficit)
            if not shifts:break
            for i,shift in shifts.items():key.data[i].co=inv@(world@key.data[i].co-direction*shift)
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
if a.export_glb:
    bpy.ops.export_scene.gltf(filepath=str(Path(a.output).with_suffix('.glb').resolve()),
        export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',
        export_nla_strips=True,export_force_sampling=True,export_frame_range=False,
        export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)
    # Geometry editing must not resample or shift the original animation clocks.
    if Path(a.input).suffix.lower()=='.glb':
        sys.path.insert(0,str(Path(__file__).resolve().parent))
        from restore_source_animations import restore
        restore(a.input,Path(a.output).with_suffix('.glb'))
Path(a.output).with_suffix('.json').write_text(json.dumps({'status':'unvalidated eyelid candidate',
    'profile':profile,'contours':contours,'vertices':len(verts),'faces':len(faces),
    'eyeSpheres':{side:{'center':list(c),'radius':r} for side,(c,r) in eye_spheres.items()},
    'eyeSkinning':skin_changes,'surfaceBindings':surface_bindings,
    'envelopeClearance':{side:value[1] for side,value in envelopes.items()}},indent=2),encoding='utf-8')

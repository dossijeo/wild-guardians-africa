import bpy,json,math
from pathlib import Path
root=Path(__file__).resolve().parents[2]
d=json.loads((root/'tools/experiments/fern-composite-source-20261023.json').read_text())
out=root/'public/assets/visual-lab/fern-composite-lod-20261023';out.mkdir(parents=True,exist_ok=True)
source=root/'public/assets/visual-lab/holly-fern-frond-20261023'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
verts=[(d['position'][i]*1.35,d['position'][i+2]*1.35,d['position'][i+1]*1.6) for i in range(0,len(d['position']),3)]
faces=[d['index'][i:i+3] for i in range(0,len(d['index']),3)]
mesh=bpy.data.meshes.new('Approved four-frond clump');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Approved four-frond clump',mesh);bpy.context.collection.objects.link(obj)
uv=mesh.uv_layers.new()
for poly in mesh.polygons:
 for li in poly.loop_indices:
  vi=mesh.loops[li].vertex_index;uv.data[li].uv=d['cardUv'][vi*2:vi*2+2]
color=bpy.data.images.load(str(source/'color.png'));color.colorspace_settings.name='sRGB'
normal=bpy.data.images.load(str(source/'normal.png'));normal.colorspace_settings.name='Non-Color'
def material(f,segment,isnormal):
 m=bpy.data.materials.new(f'frond{f}-row{segment}-{isnormal}');m.use_nodes=True;n=m.node_tree.nodes;n.clear();l=m.node_tree.links
 tex=n.new('ShaderNodeTexImage');tex.image=color
 em=n.new('ShaderNodeEmission');outnode=n.new('ShaderNodeOutputMaterial');trans=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader')
 alpha=n.new('ShaderNodeMath');alpha.operation='GREATER_THAN';alpha.inputs[1].default_value=.5;l.new(tex.outputs['Alpha'],alpha.inputs[0]);l.new(alpha.outputs[0],mix.inputs[0]);l.new(trans.outputs[0],mix.inputs[1]);l.new(em.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],outnode.inputs[0])
 if not isnormal:l.new(tex.outputs['Color'],em.inputs[0]);return m
 nt=n.new('ShaderNodeTexImage');nt.image=normal
 dec=n.new('ShaderNodeVectorMath');dec.operation='MULTIPLY_ADD';dec.inputs[1].default_value=(2,2,2);dec.inputs[2].default_value=(-1,-1,-1);l.new(nt.outputs[0],dec.inputs[0])
 sep=n.new('ShaderNodeSeparateXYZ');l.new(dec.outputs[0],sep.inputs[0])
 angle=d['frondAngle'][f*10];s=(d['frondSlope'][f*10+segment*2]+d['frondSlope'][f*10+(segment+1)*2])/2;inv=1/math.sqrt(1+s*s);c=math.cos(angle);a=math.sin(angle)
 # Runtime shader rotation for coverageData.x=0: x'=c*x-a*z, z'=a*x+c*z.
 matrix=((c,a*s*inv,-a*inv),(0,inv,s*inv),(a,-c*s*inv,c*inv))
 comb=n.new('ShaderNodeCombineXYZ')
 for row,coeff in enumerate(matrix):
  terms=[]
  for j,k in enumerate(coeff):
   mul=n.new('ShaderNodeMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=k;l.new(sep.outputs[j],mul.inputs[0]);terms.append(mul.outputs[0])
  add=n.new('ShaderNodeMath');add.operation='ADD';l.new(terms[0],add.inputs[0]);l.new(terms[1],add.inputs[1]);add2=n.new('ShaderNodeMath');add2.operation='ADD';l.new(add.outputs[0],add2.inputs[0]);l.new(terms[2],add2.inputs[1]);l.new(add2.outputs[0],comb.inputs[row])
 norm=n.new('ShaderNodeVectorMath');norm.operation='NORMALIZE';l.new(comb.outputs[0],norm.inputs[0]);enc=n.new('ShaderNodeVectorMath');enc.operation='MULTIPLY_ADD';enc.inputs[1].default_value=(.5,.5,.5);enc.inputs[2].default_value=(.5,.5,.5);l.new(norm.outputs[0],enc.inputs[0]);l.new(enc.outputs[0],em.inputs[0]);return m
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=False;scene.render.film_transparent=True
scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
cam=bpy.data.objects.new('Top down orthographic bake',bpy.data.cameras.new('Top down'));scene.collection.objects.link(cam);cam.location=(0,0,5);cam.data.type='ORTHO';cam.data.ortho_scale=2.12;scene.camera=cam
for isnormal in [False,True]:
 mesh.materials.clear()
 for f in range(4):
  for seg in range(4):mesh.materials.append(material(f,seg,isnormal))
 for poly in mesh.polygons:poly.material_index=poly.index//2
 scene.view_settings.view_transform='Raw' if isnormal else 'Standard';scene.render.filepath=str(out/('normal.png' if isnormal else 'color.png'));bpy.ops.render.render(write_still=True)
(out/'source.json').write_text(json.dumps(dict(source='../holly-fern-frond-20261023/source.json',license='CC0-1.0',geometry='src/rendering/mangrove-fern-geometry.js',fronds=4,widthMeters=2.12,resolution=512,normalSpace='runtime X/up/Z, linear RGB; row-average analytic curvature; validate orientation in runtime',scope='Offline candidate only. Current near and far native geometry unchanged. Top-down bake for shallow ground patch; oblique silhouette and alpha mip coverage require runtime validation.'),indent=2)+'\n',encoding='utf8')

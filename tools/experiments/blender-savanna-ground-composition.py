"""Author three calm sand clearings as editable Blender Bezier shapes.

Offline composition only: same three 1024-square runtime maps, no new shader.
Source channels remain paired; normals are renormalized after blending.
"""
from pathlib import Path
import bpy, json, numpy as np
R=Path(__file__).resolve().parents[2]
O=R/'docs/qa/global-visual-lab/ground-composition';O.mkdir(parents=True,exist_ok=True)
A=O  # Rejected study outputs stay outside the shipped public assets.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene;s.render.engine='BLENDER_EEVEE';s.render.resolution_x=s.render.resolution_y=1024;s.render.resolution_percentage=100
s.world.color=(0,0,0);s.view_settings.view_transform='Standard';s.view_settings.look='None';s.view_settings.exposure=0;s.view_settings.gamma=1
mat=bpy.data.materials.new('Sand clearing mask');mat.use_nodes=True;n=mat.node_tree.nodes;n.clear();e=n.new('ShaderNodeEmission');e.inputs[0].default_value=(1,1,1,1);out=n.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(e.outputs[0],out.inputs[0])
# Hand-placed asymmetric masses, no random/Voronoi/noise mask. Islands remain
# away from tile edges so the source grass controls the periodic seam.
shapes=[[(.08,.28),(.11,.16),(.24,.12),(.36,.19),(.34,.29),(.43,.39),(.37,.51),(.23,.47),(.17,.39)],
[(.54,.15),(.69,.09),(.86,.18),(.90,.33),(.78,.42),(.67,.37),(.59,.29)],
[(.36,.68),(.47,.58),(.65,.60),(.74,.72),(.87,.76),(.85,.88),(.66,.91),(.51,.85),(.37,.86),(.28,.78)]]
for i,points in enumerate(shapes):
 c=bpy.data.curves.new('Authored clearing '+str(i),'CURVE');c.dimensions='2D';c.resolution_u=24;c.fill_mode='BOTH';p=c.splines.new('BEZIER');p.bezier_points.add(len(points)-1)
 for v,(x,y) in zip(p.bezier_points,points):v.co=(x,y,0);v.handle_left_type=v.handle_right_type='AUTO'
 p.use_cyclic_u=True;o=bpy.data.objects.new(c.name,c);s.collection.objects.link(o);o.data.materials.append(mat)
bpy.ops.object.camera_add(location=(.5,.5,2));s.camera=bpy.context.object;s.camera.data.type='ORTHO';s.camera.data.ortho_scale=1
s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.filepath=str(O/'authored-mask.png')
bpy.ops.wm.save_as_mainfile(filepath=str(O/'ground-composition.blend'));bpy.ops.render.render(write_still=True)
def read(path):
 im=bpy.data.images.load(str(path),check_existing=False);im.colorspace_settings.name='Non-Color'
 if tuple(im.size)!=(1024,1024):im.scale(1024,1024)
 arr=np.empty(1024*1024*4,dtype=np.float32);im.pixels.foreach_get(arr);return arr.reshape(1024,1024,4)
mask=read(O/'authored-mask.png')[:,:,3:4]
# A narrow offline feather prevents a cut-paper edge; no runtime sampler added.
for _ in range(8):mask=(mask+np.roll(mask,1,0)+np.roll(mask,-1,0)+np.roll(mask,1,1)+np.roll(mask,-1,1))/5
cfg=json.loads((R/'public/content/ground-materials.json').read_text())
audit={'size':[1024,1024],'sandCoverage':float(mask.mean()),'shapes':shapes,'files':{},'normalRenormalized':True}
for role in ['base','normal','arh']:
 grass=read(R/'public'/cfg['savanna'][role].lstrip('/'))
 if role=='arh':sand=np.ones_like(grass)*np.array([1,.90,.50,1],np.float32)
 else:sand=read(R/'public'/cfg['desert'][role].lstrip('/'))
 if role=='base':sand[:,:,:3]*=np.array([.65,.76,.84],np.float32)
 result=grass*(1-mask)+sand*mask
 if role=='normal':
  v=result[:,:,:3]*2-1;v/=np.maximum(np.linalg.norm(v,axis=2,keepdims=True),1e-6);result[:,:,:3]=v*.5+.5
 result[:,:,3]=1
 im=bpy.data.images.new('Composed savanna '+role,1024,1024,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(result.ravel());im.file_format='PNG';im.filepath_raw=str(A/('savanna-composed-'+role+'.png'));im.save();audit['files'][role]={'path':im.filepath_raw,'bytes':Path(im.filepath_raw).stat().st_size}
(O/'audit.json').write_text(json.dumps(audit,indent=2)+'\n',newline='\n')

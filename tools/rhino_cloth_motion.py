"""Rhino rear garment selection, waist rig and offline cloth bake in source units."""
import math
import bpy,bmesh,numpy as np
from mathutils import Vector,Matrix
from lion_secondary_motion import ClothPanel

def cloth_rest():
 rows=[]
 for z in np.linspace(.465,.055,9):
  t=(z-.055)/.410;width=.17*(.38+.62*t)
  rows.extend((x,.115+.03*(1-t)-.10*(abs(x)/.17)**2,z) for x in np.linspace(-width,width,5))
 return np.array(rows)

class RhinoPanel(ClothPanel):
 def collide(self,capsules,floor):
  # The rhino garment wraps around the hips. Use radial contacts on its side
  # columns, with a curved posterior limit, instead of a flat rear sheet.
  for a,b,r in capsules:
   ab=b-a;t=np.clip((self.pos-a)@ab/max(ab@ab,1e-9),0,1);q=a+t[:,None]*ab;delta=self.pos-q;distance=np.linalg.norm(delta,axis=1);mask=(distance<r)&(self.inv>0)
   self.pos[mask]+=delta[mask]/np.maximum(distance[mask,None],1e-9)*(r-distance[mask,None])
  self.pos[5:,2]=np.maximum(self.pos[5:,2],floor+.012)

def prepare_cloth(mesh,rig):
 bm=bmesh.new();bm.from_mesh(mesh.data);origin=bm.faces.layers.int.new('original_polygon')
 for f in bm.faces:f[origin]=f.index
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
 seen=set();parts=[]
 for v in bm.verts:
  if v in seen:continue
  todo=[v];seen.add(v);part=[]
  while todo:
   q=todo.pop();part.append(q)
   for e in q.link_edges:
    n=e.other_vert(q)
    if n not in seen:seen.add(n);todo.append(n)
  parts.append(part)
 assert len(parts)==191,'Rhino topology changed; inspect garment selections'
 owner={v:i for i,part in enumerate(parts) for v in part};ribbons={13,59,60,78,85,117,125,134,144,153,154,165,177,179,182,186,187};selected=set();core_count=0
 for f in bm.faces:
  c=f.calc_center_median();part=owner[f.verts[0]]
  core=part==0 and c.y>.095 and .16<c.z<.475 and abs(c.x)<float(np.interp(c.z,[.16,.24,.35,.475],[.055,.07,.10,.12]))
  if core or part in ribbons:selected.add(f[origin]);core_count+=int(core)
 bm.free();assert len(selected)>100 and core_count>20,(len(selected),core_count)
 bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
 for v in mesh.data.vertices:v.select=False
 for e in mesh.data.edges:e.select=False
 for p in mesh.data.polygons:p.select=p.index in selected
 bpy.context.tool_settings.mesh_select_mode=(False,False,True);old=set(bpy.context.scene.objects)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.separate(type='SELECTED');bpy.ops.object.mode_set(mode='OBJECT')
 cloth=next(o for o in bpy.context.scene.objects if o not in old);cloth.name='RearCloth';cloth.data.name='RearCloth';cloth.parent=rig
 # One continuous sheet uses five columns; adjacent ribbons share the same
 # simulated surface so central edges cannot be pulled by opposing panels.
 rest=cloth_rest().reshape(9,5,3);names=[]
 bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for col in range(5):
  chain=[];parent=rig.data.edit_bones['Hips']
  for j,(r0,r1) in enumerate(zip([0,3,6],[3,6,8])):
   name=f'ClothRear_C{col}_{j+1:02d}';bone=rig.data.edit_bones.new(name);bone.head=rest[r0,col];bone.tail=rest[r1,col];bone.parent=parent;bone.use_connect=False;parent=bone;chain.append(name)
  names.append(chain)
 bpy.ops.object.mode_set(mode='OBJECT')
 for chain in names:
  for name in chain:cloth.vertex_groups.new(name=name)
 centers=[float((rest[a,0,2]+rest[b,0,2])/2) for a,b in zip([0,3,6],[3,6,8])]
 for v in cloth.data.vertices:
  z=v.co.z;t=max(0,min(1,(z-.055)/.410));width=.17*(.38+.62*t);u=max(0,min(4,(v.co.x+width)/(2*width)*4));col=min(3,int(u));blend=u-col
  if z>=centers[0]:layers=[(0,1)]
  elif z<=centers[-1]:layers=[(2,1)]
  else:
   for j in [0,1]:
    if centers[j]>=z>=centers[j+1]:q=(centers[j]-z)/(centers[j]-centers[j+1]);layers=[(j,1-q),(j+1,q)];break
  pin=max(0,min(1,(z-.435)/.03));weights={}
  for c,wc in [(col,1-blend),(col+1,blend)]:
   for j,w in layers:
    if wc*w*(1-pin)>1e-8:weights[names[c][j]]=wc*w*(1-pin)
  if pin>0:weights['Hips']=pin
  for g in list(v.groups):cloth.vertex_groups[g.group].remove([v.index])
  for name,w in weights.items():cloth.vertex_groups[name].add([v.index],w,'REPLACE')
 material=mesh.data.materials[0].copy();material.name='Rhino rear garment';material.use_backface_culling=False;cloth.data.materials.clear();cloth.data.materials.append(material)
 for p in cloth.data.polygons:p.material_index=0
 return cloth,names,{'originalConnectedParts':191,'rearRibbonParts':sorted(ribbons),'coreFacesSeparated':core_count,'faces':len(cloth.data.polygons),'vertices':len(cloth.data.vertices),'bones':[n for chain in names for n in chain],'waistAnchor':'Hips; upper 3 cm blend','legInfluences':0,'continuousPanel':True,'underlyingBody':'Original source surface retained; no extra skin mesh required','solver':'Pinned 5x9 grid, five rigid bone columns, three segments each; offline simulation and clip bake'}

def simulate(samples,loop,floor):
 panel=RhinoPanel(-.17,.17,rest=cloth_rest(),back_plane=cloth_rest()[5:,1]-.02);panel.initialize(samples[0]['hip']);period=len(samples)-1;history=[];results=[]
 if not loop:
  for _ in range(96):panel.step(samples[0]['hip'],samples[0]['capsules'],1/96,(0,.025),floor)
 for cycle in range(8 if loop else 1):
  current=[]
  for i in range(period if loop else len(samples)):
   s=samples[i];phase=i/period;pos=panel.step(s['hip'],s['capsules'],1/96,(.035*math.sin(math.tau*phase),.025),floor)
   if loop and cycle>=4:current.append(pos)
   elif not loop:results.append(pos)
  if current:history.append(current)
 variation=0
 if loop:
  variation=float(np.max(np.linalg.norm(history[-1][0]-history[-2][0],axis=1)));local=[]
  for i in range(period):
   inv=np.linalg.inv(samples[i]['hip']);pos=np.mean([h[i] for h in history],axis=0);local.append(pos@inv[:3,:3].T+inv[:3,3])
  for i in range(period):
   s=samples[i];pos=sum(local[(i+k-2)%period]*w for k,w in enumerate([1,2,3,2,1]))/9;pos=pos@s['hip'][:3,:3].T+s['hip'][:3,3];pos[:5]=panel.rest[:5]@s['hip'][:3,:3].T+s['hip'][:3,3];results.append(pos)
  delta=samples[-1]['hip']@np.linalg.inv(samples[0]['hip']);results.append(results[0]@delta[:3,:3].T+delta[:3,3])
 return results,{'fps':96,'nodes':45,'substeps':2,'iterations':9,'warmupCycles':8 if loop else 0,'rawCycleVariation':variation,'loopBake':'Last four cycles phase-averaged, circular five-frame filter, local endpoint closure' if loop else 'Direct simulated attack with one-second preroll','shapeTether':.09,'maxUpwardFold':.04,'posteriorLimit':'Curved, rest surface minus 2 cm','contacts':'Radial capsules following hips, thighs and calves','runtimeSimulation':False}

def bake(rig,names,rest,positions,frame):
 grid=positions.reshape(9,5,3)
 for col,chain in enumerate(names):
  for j,(r0,r1) in enumerate(zip([0,3,6],[3,6,8])):
   bone=rig.pose.bones[chain[j]];head=Vector(grid[r0,col]);end=Vector(grid[r1,col]);direction=rig.data.bones[bone.name].tail_local-rig.data.bones[bone.name].head_local;q=direction.rotation_difference(end-head)@rest[bone.name].to_quaternion();bone.matrix=Matrix.LocRotScale(head,q,Vector((1,1,1)));bpy.context.view_layer.update()
   for prop in ['location','rotation_quaternion','scale']:bone.keyframe_insert(prop,frame=frame,group=bone.name)

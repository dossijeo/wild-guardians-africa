"""Sample exported motion in the editable Blender rig and measure mesh distortion."""
import bpy,pathlib,json,math
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[2];bpy.ops.wm.open_mainfile(filepath=str(root/'art/guardian/guardian.blend'));scene=bpy.context.scene;rig=bpy.data.objects['GuardianRig'];body=bpy.data.objects['Guardian']
for tr in rig.animation_data.nla_tracks:tr.mute=True
scene.frame_set(1);base=[v.co.copy() for v in body.data.vertices];edges=[(a,b,(base[a]-base[b]).length) for a,b in [e.vertices for e in body.data.edges] if (base[a]-base[b]).length>.002]
report={'weights':{'minSum':min(sum(g.weight for g in v.groups) for v in body.data.vertices),'maxSum':max(sum(g.weight for g in v.groups) for v in body.data.vertices),'maxInfluences':max(len(v.groups) for v in body.data.vertices)},'clips':{}}
for clip in ['Idle','Explain','Warning','Enthusiasm','Invoke','Cast']:
 for tr in rig.animation_data.nla_tracks:tr.mute=tr.name not in [clip,'Mantle_Spell' if clip in ['Invoke','Cast'] else 'Mantle_Breeze']
 rig.data.pose_position='REST';bpy.context.view_layer.update();rig.data.pose_position='POSE';rig.update_tag(refresh={'OBJECT','DATA','TIME'});bpy.context.view_layer.update()
 ratios=[];maxd=0;worst=(0,None)
 for f in [1,13,25,37,49,61,73,85,97]:
  scene.frame_set(f);rig.data.pose_position='REST';bpy.context.view_layer.update();rig.data.pose_position='POSE';rig.update_tag(refresh={'OBJECT','DATA','TIME'});bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();co=[v.co.copy() for v in mesh.vertices]
  ratios.extend((co[a]-co[b]).length/d for a,b,d in edges);candidate=max(((co[a]-co[b]).length/d,[list(base[a]),list(base[b])]) for a,b,d in edges);worst=max(worst,candidate,key=lambda x:x[0]);maxd=max(maxd,max((a-b).length for a,b in zip(co,base)));ev.to_mesh_clear()
 ratios.sort();report['clips'][clip]={'minEdgeRatio':ratios[0],'maxEdgeRatio':ratios[-1],'p01EdgeRatio':ratios[int(len(ratios)*.01)],'p99EdgeRatio':ratios[int(len(ratios)*.99)],'maxDisplacement':maxd,'worstEdge':worst}
(root/'docs/guardian/deformation-checks.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

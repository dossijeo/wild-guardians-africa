"""Isolated trial: move terminal cloth pivots up without changing their axes."""
import bpy, pathlib, json, hashlib
root=pathlib.Path.cwd()
source=root/'art/guardian/guardian.blend'
bpy.ops.wm.open_mainfile(filepath=str(source))
rig=bpy.data.objects['GuardianRig']
bpy.context.view_layer.objects.active=rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
changes=[]
for b in rig.data.edit_bones:
 if not (b.name.startswith('Mantle.') and b.name.endswith('.2')):continue
 before=list(b.head);delta=(b.parent.head-b.head)*.4
 b.use_connect=False;b.head+=delta;b.tail+=delta
 changes.append({'bone':b.name,'before':before,'after':list(b.head),'shift':list(delta)})
bpy.ops.object.mode_set(mode='OBJECT')
out=pathlib.Path('C:/tmp/guardian-mantle-pivots.blend')
bpy.ops.wm.save_as_mainfile(filepath=str(out))
report={'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'candidate':str(out),'changes':changes,'scope':'Terminal rest pivots only; production unchanged. Needs deformation and visual validation.'}
(root/'docs/guardian/wind-wide/mantle-review/pivot-trial.json').write_text(json.dumps(report,indent=2))

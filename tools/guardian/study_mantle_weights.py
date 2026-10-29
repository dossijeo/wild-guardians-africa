"""Isolated cloth-only trial: release residual torso influence below the anchors."""
import bpy,pathlib,json
root=pathlib.Path.cwd();bpy.ops.wm.open_mainfile(filepath=str(root/'art/guardian/guardian.blend'))
body=bpy.data.objects['Guardian'];names={g.index:g.name for g in body.vertex_groups};torso=body.vertex_groups['Torso'].index
changed=[]
for v in body.data.vertices:
 w={g.group:g.weight for g in v.groups};cloth={g:a for g,a in w.items() if names[g].startswith('Mantle.')}
 if not cloth or any(names[g]!='Torso' and not names[g].startswith('Mantle.') for g in w):continue
 total=sum(cloth.values());t=min(1,max(0,(-v.co.z-.04)/.12));t=t*t*(3-2*t)
 confidence=min(1,max(0,(total-.02)/.58));confidence=confidence*confidence*(3-2*confidence)
 transfer=w.get(torso,0)*t*confidence
 if transfer<1e-5:continue
 before=w.get(torso,0);w[torso]=before-transfer
 for g in cloth:w[g]+=transfer*cloth[g]/total
 for g,a in w.items():body.vertex_groups[g].add([v.index],a,'REPLACE')
 changed.append({'vertex':v.index,'z':v.co.z,'torsoBefore':before,'torsoAfter':w[torso]})
bpy.ops.wm.save_as_mainfile(filepath='C:/tmp/guardian-mantle-weights.blend')
(root/'docs/guardian/wind-wide/mantle-review/weight-trial.json').write_text(json.dumps({'count':len(changed),'changes':changed},indent=2))

import bpy,pathlib,json
root=pathlib.Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(root/'art/guardian/inspection.blend'))
o=bpy.data.objects['Mesh_0'];bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
verts=[list(v.co) for v in o.data.vertices if -.12<v.co.x<.12 and .18<v.co.z<.34 and v.co.y<-.04]
(root/'docs/guardian/face-vertices.json').write_text(json.dumps(verts))
scene=bpy.context.scene;scene.camera.location=(0,-2,.26);scene.camera.rotation_euler=(1.57079632679,0,0);scene.camera.data.ortho_scale=.32;scene.render.filepath=str(root/'docs/guardian/face-original.png');bpy.ops.render.render(write_still=True)

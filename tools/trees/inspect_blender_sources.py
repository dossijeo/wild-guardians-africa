"""Blender headless import audit; never exports or changes a runtime asset."""
import bpy, json
from pathlib import Path

root=Path.cwd()/ 'docs/lighting/biome-retexture-sources'
inventory=json.loads((root/'inventory.json').read_text(encoding='utf8'))
rows=[]
for item in inventory['assets']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root/item['file']))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    assert meshes, item['file']
    for obj in meshes:
        assert obj.data.uv_layers, item['file']+' has no imported UVs'
        assert len(obj.data.materials), item['file']+' has no imported material'
        obj.data.calc_loop_triangles()
    textures=[]
    for image in bpy.data.images:
        if image.type=='RENDER_RESULT': continue
        _ = image.pixels[0]  # Force Blender's lazy image decode before checking it.
        assert image.has_data and image.size[0]>0 and image.size[1]>0, item['file']+' failed to decode '+image.name
        textures.append({'name':image.name,'size':list(image.size),'colorspace':image.colorspace_settings.name})
    assert len(textures)==len(item['maps']),item['file']+' missing texture maps'
    rows.append({'file':item['file'],'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'triangles':sum(len(o.data.loop_triangles) for o in meshes),'textures':textures,'dimensions':[list(o.dimensions) for o in meshes]})
report={'blender':bpy.app.version_string,'scope':'Successful GLB import, UV/material presence and image decoding only. No rendered image or generated texture acceptance. Runtime sources unchanged.','assets':rows}
(root/'blender-import-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print('VERIFIED_IMPORTS',len(rows))

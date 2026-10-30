import bpy
from pathlib import Path
for stem,source in [('buffalo-normal-baseline','content/source/actors/buffalo/expressive-pre-mane.blend'),('buffalo-normal-candidate','test-results/buffalo-mane-normals.blend')]:
 bpy.ops.wm.open_mainfile(filepath=str(Path(source).resolve()))
 bpy.ops.export_scene.gltf(filepath=str(Path('test-results',stem+'.glb').resolve()),export_format='GLB',export_animations=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)

"""Blender: normalize user-supplied center copies for the native destruction input.

Preserves proportions and textures; fits each former building's dimensions without expanding its envelope.
Does not install runtime assets or reuse old model-specific geometry patches.
"""
import json, runpy
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
source = ROOT / 'content/source/work-centers/renewed'
output = ROOT / 'test-results/renewed-centers'
output.mkdir(parents=True, exist_ok=True)
audit = json.loads((ROOT / 'content/manifests/building-scale-audit.json').read_text(encoding='utf-8'))
rows = []
for old in audit['rows']:
    culture = old['culture']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source / (culture + '.glb')))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if len(meshes) != 1:
        raise RuntimeError(f'{culture}: expected one mesh')
    obj = meshes[0]
    # Bake the importer basis into vertices, then normalize in Blender Z-up.
    obj.data.transform(obj.matrix_world)
    obj.parent = None
    obj.matrix_world.identity()
    coords = [v.co for v in obj.data.vertices]
    low = [min(v[i] for v in coords) for i in range(3)]
    high = [max(v[i] for v in coords) for i in range(3)]
    scale = min(old['currentDimensions'][axis] / (high[blender_axis] - low[blender_axis]) for axis, blender_axis in enumerate((0, 2, 1)))
    center = [(low[0]+high[0])/2, (low[1]+high[1])/2, low[2]]
    for v in obj.data.vertices:
        for axis in range(3):
            v.co[axis] = (v.co[axis] - center[axis]) * scale
    roof_repair = None
    if culture == 'saheliana':
        roof_repair = runpy.run_path(str(Path(__file__).with_name('repair_renewed_sahelian_roof.py')))['repair_roof'](obj.data)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.wm.save_as_mainfile(filepath=str(output / (culture + '.blend')))
    bpy.ops.export_scene.gltf(filepath=str(output / (culture + '.glb')), export_format='GLB', use_selection=True)
    rows.append({'culture': culture, 'uniformScale': scale, 'oldDimensionsXYZ': old['currentDimensions'],
                 'newDimensionsXYZ': [(high[i]-low[i])*scale for i in (0,2,1)],
                 'roofRepair': roof_repair, 'vertices': len(obj.data.vertices), 'triangles': sum(len(p.vertices)-2 for p in obj.data.polygons)})
(output / 'normalization.json').write_text(json.dumps(rows, indent=2), encoding='utf-8')
catalogue = json.loads((ROOT / 'public/content/destruction.json').read_text(encoding='utf-8'))
for building in catalogue['buildings']:
    building.update(url='/test-results/renewed-centers/' + building['culture'] + '.glb', repairPlaster=False, fitSites=True, fitGround=True)
    building.pop('roofCap', None)
(output / 'catalogue.json').write_text(json.dumps(catalogue, indent=2), encoding='utf-8')
print('RENEWED_CENTERS_PREPARED')

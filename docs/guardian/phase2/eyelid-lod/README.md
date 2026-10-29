# Guardian eyelid density study

The generator now accepts `--columns` and `--rows`; defaults preserve the existing 65x17 grid. The 33x9 candidate retains the same analytic contour, surface fit, rear perimeter walls, vertex paint function, head skin binding and eight blink targets. Density changes only the sampled eyelid mesh. Reference and candidate renders were generated with the same Blender 4.5.3 script/camera/light settings.

The candidate has 1,508 vertices and 2,688 triangles versus 5,060 and 9,472: 71.6% fewer eyelid triangles. Closed reference/candidate and half-closed candidate renders were inspected. The broad contour and lid meeting line remain similar; top rim shadow gaps also exist in the reference and are not proof of a new LOD defect. Oblique views, partial morph interpolation, animated runtime AO, zoom transition and measured GPU cost remain unvalidated.

Source candidate: `content/source/guardian/eyelid-lod-study/guardian-lids-33x9.blend` and `.glb`. These are isolated authoring exports from rig-before-eyelids.blend, **not replacements for the current production rig**. Runtime assets were not changed. Any integration must transplant only the eyelid geometry/morph data, preserving current rig, animations, materials and AO registration; it must then be tested in the real renderer before adoption.

Reproduce from repository root:

```powershell
blender -b --python tools/guardian/study_guardian_lids.py -- --output C:/tmp/guardian-lids-lod-33x9 --columns 33 --rows 9
```

No runtime speedup or artistic approval is claimed.

# Guardian eyelid density study

The generator now accepts `--columns` and `--rows`; defaults preserve the existing 65x17 grid. The 33x9 candidate retains the same analytic contour, surface fit, rear perimeter walls, vertex paint function, head skin binding and eight blink targets. Density changes only the sampled eyelid mesh. Reference and candidate renders were generated with the same Blender 4.5.3 script/camera/light settings.

The candidate has 1,508 vertices and 2,688 triangles versus 5,060 and 9,472: 71.6% fewer eyelid triangles. Closed reference/candidate and half-closed candidate renders were inspected. The broad contour and lid meeting line remain similar; top rim shadow gaps also exist in the reference and are not proof of a new LOD defect. Oblique views, partial morph interpolation, animated runtime AO, zoom transition and measured GPU cost remain unvalidated.

Source candidate: `content/source/guardian/eyelid-lod-study/guardian-lids-33x9.blend` and `.glb`. These are isolated authoring exports from rig-before-eyelids.blend, **not replacements for the current production rig**. Runtime assets were not changed. Any integration must transplant only the eyelid geometry/morph data, preserving current rig, animations, materials and AO registration; it must then be tested in the real renderer before adoption.

Reproduce from repository root:

```powershell
blender -b --python tools/guardian/study_guardian_lids.py -- --output C:/tmp/guardian-lids-lod-33x9 --columns 33 --rows 9
```

No runtime speedup or artistic approval is claimed.

## Oblique comparison

`render_lid_oblique.py` loads each saved source, disables NLA tracks and renders identical light/camera settings at -45 and +45 degrees, with 50% and full blink. All eight PNGs in `oblique-reference/` and `oblique-candidate/` were visually inspected. The visible contour and meeting seam remain similar at both angles; the closed eye globe is covered. The upper attachment shadow is present in both meshes. This is a matched offline inspection, not a runtime shader/animation/performance test. Runtime transplantation and AO validation remain the next gate.

```powershell
blender -b --python tools/guardian/render_lid_oblique.py -- --input content/source/guardian/eyelid-lod-study/guardian-lids-33x9.blend --output C:/tmp/guardian-lid-oblique
```

## Native WorldScene candidate selector

The Guardian combat QA page now offers `Parpados QA: originales/33x9`. It clones only donor geometry, remaps skin indices by bone name and validates bind/local matrices and morph target order. Current production skeleton, materials and face bindings are retained. The live inverse bind matrix is intentionally retained: attached skinning updates it after world transforms. Original nonuniform AO is copied only from source vertices at the same position (tolerance 1e-7, closest normal for duplicates); unknown positions fail instead of receiving invented visibility. Donor resources are released even on failure. This is a QA study, not production LOD selection.

`runtime-candidate.png` and `runtime-reference.png` were captured and inspected in the real native WorldScene, frozen Grow at 0.72 s, cinematic lighting and global AO. The neutral-eye silhouette is comparable and the transplant succeeds without errors after the compatibility fixes. Background tree residency changes between captures, so these are not pixel-exact scene comparisons. Runtime blink states, transitions and incremental GPU timings remain unvalidated. Production GLB remains unchanged.

## Native partial and closed blink

The QA select `Parpadeo del Guardian QA` overrides only the face controller's blink option, retaining its production piecewise morph interpolation. Natural blink remains the default. Four new runtime reference/candidate screenshots cover 50% and full closure at the same frozen Grow pose and camera. All four were visually inspected; the visible eyelid boundary and full eye coverage are consistent at this view, and the runtime errors list is empty. Background tree preparation changes in the first pair; no whole-image pixel equivalence is claimed. Continuous blink transitions, other runtime angles/night lighting and GPU cost remain pending. No production model replacement occurred.

## GPU comparison and adoption decision

The QA `Comparar GPU de parpados` button reuses asynchronous elapsed GPU queries and alternates geometry in a frozen WorldScene. Labels none/body mean original, effects/all mean candidate; no body or effects are hidden in this test. Each run has 40 warmup frames and 240 measured frames, 60 per label, with the same close camera, Grow at 0.72 s, full blink, material and AO. Both recorded runs use Intel UHD/D3D11 at 1600x900 and have 240 valid GPU samples, no hidden frames, no disjoint events and no runtime errors.

Run 1 original GPU medians are 22.319/21.980 ms versus candidate 22.150/22.166 ms. Run 2 original medians are 21.550/21.821 ms versus candidate 21.891/21.722 ms. Every label reports 89 draw calls. These full-frame distributions overlap and change ordering; they do not establish a repeatable speedup. Instrumented GPU measurements are not gameplay FPS, and this is one close/frozen scene, not a raid benchmark or universal claim about geometry cost.

**Decision: retain the original production eyelids.** The lower-density asset remains an isolated candidate with reproducible authoring and QA controls. Its triangle reduction is real, but this evidence does not justify an additional production LOD asset or transition system. Continuous blink/night/other-distance acceptance remains incomplete and is not needed to retain the original. The QA scene was restored to original geometry and natural blink after measurement.

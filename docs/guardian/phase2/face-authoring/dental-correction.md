# Dental correction and hollow oral cavity — authoring candidate

The previous chin cut and black entrance-spanning lining were rejected after user review. Production assets have not been replaced by these experiments.

The current authoring script follows the curved dental region. Topology analysis found three dental islands (57, 90 and 91 vertices): the lower tooth row and both canines. Two were connected to skin at articulation vertices. `actor_dentition.py` separates their original faces without replacing the teeth or using color/proximity guesses. All three follow the jaw together. At full opening the numerical rigid-transform error is zero; linear morph interpolation contracts edges by up to 1.28% at half opening. This is explicitly measured, not claimed perfectly rigid at intermediate weights.

The old lining and front cut-edge bridges have been removed. The new interior has a recessed palate, oral floor, rounded tongue volume, throat and curved buccal walls running backwards into the head. There is no sheet spanning the frontal entrance. Iteration rejected overly deep surfaces protruding below the jaw, upright tongue geometry, front-facing cheek curtains and a visible palate rim. Current full/half frontal renders and full profiles show the revised depth and tongue. Profile corner closure and animated transitions still need final acceptance; these captures are authoring evidence, not in-game validation.

Both muzzle sides use the localized generated fur repair. The patch excludes all three dental islands and preserves the original UV coordinates. It remains a projected Blender shader and must be baked into the original atlas before GLB export. The generated patch provenance is recorded beside the PNG in `content/source/actors/hyena/`; no external asset library was added.

Reproduce from the worktree root:

```powershell
& $blender -b --python tools/guardian/prototype_hyena_dental_jaw.py -- --input public/assets/e45d7ac086ba07a8c3948fa0695fc41267914a95e1ab243cee608aa7ca4ec472.glb --output C:/tmp/guardian-faces/hyena-hollow-mouth-v17.blend --patch content/source/actors/hyena/muzzle-fur-repair.png
& $blender -b --python tools/guardian/inspect_actor_face.py -- --input C:/tmp/guardian-faces/hyena-hollow-mouth-v17.blend --output C:/tmp/guardian-faces/hollow-v17-full --expression mouthOpen --amount 1 --mouth-closeup --samples 8
& $blender -b --python tools/guardian/audit_actor_dentition.py -- --input C:/tmp/guardian-faces/hyena-hollow-mouth-v17.blend --output C:/tmp/guardian-faces/hyena-v17-dentition-audit.json
```

Use `--amount 0` and `--amount 0.5` for closed and partial inspection. The inspector renders front, quarter and both profiles. The editable local source is preserved at the path above; the committed scripts reproduce it. Blink combination, atlas baking, current-asset GLB playback, native-clip validation and game/performance tests remain pending. Historical export results in `status.json` refer to the rejected chin-cut candidate and are not validation of this source.

## Necklace/neck fold correction

The large triangular flap beside the collar canine also appears in the untouched prepared visual-lab GLB. Ray inspection identifies it as a separate necklace component: its mouth morph displacement is exactly zero. Smoothing jaw weights would not correct it.

`restore_hyena_collar.py` recovers necklace rest positions from the original artist GLB (`Desktop/Wild Guardians New/animales/hiena.glb`). It matches complete UV-face signatures to resolve overlapping UV coordinates, and fits the source-to-prepared uniform transform from 1,999 unaffected head vertices (maximum residual below 0.0000003 m). All 1,298 selected rigid-Neck ornament vertices must match; the script refuses a partial repair. It preserves topology, UVs and rigid Neck weights, and gives every facial shape key the same restored necklace positions. Both profiles and closed/open Blender renders were inspected: the stretched triangular flap is gone and the original canine remains.

```powershell
& $blender -b --python tools/guardian/restore_hyena_collar.py -- --input C:/tmp/guardian-faces/hyena-hollow-mouth-v17.blend --original 'C:/Users/PC/Desktop/Wild Guardians New/animales/hiena.glb' --output C:/tmp/guardian-faces/hyena-collar-restored.blend
& $blender -b --python tools/guardian/bake_actor_materials.py -- --input C:/tmp/guardian-faces/hyena-collar-restored.blend --output C:/tmp/guardian-faces/hyena-collar-baked.blend
& $blender -b --python tools/guardian/add_hyena_eyelids.py -- --input C:/tmp/guardian-faces/hyena-collar-baked.blend --output C:/tmp/guardian-faces/hyena-collar-expressive.blend
```

The candidate GLB loaded in the Three.js facial QA scene, with mouth/eyelid controls, seven draw calls and no reported JavaScript errors. The six native clips retain equivalent bone poses over 246 samples (21 bones; maximum world-position difference 0.0000016 m). This checks preserved animation transforms, not complete skin appearance or game performance. Runtime inspection exposed protruding/creased eyelids and small shading differences after export; these remain unaccepted and require correction. No production facial model has been replaced yet.

## Corrective eyelid interpolation and oral batching

The single blink morph crossed the eyeball at partial weights. The current candidate uses 25/50/75% corrective poses plus full closure, all sampled on the eye envelope. The start/end are fitted to the aperture visible outside the original brow and lower rim. `ActorExpression` blends only neighboring poses, preserving single-morph compatibility. Manual QA uses the same mapping. Six controller tests pass, including intermediate weights and independent mouth/right-eye channels.

The 2048 frontal atlas preserves more fur detail than the earlier narrow 512 sample. Oral base colors are now vertex colors on one shared material. The actual Three.js fixture reports four draws, down from seven in the preceding candidate. Compared with the prepared original, the candidate still adds two draws, 4,407 triangles and 686,592 uncompressed morph-accessor bytes. These static counts do not establish frame-time or total GPU-memory acceptance. Details: `hyena-face-candidate-metrics.json`.

After the documented authoring commands, copy the resulting GLB to `test-results/hyena-face-candidate.glb` and open `/tests/browser/actor-expression.html` through Vite. The scene identifies that asset path and exposes manual/automatic expression, native clip and pause controls. Current local source: `C:/tmp/guardian-faces/hyena-lids-v9.blend`. Full visual weight/clip matrix, compression, production integration and comparable performance remain pending.

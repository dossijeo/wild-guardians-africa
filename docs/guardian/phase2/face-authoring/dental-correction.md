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

# Expressive lion candidate — not installed

Editable v15 oral / v6 eyelid candidate based on the current lion source
`539e240badbd4705dd44b299b6c163c050c6dca388d9d25dc10688c88e0b4968.glb`.
The production catalogue remains unchanged.

- `expressive-candidate.blend`: 20,402,368 bytes, packed textures limited to
  2048px; the 1024px eyelid projection is retained. Geometry and all 52 compared
  geometry/skin/morph attributes match the full-resolution export exactly.
- `expressive-candidate.glb`: 7,347,720 bytes with Meshopt and WebP, five mesh
  primitives, 78 bones, six native clips, jaw and eight corrective lid shapes.
- The package sidecar records the explicit texture reduction. Original
  high-resolution authoring source was preserved separately.

Open `/tests/browser/actor-expression.html?actor=lion` on the normal Vite
server. The default now loads this committed GLB. Add `&uncompressed` only
when testing the separate local `test-results/lion-face-candidate.glb` fixture.
For the actual WorldScene/Game.tick/Attack path, open
`/tests/browser/guardian-combat.html?face=lion`. This substitutes only the
fixture's lion asset and selects lion in the species control. `?face=1`
continues to select the hyena candidate; the production catalogue is unchanged.

Re-export with the saved 96Hz/NLA timeline intact:

```powershell
blender -b --python tools/guardian/export_actor_source.py -- --input content/source/actors/lion/expressive-candidate.blend --output lion-export.glb
node tools/compress_web_assets.mjs --candidate lion-export.glb lion-web.glb
node tools/guardian/audit_actor_face.mjs lion-export.glb lion-web.glb lion-audit.json --exact-geometry --lion-muzzle
```

The portable source was reopened and exported; both that roundtrip and browser
compression passed exact attribute comparison and six-clip pose comparison.
The compressed asset loaded in Three.js with 11 facial bindings, four visible
draw calls in the front view and no reported errors. Its reduced texture
resolution is visibly softer in extreme close-up; strategic-camera review
remains required. This is not a GPU performance measurement.

Still pending: broader animated eye-boundary checks, continuous interpolation,
oral artistic refinement, actual combat/ragdoll/recovery visual integration,
and scoped performance comparison. See the evidence and failure history in
`docs/guardian/phase2/face-authoring/lion/` before accepting this candidate.

One real continuous combat cycle has now completed with the candidate:
11 facial bindings, one physical ragdoll, resumed attacking state, no remaining
physical bodies and no reported errors. The contact screenshot shows the
Guardian and impact, and the trace records lion hurt/impact SFX sources played.
The recording was not listened to; this does not validate the audio mix.
Only contact and final poses were inspected, so full fall/get-up artistic
acceptance still requires reviewing a continuous recording.

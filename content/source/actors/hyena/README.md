# Expressive hyena candidate

Selected by the game model catalogue on this work branch. Broader visual acceptance remains in progress.

- `expressive-candidate.blend`: editable v12 rig, six native clips, jaw/interior and eight corrective eyelid shapes. Textures are packed at a maximum of 2048 pixels; the package sidecar records the explicit downsampling. The high-resolution authoring input remains separate.
- `expressive-candidate.glb`: optimized browser candidate, 4,731,380 bytes. Geometry, skin attributes and morph arrays match the high-resolution export exactly; textures use the project's WebP policy.

Start the normal Vite server and open `/tests/browser/actor-expression.html` for facial controls, or `/tests/browser/guardian-combat.html?face=1` for the actual WorldScene/Attack/physics path. The latter overrides only this fixture's hyena asset; it does not change saved games or the production catalogue.

To export edits, use Blender glTF binary export with skins, morphs and NLA tracks. Preserve native clip names, use NLA_TRACKS, force sampling, no frame-range restriction, Y up, and four skin influences. Optimize the temporary export with:

```
node tools/compress_web_assets.mjs --candidate input.glb output.glb
node tools/guardian/audit_actor_face.mjs input.glb output.glb report.json --exact-geometry --hyena-muzzle
```

The portable Blend was reopened and re-exported: all 52 compared geometry/skin/morph attributes and six native clips matched the high-resolution GLB. See `docs/guardian/phase2/face-authoring/hyena-portable-roundtrip.json`.

Observed in the combat fixture: closed eyes/open jaw at contact, partial eyelid closure during falling, completed continuous recovery, no remaining physical bodies or errors, maximum one visible Guardian. The recorded cycle covers one hyena encounter. It does not validate every angle, obstacle, intensity, baked fallback or other species. Broader visual acceptance remains pending. Installation is verified without the fixture override in `hyena-installed-cycle.json`.

# Dental anatomy correction — not approved for runtime

User review correctly identified the previous horizontal cut as a chin cut. `actor_mouth.split_lip_seam` now fails explicitly instead of regenerating that rejected mouth. Production manifests still reference the unmodified visual-lab animal assets.

Inspection of the original welded analysis mesh found a 37-vertex dental cavity boundary rising toward the corners. The diagnostic magenta contours show that boundary; they are not invented lip landmarks. Subsequent harmonic-only experiments stretched teeth attached to the main surface. Color-only face separation also failed and was rejected.

The current prototype follows the curved dental region, moves the separate canine with the jaw, and adds an oral lining. Its right-side texture no longer exposes the painted canine behind the moving geometric tooth. The patch is projected locally; actual canine geometry is excluded. Original UV coordinates are asserted unchanged. An RNA UV-layer handle invalidation discovered during authoring was corrected by reacquiring the layer after adding color attributes.

Reproduce the current **unapproved** Blender source from repository root:

```powershell
& $blender -b --python tools/guardian/prototype_hyena_dental_jaw.py -- --input public/assets/e45d7ac086ba07a8c3948fa0695fc41267914a95e1ab243cee608aa7ca4ec472.glb --output C:/tmp/guardian-faces/hyena-dental-lined.blend --patch content/source/actors/hyena/muzzle-fur-repair.png
```

The new source preserves the native clip data but has not repeated the pose-equivalence audit after this topology change. It must not be exported to production before finishing both-side anatomy, corners/front lip strips, partial and closed poses, original-atlas texture bake, blink combination, GLB playback and in-game checks. The current images are diagnostic progress, not acceptance evidence for the full facial requirement.

The generated patch and full prompt/provenance are in `content/source/actors/hyena/`. No external asset library was imported.

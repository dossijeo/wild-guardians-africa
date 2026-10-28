# Facial seam investigation â€” not a production repair

The original olderFemale GLB itself shows angular cheek/jaw patches in Three.js. Screenshots compare the same camera and lighting in actor-expression.html. The expressive candidate remains unchanged by these experiments and is still uninstalled.

## Eliminated approaches

- Removing the normal map reduces patches but also loses wrinkle relief: rejected.
- Averaging geometric corner normals only across duplicate UV seams (148 position groups) did not remove the visible patches.
- Recomputing a wider set of face normals did not solve them either.
- Reversing the normal-map green channel worsened the relief: rejected.
- Using flat polygon normals produces obvious triangulation: rejected.

Blender render trials and temporary sources are under C:/tmp/guardian-faces/olderFemale-*. They are diagnostic outputs, not installed assets.

## Tangent basis finding

The source GLB has TANGENT; the expressive export currently lacks it. The renderer therefore reconstructs tangent space. The original also has patches, so tangent loss alone is not proven as the cause. Future export work should retain a deliberate tangent basis and compare the original and edited model in the same renderer, rather than interpreting a Blender-only render as proof of runtime fidelity.

## Surface-frame stitching trial

Run `node tools/guardian/experiment_worker_normal_seams.mjs` from the repository root. It checks the exact source SHA and writes only test-results/olderFemale-normal-seam-trial.glb plus a JSON receipt. Open `/tests/browser/actor-expression.html?actor=olderFemale&normalSeamTrial`; compare with `?actor=olderFemale&original`.

The experiment samples the original normal map at UV seam vertices, transforms those sampled normals into mesh space using the existing tangent frame, and rotates both NORMAL and TANGENT toward a common seam normal. It limits the operation to reviewed face bounds, excludes groups with differing base normals beyond 0.5 radians, and rejects corrections over 25 degrees. 162 groups are modified. The texture images are byte-identical; vertices, indices, weights and animation tracks are not edited. The original file is explicitly checked unchanged.

Front and side inspection show reduced upper-cheek discontinuities while forehead wrinkles remain visible. The diagonal lower-cheek/jaw seam remains, so this is not accepted as a finished repair. Nearest-texel sampling at atlas boundaries is provisional: inward/bilinear sampling, edge continuity between vertices and angular lighting sweeps still need investigation. This trial operates on the unmodified original, not the expressive mesh; it must not replace the current expressive candidate or gameplay catalog.

The glTF validator reports 473 non-unit vector errors and 37 warnings on BOTH the original and trial, with identical code totals (validator.json). This is not a validator pass. The expressive v4 export has a separate clean-error report and must not be conflated with this experiment. No full game or animated expression validation is claimed for the trial.


## Bilinear transfer to the expressive candidate

The next iteration samples texel centers bilinearly and extends the face region back to z=0.08. It edits 185 source seam groups. A binary write whitelist confirms that all data outside NORMAL/TANGENT is unchanged. trial-bilinear.json records it.

`content/source/actors/olderFemale/surface-candidate.glb` is a separate, still uninstalled result. Its editable geometry remains in expressive-candidate.blend; expressive-candidate.glb is the unmodified base export. Reproduce from the repository root:

```
node tools/guardian/experiment_worker_normal_seams.mjs
node tools/guardian/transfer_normal_frame_corrections.mjs public/assets/4c3d590d278e3fc979257b71502ed8b151e5821972e192c19f0228004d70d141.glb test-results/olderFemale-normal-seam-trial.glb content/source/actors/olderFemale/expressive-candidate.glb content/source/actors/olderFemale/surface-candidate.glb
node --test tests/worker-normal-frame-transfer.test.js
```

The transfer resolves the Blender-baked constant translation, checks position/UV/normal correspondences and restores explicit tangents. 20,750 vertices match exactly; 83 incision vertices use barycentric interpolation in original triangles, with at most 1.001 mm surface separation. One substantially reauthored normal retains its generated frame. It rotates the sparse mouth normal deltas consistently; POSITION morphs, skin weights, animation accessors, images, materials and nodes are unchanged. The real-asset regression checks every non-normal accessor and embedded image, as well as nodes, skins and animations. It passes.

The first transfer produced checkerboard shading around the incision because new vertices used unrelated generated tangents. Interpolating their original surface frame removes that defect; a neutral and combined mouth/blink inspection in Three.js confirmed it. The surface candidate validates with zero errors and two existing non-root skin warnings. It restores TANGENT rather than relying on runtime tangent generation. Its output fingerprint is in surface-candidate.glb.transfer.json.

Open actor-expression.html?actor=olderFemale&expressiveSeamTrial. The fixture now has studio and left/right raking-light controls, and reports the selected lighting. A left raking-light inspection still exposes angular cheek discontinuities (expressive-raking-left.png). Therefore this is partial progress, NOT final material acceptance and NOT an installed gameplay replacement. The next investigation must include triangle interiors and lighting-dependent continuity; seam-vertex agreement alone is insufficient. The source texture bytes, including wrinkle detail, remain intact.

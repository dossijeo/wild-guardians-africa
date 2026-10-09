# Optional large-tree camera exclusion foundation

The existing building/camera-motion QA now accepts resident native trees in the same spatial index. Normal gameplay protection remains disabled; existing building-only QA remains unchanged unless `trees` is explicitly requested.

```js
world.setCameraExclusion(true, {
  trees: { minimumSize: 4, margin: { horizontal: 0.4, vertical: 0.2 } }
});
// Return to the existing camera behavior and release both registries:
world.setCameraExclusion(false);
```

These are experimental world-unit margins, not visually approved distances. Only group-0 native trees are indexed. Small trees can be excluded by scaled maximum dimension; crops, workers, animals, shrubs and distant billboard populations are not indexed. Finite Y bounds retain overflight. Volumes match the high-detail source geometry, authored pivot, chunk origin, parent transform and procedural nonuniform scale/yaw. No model resources are cloned or disposed by the registry.

Unchanged chunk revisions return before allocation or scene-matrix work. Streaming and suppression revisions compare cached batch/parent descriptors and rebuild only changed chunks. This relies on native batches owning immutable logical instance data/source geometry. If a QA client edits those objects or transforms in place, call `world.cameraExclusion.trees.invalidate(chunkKey)` before the next pose update. Do not use a stale revision after editing native data. Removal clears only owned tree IDs, preserving building descriptors in the shared index.

Forty-eight directed camera tests pass. New cases cover 1,000 unchanged sync calls without scene work, chunk removal/replacement/suppression/restoration, transformed offset pivots, finite roof clearance, small/non-tree exclusion, shared-index/resource ownership and malformed replacements. The six-biome test reads actual packed high-detail position buffers and native scatter data at seed712/chunk0, checks IDs/world centers and unchanged logical descriptors. It does not render images or validate wind, silhouette, all camera gestures, visual margins or mobile performance.

Two initial negative logs are retained. An empty bounds replacement initially bypassed validation through the minimum-size filter; validation now precedes filtering and retains the old chunk on malformed replacement. The first native fixture incorrectly assumed every pack supplied min/max metadata; Canyon, Desert and Mangrove require actual packed position bounds. The corrected test uses that production source route. Neither negative is hidden or reported as a successful run.

Production build passes (9.14 s), browser-script syntax passes and the relative web-package check passes (711 files). No new renderer, GPU buffers, assets or render loop are introduced. No CPU/GPU benchmark, visual acceptance, mobile acceptance or whole close-camera feature completion is claimed. CUA still fails to initialize its kernel assets, so rendered acceptance remains open. Near-camera fallback fade and category-specific visual tuning are still pending.

Reproduce:

```powershell
node --test tests/camera-tree-registry.test.js tests/camera-building-registry.test.js tests/camera-model-volume.test.js tests/camera-volume-index.test.js tests/camera-volume-sweep.test.js tests/camera-volume-rotation.test.js tests/camera-exclusion-path.test.js tests/camera-exclusion-motion.test.js tests/camera-terrain-exclusion.test.js
npm run build
npm run verify:browser-syntax
npm run test:web-package
```

The receipt hashes raw uncompressed logs, source and the six biome packs/binaries. It records the runtime base before this optional QA extension; exact post-edit source hashes identify the tested candidate.

A subsequent [native-data CPU registry experiment](cpu-registry/README.md) measures exact indexed/direct query parity and streaming updates across six biomes. It is not a rendered GPU/control benchmark or activation approval.

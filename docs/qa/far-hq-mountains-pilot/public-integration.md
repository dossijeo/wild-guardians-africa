# Public HQ mountain integration

The configured gameplay far-vegetation profile selects `backdropHQ:true` for all six biomes. Direct experimental adapters keep the legacy backdrop unless explicitly configured. `backdropHQ:false` remains a comparison/fallback option. The new files have distinct `*-hq-backdrop.webp` names; historical atlases and negative source experiments remain available.

The user explicitly requested high-quality mountains generated with imagegen. All twenty-four selected source pictures, generation/edit prompts, source hashes and pinned export contracts are retained under `assets-source/far-backdrops-hq`. The renderer does not generate images, load those PNG masters or read export manifests during gameplay.

Each active biome uses one 2048×512 day atlas, four distinct silhouettes with broad valleys, one sampler and one merged 96-triangle mesh. Existing global day/night tint, fog and bounded horizontal parallax apply. Base fog grades the contact with the existing horizon without additional texture reads. The altitude datum is sampled once at the first persisted village; camera translation and elevation do not move the mountains vertically. Numeric and string forms of the same world seed select the same decorative orientation. Terrain, colliders, tree atlas recipes and gameplay state remain unchanged.

## Reproduction

Use the dependency versions in package-lock.json: Sharp 0.35.5, libvips 8.18.7 and WebP 1.6.0. The individual export tool rejects mismatched encoder versions, source hashes, frames and output bytes. It preserves source aspect ratio with a uniform crop/resize and transparent padding; the odd-width Volcanes source gains one transparent column rather than being stretched.

```
node tools/prepare_mountain_backdrops.mjs --check
node --test tests/mountain-backdrop-profile.test.js tests/far-vegetation-ownership.test.js tests/far-vegetation-profile.test.js tests/biome-backdrop.test.js tests/mountain-arcs.test.js tests/mountain-arc-composition.test.js tests/hq-mountain-export-contract.test.js tests/mountain-source-color.test.js tests/mountain-lod-diagnostic.test.js tests/native-far-gpu.test.js tests/native-far-render-signature.test.js tests/world-load-cancel.test.js tests/shadow-cache.test.js
npm run build
npm run test:web-package
```

Omitting `--check` regenerates the six public files and `src/rendering/mountain-backdrop-profile.js`. All six exports are validated in staging before any public write. Check mode compares their complete bytes and generated module without rewriting public assets. Runtime profiles retain the SHA-256 and byte count of every approved atlas. The six compressed files total 4,700,560 bytes. Estimated decoded RGBA8 texture storage with mips is 5.33 MiB for the active atlas, not the compressed file size; this is an estimate rather than a driver memory measurement. Original and HQ textures coexist only in the QA comparator.

## Native review and limits

Selected directions were reviewed in all six biomes during day and night. Root receipts preserve full 73-pose rotations and the inspected PNGs separately. Volcanes v1 had floating horizontal ends and was rejected; v2 fixes those sources. Cañón D v1 had an effective peak of only about 25.49 m and disappeared behind the plateau; the dedicated D v2 source and 110 m arc reach about 75.32 m. Root reviewed D v2 at yaw 275°, elevations 80/120, day/night, source `1f9acab5`, with a fixed 2.36 m datum and no GL/JS errors. Mirrors, shifting all mountains down 30 m and camera-following altitude remain documented negative experiments.

The continuous Cañón path completed 161 poses with unchanged simulation state and no errors. The root Sabana comparison on `68dcda06` used a visible 1280×720 DPR1 buffer, four blocks of 120 timer queries, equal camera/state/chunks/revisions and no disjoint samples. GPU medians were A 15.193/14.449 ms and B 14.244/14.100 ms; draws remained 54 and triangles changed 685275→685243. This local comparison supports bounded cost in that scene, not a general FPS claim. Baseline drift and the live CPU campaigns are retained as limitations. The preceding hidden-to-visible attempt changed the viewport and is excluded.

Padding and UV insets protect atlas cells at normal footprint levels. CPU mip diagnostics retain possible cross-cell mixing at level 5 and beyond; selected native derivative-debug views showed lower levels. Default mipmaps are retained. These observations do not establish all-angle shimmer freedom, physical mobile acceptance, every biome's timing or pixel equality across all poses.

The public-route fixture uses the normal WorldScene configured profile, rather than manually installing a cache-backed adapter:

```
http://127.0.0.1:5192/tests/browser/hq-mountain-horizon.html?biome=gran-canon&runtime=1&elevation=80&yaw=275
```

Its receipt records `runtimeHQ:true` and the public atlas URL. Native controls provide phase, yaw, elevation, translation, continuous path, export and close. Cached historical comparisons explicitly request `backdropHQ:false` before supplying their own atlas/layout, preserving the original comparison scope.

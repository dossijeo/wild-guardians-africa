# Complete-set validation and installation

No production change occurs during preparation or validation. The complete manifest is only published after all 44 generated runtime atlases (22 species, including two original Canyon species) pass source/output hashes and transparent-RGB checks.

1. Convert each candidate with `prepare-imagegen-tree-atlas.mjs --biome NAME --slot N --phase day|night`.
2. Run `node tools/experiments/stage-imagegen-tree-atlases.mjs`.
3. With the isolated QA Vite server on port 5220, run:

```
node tools/experiments/validate-imagegen-biomes.mjs
```

The default is all six biomes × day/night, sequentially. A subset can be resumed using explicit arguments such as `manglares:day gran-canon:night`. Incomplete staging fails before launching Chrome. Every job captures 1920×1080 normal, ground-level and horizon views, with fixed seed/time. It audits actual texture response paths/status, renderer prelit state, night amount, pending preparation and console/page errors. Each `validated.json` records the manifest SHA256, so replacing any staged asset requires renewed validation under the new manifest.

Output: `all-biomes-validation/BIOME-PHASE/`. The PNGs still require human/artistic inspection; automated checks do not certify visual quality.

After all twelve jobs pass and their images are accepted:

```
node tools/experiments/install-imagegen-tree-atlases.mjs
node tools/experiments/install-imagegen-tree-atlases.mjs --apply
```

The first command is a dry run. Both require current hashes and twelve matching validation records. Installation backs up all existing runtime atlases and the manifest outside `public`, replaces the 44 existing WebP paths, and publishes the manifest last. It attempts rollback from the backup on failure. Run during development maintenance, not while starting new game sessions: the filesystem does not provide one atomic operation for all 44 files.

Only runtime WebPs and the normal production manifest are installed. No candidate PNGs, QA captures, reports or QA paths enter `public`; no duplicate directory of old runtime atlases is created. The existing Vite public pipeline therefore includes only the selected runtime files in itch.io and Tauri. A fresh build/package audit must still verify both distributions after installation; this script does not claim that build validation has already passed.

The incomplete-set guards were exercised at 15/44 and correctly stopped validation and installation before rendering/writing production files. Full twelve-job execution remains pending the complete generated set.

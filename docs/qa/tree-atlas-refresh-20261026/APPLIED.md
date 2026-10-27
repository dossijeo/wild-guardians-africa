# Image-generated tree impostors — applied 2026-10-26

User approved the generated direction. All 22 tree species now have generated day/night atlases (44 total), including the two original Gran Cañón species. Other five biomes use the approved replacement models. Production paths are unchanged; public/content/far-vegetation.json points only to runtime assets.

## Validation

- Twelve real Chrome/WebGL game runs: six biomes × day/night, seed712, medium quality, 1920×1080. Normal, ground-level and horizon PNGs are in all-biomes-validation. Each validated.json records the exact candidate manifest hash.
- Loaded resource URLs/status, prelit shader state, day/night uniforms, preparation completion and console errors checked. All twelve passed.
- Images inspected across all six biomes. Canyon ground-level camera contains few/no trees; its horizon captures contain only sparse trees, so this is weaker visual coverage than Manglares/Sabana. Original species bounds and both atlas grids are separately checked.
- Production-installed smoke test uses the actual production manifest with no atlas URL override; all eight Manglares runtime textures fetched successfully, no errors. The normal screenshot was visually inspected.
- 32 focused tests passed: asset dimensions/bounds/hashes/transparent RGB, light recipe admission, angular LOD, resource ownership and cancellation.
- npm run build passed. Distribution audit verifies all44 packaged texture hashes and RGBA1024² format, without QA images entering dist. Tauri uses this same frontendDist. A native Tauri installer was not built.

## Transparency

Exact lossless WebP encoding and zero RGB at alpha0 are required for these linear-premultiplied textures. Default WebP encoding previously changed transparent RGB, producing colored mipmap halos. The corrected pipeline retains generated alpha, converts in linear light and uses exact:true. See TRANSPARENT-RGB-FIX.md.

## Size limitation — do not claim distribution acceptance

New atlases:47,410,534bytes (45.2MiB). Previous44:20,530,912bytes. Increase26,879,622bytes. Atlas count/resolution and nominal GPU texture residency are unchanged (eight1024² RGBA textures with mipmaps ≈42.7MiB for a four-species biome; Canyon half). This is not a new FPS benchmark.

The full dist now totals521,875,003bytes. Estimated same build with previous atlas bytes:494,995,381bytes. npm run test:web-package fails its500,000,000byte limit. This regression is caused by the larger lossless artwork; it is not attributed to unrelated assets. Do not ship/claim itch or Tauri packaging acceptance until that size issue is resolved. The size gate has not been raised. A near-lossless encoding probe at quality90/80/70/60 did not reduce the tested atlas, and was not adopted. No lossy RGB workaround is accepted without renewed visual/alpha validation.

## Reproduction

1. Convert candidates with prepare-imagegen-tree-atlas.mjs for each biome/slot/phase.
2. stage-imagegen-tree-atlases.mjs validates44 hashes and writes the complete manifest.
3. validate-imagegen-biomes.mjs records twelve cases against that manifest.
4. install-imagegen-tree-atlases.mjs --apply installs only a fully validated set and preserves a local backup outside public.
5. npm run build; node tools/experiments/verify-imagegen-atlas-distribution.mjs dist.
6. npm run test:web-package remains a required release gate, currently red for size only.

[Full-resolution gallery](gallery.html). No merge to main or push performed for this task.

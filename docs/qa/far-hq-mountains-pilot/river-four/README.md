# Grand River four-silhouette sources

Built-in imagegen produced three independent variants using `grand_river-isolated-v3.png` solely as style/palette reference. Exact prompts and unmodified 2172×724 PNGs are retained beside the source. Original panorama and earlier rejected candidates remain intact.

The variants provide a right-heavy lower escarpment, left rocky crown with a broad saddle, and low foothills around an open valley. Source diagnostics find zero visible colour outliers and zero pixels lost to the transparent-headroom crop at alpha byte90. B/D retain 159/175 visible pixels within their outer16px, principally low apron terrain: these endpoints still require native ground/fog integration review, rather than claiming transparent margins.

Reproduce with Sharp0.35.5, libvips8.18.7, WebP1.6.0:

```powershell
node tools/prepare_mountain_arc_four.mjs .cache/hq-arc-four-grand_river grand_river
node tools/prepare_mountain_arc_four.mjs .cache/hq-arc-four-grand_river-repro grand_river
node tools/audit_mountain_atlas_bleed.mjs .cache/hq-arc-four-grand_river
node --test tests/hq-mountain-export-contract.test.js
```

Both exports are byte-exact to the pinned source/output contract: 737754bytes, SHA256 `3ab8bd01b1026a83558a95f2bdd30677c631d6a75315f17821d1c5bf2f69c287`. Canvas2048×512, four uniformly resized960×240 tiles, padding32×8 per1024×256cell. The generalized exporter also reproduces the previous Sabana output unchanged. It rejects changed encoder/source/output and out-of-directory sources before output writes; six executable CLI regression cases pass.

CPU mip provenance is diagnostic only; it preserves the coarse-level mixing counterexample and is not proof of native GPU-selected LOD or filtering acceptance. Native four-cell composition, movement, foot contact, and day/night review remain pending. The active budget remains one atlas (about5.33MiB RGBA plus full mip chain), one material sample and one merged arc renderable. No public asset, production profile, harness or shader changed in this source-only batch.

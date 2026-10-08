# Four distinct desert silhouettes

Three independent built-in imagegen variants accompany the earlier native-reviewed single silhouette. Exact prompts and unmodified2172×724 PNGs are retained, preserving original and negative candidates. Highest mass right, left crown with wide saddle, and low central valley differ without mirrors or geometric distortion.

All four sources have zero visible extreme colour pixels and zero crop losses at alpha byte90. Outer16px visible counts A/B/C/D: 15/225/12/24; apron endpoints require native foot/contact review. All twelve CPU reference mip levels have zero visible extreme colour pixels, while cross-cell alpha mixing at coarse levels remains documented. CPU results do not establish native filtering acceptance.

Reproduction with Sharp0.35.5/libvips8.18.7/WebP1.6.0:

```powershell
node tools/prepare_mountain_arc_four.mjs .cache/hq-arc-four-desert desert
node tools/prepare_mountain_arc_four.mjs .cache/hq-arc-four-desert-repro desert
node tools/audit_mountain_atlas_bleed.mjs .cache/hq-arc-four-desert
node tools/audit_hq_backdrop_mips.mjs .cache/hq-arc-four-desert
```

Two exports match the pinned contract byte-exactly: 839410bytes; SHA256 `cf78ca8f99dafa06eadd83139d560da598deae8a21426d2f7da61bfb03c0ccdb`. One2048×512 atlas, four960×240 tiles padded32×8, same5.33MiB RGBA+fullmips budget. Native four-cell composition/movement/day-night acceptance and cost remain pending. No public assets/profile activated in this batch.

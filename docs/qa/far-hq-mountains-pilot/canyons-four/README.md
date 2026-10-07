# Four distinct canyons silhouettes

Three new built-in imagegen variants complement the native-reviewed single source. Unmodified PNGs and exact prompts are retained in assets-source/far-backdrops-hq. Original panoramas and rejected earlier versions are preserved. The compositions vary the highest ridge side, crown/saddle relationship and low open valley without mirroring or stretching.

Source crop/colour diagnostics pass all four assets: no pixels at alpha byte90 are clipped by the top181 crop and zero visible extreme colour pixels. Outer16px visible counts A/B/C/D are 0/408/0/132; lower apron endpoints still require native fog/terrain contact review. Transparent margins are not assumed from the prompt.

Pinned export (Sharp0.35.5, libvips8.18.7, WebP1.6.0):

```powershell
node tools/prepare_mountain_arc_four.mjs .cache/hq-arc-four-canyons canyons
node tools/prepare_mountain_arc_four.mjs .cache/hq-arc-four-canyons-repro canyons
node tools/audit_mountain_atlas_bleed.mjs .cache/hq-arc-four-canyons
node tools/audit_hq_backdrop_mips.mjs .cache/hq-arc-four-canyons
```

Both exports match the source/output contract byte-exactly: 692894bytes, SHA256 `e0c5daa5693fcd2358d639a3e12fd6af3daafcf8a339b8665417b719fc7cdd4e`. One2048×512 atlas, four960×240 uniformly resized tiles with32×8 padding. Twelve CPU reference mip levels contain no visible extreme colour pixels; coarse alpha provenance still mixes adjacent populated cells, retained explicitly in mip-provenance.json. Neither CPU result proves native filtering acceptance or effective LOD.

The source-only batch leaves public assets, runtime profiles and the stable native harness unchanged. Four-cell framing, all-angle day/night views and foot contact remain pending. One active atlas with full RGBA mips remains about5.33MiB; no additional sampler or night atlas is proposed.

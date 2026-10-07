# Four distinct mangrove silhouettes

Three new built-in imagegen variants complement the native-reviewed single source. Unmodified PNGs and exact prompts are retained in assets-source/far-backdrops-hq. Original panoramas and rejected earlier versions are preserved. The compositions vary the highest ridge side, crown/saddle relationship and low open valley without mirroring or stretching.

Source crop/colour diagnostics pass all four assets: no pixels at alpha byte90 are clipped by the top181 crop and zero visible extreme colour pixels. Outer16px visible counts A/B/C/D are 53/125/117/10; lower apron endpoints still require native fog/terrain contact review. Transparent margins are not assumed from the prompt.

Pinned export (Sharp0.35.5, libvips8.18.7, WebP1.6.0):

```powershell
node tools/prepare_mountain_arc_four.mjs .cache/hq-arc-four-mangrove mangrove
node tools/prepare_mountain_arc_four.mjs .cache/hq-arc-four-mangrove-repro mangrove
node tools/audit_mountain_atlas_bleed.mjs .cache/hq-arc-four-mangrove
node tools/audit_hq_backdrop_mips.mjs .cache/hq-arc-four-mangrove
```

Both exports match the source/output contract byte-exactly: 791354bytes, SHA256 `d656c67f54a6da0cf19b95ca74671d673e1be633fa9f3307202c2d3bbeca8e95`. One2048×512 atlas, four960×240 uniformly resized tiles with32×8 padding. Twelve CPU reference mip levels contain no visible extreme colour pixels; coarse alpha provenance still mixes adjacent populated cells, retained explicitly in mip-provenance.json. Neither CPU result proves native filtering acceptance or effective LOD.

The source-only batch leaves public assets, runtime profiles and the stable native harness unchanged. Four-cell framing, all-angle day/night views and foot contact remain pending. One active atlas with full RGBA mips remains about5.33MiB; no additional sampler or night atlas is proposed.

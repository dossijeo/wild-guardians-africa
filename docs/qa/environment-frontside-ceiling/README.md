# Original environment: FrontSide ceiling and paired captures

Root ran the native production WorldScene on Intel UHD Graphics / ANGLE D3D11,
medium quality, 1280 × 720, seed 712, daytime, with identical fixed inputs.
Only original biome props and their temporary solid shadow material changed side.
No models were repaired and production remains unchanged.

| Biome | Total DoubleSide | Total FrontSide | Saving | Main color saving | Shadow saving |
|---|---:|---:|---:|---:|---:|
| Sabana | 28.17 ms | 24.25 ms | 3.92 ms / 13.9% | 16.7% | 5.6%, inconsistent pairs |
| Mangroves | 27.62 ms | 22.95 ms | 4.67 ms / 16.9% | 21.4% | 2.3%, inconsistent pairs |

All four total and color pairs improve in both cases. Synthetic depth capture
saves 9.5% / 17.0%; it is absent from the ordinary total frames and must not be
added to them. Shadows have mixed pair signs: no convincing shadow-only gain.
Disabling the native static shadow cache equally exposes regeneration cost and
does not describe a normally cached static view. Read the [predeclared protocol](PROTOCOL.md).

The original reports retain 3,360 valid elapsed-query samples, actual untimed
GL culling witnesses, all blocks and CPU submission timings. Both original
material restores, no logical/geometry-identity changes, no GL errors, and both
context releases pass `node docs/qa/environment-frontside-ceiling/verify.mjs`.
Sabana console is empty; Mangroves retains an existing ANGLE shader warning about
`f_environment4`. It is a warning, not a silent omitted observation.

Root subsequently took six paired visual views: overview, nearby tree, and
opposite side in each biome. The original JPEG captures and accompanying DOM reports are
retained under `<biome>-<view>-double/front`. Lighting, camera, target and logical
input match within each pair. Original material and context cleanup is recorded.
The screenshot provider returns JPEG at 1253 × 705 while the GL drawing buffer
is 1280 × 720; original bytes are preserved with their correct `.jpg` extension.
The labelled comparison PNGs only resize and place those originals side by side.
These are fresh visual sessions, distinct from timed sessions. Their added QA
controls do not alter production files or the earlier frozen benchmark source.

Limited AI visual screening: tree forms and trunks remain recognizable, with no
obvious widespread holes or missing major tree surfaces in these views. Low
vegetation density and shadow/light differences are visible. Mangroves' near
view intersects neighbouring foliage in both variants; this exposes the existing
camera proximity problem and is not a polished gameplay framing. The opposite
view provides a more useful external comparison. This is neither human-user
approval nor exhaustive all-species, all-LOD, night, six-biome or moving-camera QA.

The measured gain justifies selective activation investigation without assuming
that every asset needs repair. These observations support the reviewed views;
they do not approve an unconditional global switch. No production activation
has been made in this experiment.

## Captures

- Sabana: [original overview](sabana-overview-double.jpg), [FrontSide overview](sabana-overview-front.jpg);
  [original near view](sabana-near-double.jpg), [FrontSide near view](sabana-near-front.jpg);
  [original opposite view](sabana-opposite-double.jpg), [FrontSide opposite view](sabana-opposite-front.jpg).
- Mangroves: [original overview](manglares-overview-double.jpg), [FrontSide overview](manglares-overview-front.jpg);
  [original near view](manglares-near-double.jpg), [FrontSide near view](manglares-near-front.jpg);
  [original opposite view](manglares-opposite-double.jpg), [FrontSide opposite view](manglares-opposite-front.jpg).

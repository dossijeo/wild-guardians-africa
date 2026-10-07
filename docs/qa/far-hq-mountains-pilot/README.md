# HQ mountain backdrop pilot

The six exports are candidates, not visually accepted replacements. Public
backdrop assets and the normal gameplay profile still use the previous artwork.
Native browser review is in progress. CPU mip checks are not GPU readback proof.

## Reproduction

From the repository root with the locked dependencies installed:

```sh
node tools/prepare_hq_backdrops.mjs .cache/hq-backdrops
node tools/audit_hq_backdrop_mips.mjs .cache/hq-backdrops
node --test tests/hq-backdrop-frame.test.js tests/biome-backdrop.test.js tests/far-vegetation-ownership.test.js
```

`assets-source/far-backdrops-hq/export-contract.json` pins all six source and
export SHA-256 hashes, dimensions, crop and encoder versions: Sharp 0.35.5,
libvips 8.18.7, libwebp 1.6.0. Generation checks every output before writing any
candidate file. The encoder uses lossless WebP effort 6 after a top-only crop
and proportional Lanczos3 reduction. All originals remain preserved.

The 2172×724 sources lose only the transparent top 181 rows, producing a
2172×543 crop before reduction to 2048×512. The original Desert image is
deliberately rejected: its crop would cut 52 pixels at the runtime alpha cutoff.
`desert-v2.png` is an imagegen edit that reframes the peaks without stretching;
its complete prompt is preserved in `desert-v2-edit.json`.

Six lossless exports total 6,040,574 bytes. One active 2048×512 RGBA texture
with mipmaps requires approximately 5.33 MiB, the same dimensional allocation
as the existing backdrop. WebP bytes do not measure resident GPU memory.
The QA comparison also loads the original texture, so its additional allocation
must not be attributed to production. There is no separate night texture.

## Cylindrical wrap

The opt-in `backdropMirrored` option maps a cylinder through UV 0..2 using
MirroredRepeatWrapping. Both reflected joins share the same edge texels;
geometry positions, triangle count, shaders and texture sample count are
unchanged. This avoids an arbitrary left/right image mismatch, but does not
establish artistic acceptance: reflected mountains and silhouette tangents
must be inspected during a full rotation. Normal API default remains false.

## Recorded controls and limits

`directed-tests.txt`: 28 tests passed, covering framing, unchanged cylinder
geometry, mirrored UV seams, shader/sample count and owner cancellation.
`cpu-mips.json`: read-only linear box-filter reference through 1×1, with zero
visible saturation outliers above 160 RGB range and zero base pixels below
the shader cutoff at every level. Real GPU filtering can differ.

The native harness is `tests/browser/hq-mountain-horizon.html`, with URL
`?biome=sabana` (also gran-rio, manglares, volcanes, gran-canon, desierto).
It compares original/HQ in fixed camera poses, offers day/dusk/night, a 73-pose
360° rotation and a 20 m lateral parallax step. Export exposes a DOM receipt;
closing disposes the world and the separately borrowed comparison texture.
It renders paused state and uploads QA UV changes, so it is **not** a valid
frametime benchmark. Native six-biome receipts, visual acceptance and a
controlled cost comparison are still pending.

## Native Sabana result: reflected panorama rejected

Root reviewed the fixed-eye Sabana harness at this branch's `f6083dd1` and
archived 73 yaw poses each for day and night, plus four screenshots, in
`savanna-mirror-counterexample`. The native world loads without JS or GL
errors and the artwork adds detail. Nevertheless, yaw 180° exposes an
exactly bilateral mesa with repeated wings; a similar reflection is apparent
at yaw 0°. This is a visual rejection of mirroring, despite continuous edge
sampling. It does not approve the other five biomes.

The geometry also stretches each 4:1 panorama across half of a radius-430 m
cylinder of height 110 m (approximately 12.3:1 along the arc). Next candidate:
separate asymmetrical mountain silhouettes on proportionate horizon arcs,
with joins in low/open atmospheric areas and a shared atlas/material. This
candidate has not yet been generated, integrated or accepted. Public assets
and default wrapping remain unchanged.

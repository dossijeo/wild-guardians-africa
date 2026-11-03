# Savanna atlas: KTX2 experiment

This is a development-only comparison, not a production resource conversion. The active day-31 savanna game remaps the original atlas to `public/assets/images/01e1c811b957b401a88c30717e4c0cb02f5364d925de5bba40e701718dac83a7.webp` (2048 × 2048, 534,614 bytes); measuring the larger source WebP would compare the wrong shipped file. The pilot converts that actual image, including mipmaps, to ETC1S quality 180 or UASTC effort 2 using `ktx2-encoder` 0.6.0 / Basis. It changes only the savanna biome's shared color atlas when `qa-ktx2-atlas=etc1s` or `uastc` is specified in a development build. The normal, roughness and near-tree maps remain original. No GLB has been converted.

In two Edge headless GTX 1660 isolated ABBA runs for ETC1S and one for UASTC, ETC1S was 933,756 bytes and UASTC 5,427,072 bytes, versus 534,614 bytes WebP. Both transcoded to 12 compressed mip levels totaling 5,592,432 bytes; the estimated uncompressed RGBA8 mip chain is 22,369,622 bytes, excluding allocation and driver overhead. WebP bitmap preparation took 60–75 ms in the ETC1S runs, while first KTX2 loads, including worker startup/transcoding, took 166–288 ms and second loads 41–47 ms. `initTexture` submission was 12–33 ms for WebP and about 0.70–0.96 ms for ETC1S; GPU elapsed queries surrounding that operation returned approximately 7.2–8.1 ms and 0.87–0.91 ms respectively, with no reported disjoint. These small samples are not a statistical or full-game performance claim. They do not include cold network, all mip and material variants, integrated GPUs, or actual driver memory use. Subsequent fence waiting measures elapsed completion latency rather than exclusive GPU time.

Pixel readback of the atlas rendered at 512 × 512 yielded mean absolute RGB channel differences of 8.60 for ETC1S and 3.55 for UASTC (0–255 scale); maximum differences were 118 and 58. This includes different mip generation and compression and is not a perceptual-quality verdict. The actual WebP and compressed atlas appeared visually similar in one pair of real-game screenshots at the initial camera distance (`ktx2-atlas/webp-game.png` and `ktx2-atlas/etc1s-game.png`), which is insufficient for close-up, animation, foliage alpha, ground, other biomes or multiple lighting conditions. The real-game test detected a compressed texture with 12 mip levels and 5,592,432 bytes of transcoded data; a second candidate run also confirmed an allocated WebGL texture and 1,027 scene object/material references to it, not 1,027 unique materials or visible draws. The candidate and WebP control runs used other experimental warmups, had different runtime evolution and startup times, and do not demonstrate a reproducible FPS, startup or frame-tail improvement. Current runtime keeps WebP by default.

The exploratory real-game summary is `ktx2-atlas/real-game-summary.json`. The two ETC1S runs reached gameplay in 48.11 and 47.49 s; the two WebP runs took 62.24 and 47.75 s, but a source edit occurred during the first control startup. For the 130–135 sampled gameplay intervals, p95 was 133–167 ms with ETC1S and approximately 133 ms with WebP; p99 was 233–267 ms versus 233–300 ms, with maxima 367 ms versus 233–400 ms. The fixed camera, transient workload, instrumentation, short capture and unmatched game timing do not isolate the atlas effect. These numbers are retained to avoid presenting the isolated upload gain as a reduction in real-game stalls. KTX2 is being evaluated primarily for loading, upload stalls and memory, not as an assumed FPS improvement.

Reproduction on Windows PowerShell, with Vite running on port 5175 and `sharp` / Playwright available:

```powershell
Invoke-WebRequest 'https://registry.npmjs.org/ktx2-encoder/-/ktx2-encoder-0.6.0.tgz' -OutFile '.cache/tooling/ktx2-encoder.tgz'
New-Item -ItemType Directory -Force '.cache/tooling/ktx2-encoder' | Out-Null
tar -xzf '.cache/tooling/ktx2-encoder.tgz' -C '.cache/tooling/ktx2-encoder'
Invoke-WebRequest 'https://registry.npmjs.org/ktx-parse/-/ktx-parse-1.1.0.tgz' -OutFile '.cache/tooling/ktx-parse.tgz'
New-Item -ItemType Directory -Force '.cache/tooling/ktx2-encoder/package/node_modules/ktx-parse' | Out-Null
tar -xzf '.cache/tooling/ktx-parse.tgz' --strip-components=1 -C '.cache/tooling/ktx2-encoder/package/node_modules/ktx-parse'
node tools/experiments/encode_ktx2_fixture.mjs public/assets/images/01e1c811b957b401a88c30717e4c0cb02f5364d925de5bba40e701718dac83a7.webp .cache/ktx2-fixture/savanna-color-etc1s.ktx2 etc1s
New-Item -ItemType Directory -Force 'public/qa/ktx2-fixture' | Out-Null
Copy-Item '.cache/ktx2-fixture/savanna-color-etc1s.ktx2' 'public/qa/ktx2-fixture/savanna-color-etc1s.ktx2'
$env:QA_NATIVE_GPU='1'; $env:QA_EXPECT_GPU='GTX 1660'; $env:QA_SAVE_IMAGES='1'
node tools/experiments/audit_ktx2_texture.mjs
$env:QA_LOD_WARM='1'; $env:QA_GUARDIAN_WARM='1'; $env:QA_KTX_VARIANT='etc1s'
node tools/experiments/audit_worker_attack_gl.mjs
```

Replace `etc1s` with `uastc` in the encode command and filenames, and set `QA_KTX_VARIANT=uastc` for that variant. The KTX2 transcoder path and experimental assets are intentionally development-only and are not packaged for production. The generated files under `.cache` and `public/qa/ktx2-fixture` are temporary fixtures, not authoritative game resources. The separate guardian program warmup used in the exploratory real-game pair is also development-only and can delay the first avatar draw; it requires independent visual, lifecycle and performance acceptance. A remaining observed blocker is a synchronous first-use shader query in the avatar's separate WebGL context; texture compression does not remove that shader wait.

## Foreground savanna tree pilot

The real high-resolution `tree_01` color map is a 1024 × 1024 opaque WebP of 705,474 bytes. With the same encoder settings and mipmaps, ETC1S generated 212,100 bytes and UASTC 1,139,232 bytes. Two isolated GTX 1660/Edge ETC1S ABBA runs estimated the GPU mip chain at 5,592,406 bytes for RGBA8 and 1,398,128 bytes after BC7 transcoding. Synchronous `initTexture` submission was 2.30–6.42 ms for WebP and 0.24–0.50 ms for KTX2; GPU elapsed queries were 2.54–3.31 ms and 0.23–0.29 ms, without disjoint events. Bitmap preparation took 25–40 ms, while the first compressed load, including worker startup, took 137–255 ms and the next took 14–16 ms. The size estimate excludes driver overhead and these short isolated runs do not establish the total cost of the full scene, cold network, first-use stalls or an FPS change. Raw data: `ktx2-atlas/tree01-etc1s-isolated-1.json`, `tree01-etc1s-isolated-2.json` and `tree01-uastc-isolated.json`.

The fixed tree review uses the same native 3D geometry, near UV channel, material, original normal maps and lighting for the WebP and KTX2 runs. At a 15 m camera setting, ETC1S and UASTC both loaded as compressed textures with 11 mip levels and channel 1. Comparing the right half of the full images against the near WebP reference gave mean absolute RGB differences of 0.547 and 0.177 out of 255 respectively; these means include unchanged background and are not a perceptual-quality metric. Screenshots: `ktx2-atlas/tree01-close-webp.png`, `tree01-close-etc1s.png` and `tree01-close-uastc.png`; numerical report: `tree01-close-review.json`. The labels inside each image compare the original *low-resolution* material on the left with the near material on the right; compare the right-hand trees across images for KTX2 quality.

Two opt-in real Worker raid runs loaded and uploaded ETC1S for `tree_01`, preserving channel 1; the QA scene traversal found 23 object/material references to the same texture source. Both runs confirmed two direct QA attacks; the recorded timing and camera data are in `ktx2-atlas/tree01-game-summary.json`. In a later camera probe, the raid camera director was disabled only in the QA session to retain the selected tree; the ground-constrained camera clipped part of the crown at the closest position. These runs neither compare matched game outcomes nor validate the actual close/far blend, texture visibility through movement, all viewing angles, effects or the other biomes. Do not promote this conversion on these observations alone. It also does not address character LOD textures, which need separate measurement.

To reproduce after the encoder and `public/qa/ktx2-fixture` directory have been prepared as above:

```powershell
node tools/experiments/encode_ktx2_fixture.mjs public/content/trees-near/savanna/tree_01/baseColor.webp .cache/ktx2-fixture/tree01-color-etc1s.ktx2 etc1s
node tools/experiments/encode_ktx2_fixture.mjs public/content/trees-near/savanna/tree_01/baseColor.webp .cache/ktx2-fixture/tree01-color-uastc.ktx2 uastc
Copy-Item '.cache/ktx2-fixture/tree01-color-*.ktx2' 'public/qa/ktx2-fixture/'
$env:QA_KTX_ASSET='tree01'; $env:QA_KTX_VARIANT='etc1s'
node tools/experiments/audit_ktx2_texture.mjs
node tools/experiments/audit_tree_ktx2_visual.mjs
$env:QA_LOD_WARM='1'; $env:QA_GUARDIAN_WARM='1'; $env:QA_TREE_SCREENSHOTS='.cache/ktx2-fixture/tree01-game'
node tools/experiments/audit_worker_attack_gl.mjs
```

The visual review runner always compares both encodings and requires both generated files. It defaults to a 15 m camera setting; `QA_TREE_DISTANCE` and `QA_TREE_ANGLE` change the isolated review camera. The real-game probe sets `qa-ktx2-tree-view` and affects the test camera director. The compressed texture remains behind development-only query flags and requires the separately generated local fixture.

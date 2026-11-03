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

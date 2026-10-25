# Native fern combined cost

Intel UHD 0x9A60, ANGLE D3D11, Chrome headless, 1280x720, medium, seed712. Frozen populated save; same camera path, daytime/nighttime, full 2D background, instance culling enabled. A/B/A/B; 60 warmup and 90 measured frames per GPU and separate cadence pass. No recording/encoding/build concurrent with this run.

A = existing dense round-leaf lab coverage with1024 shadows. B = native holly fern, balanced moss and2048 shadows. These deliberately have different artwork/geometry/shadows: this measures combined artistic cost, not an equal-image optimization or main comparison.

|Pass|Phase|GPU mean ms|GPU p95 ms|CPU render mean ms|Frame interval mean ms|
|---|---|---:|---:|---:|---:|
|A1|day|19.363|24.162|7.190|25.302|
|A1|night|19.998|25.337|6.780|24.866|
|B1|day|21.985|27.199|8.458|30.309|
|B1|night|23.508|28.478|8.461|29.454|
|A2|day|19.859|25.194|6.871|25.470|
|A2|night|25.303|28.888|7.836|28.008|
|B2|day|22.629|28.454|8.016|27.450|
|B2|night|22.971|29.874|7.688|28.009|

Day GPU B-A: +2.622 and +2.770ms. Night: +3.510 then -2.332ms; no stable night benefit/cost conclusion. Headless RAF intervals are provided separately, not converted to promised gameplay FPS. CPU render excludes active simulation because this fixture is paused.

720 valid GPU samples, no disjoint/discarded/unresolved queries, no recorded GL/JS errors, state unchanged. Camera paths, saved workers, target, device and resolution match. Repeat triangle sequences and initial resource counts match exactly for each variant/phase. One original-day repeat differs in draw-call sequence; do not describe the complete workload as bit-for-bit identical.

The fern cover reports60192 triangles versus129696 for the old cover at the measured pose. Nevertheless renderer triangle submissions during motion increase: the solar shadow map redraws on every sampled fern update, while the original uses more cache hits. These are whole-scene shadow submissions, not a reversal in fern geometry size.

|Pass|Phase|Shadow draws added|Cache hits added|
|---|---|---:|---:|
|A1|day|38|267|
|A1|night|38|267|
|B1|day|304|0|
|B1|night|305|0|
|A2|day|38|267|
|A2|night|38|266|
|B2|day|304|0|
|B2|night|305|0|

Resident texture objects:131 original vs133 fern; geometry counts match at corresponding starting phases. These are renderer resource counters, not VRAM measurements. The two1024 baked maps are estimated10.67MiB including mipmaps; shadow resolution memory and driver allocations are separate.

**Recommendation:** retain the native fern as an opt-in artistic candidate. Do not claim a performance win or enable its2048 shadows on low quality. Investigate solar-shadow update cost independently before changing the selected appearance. This run does not isolate normal maps, alpha cutout, ground filtering and shadow resolution individually. No new optimization is included here.

Reproduce with Vite5190:

```powershell
$env:WG_COVER_QUALITY='media'
node tools/experiments/measure-holly-fern-native-combined-20261023.mjs
python tools/experiments/audit-holly-fern-shadow-profiles-20261023.py docs/qa/global-visual-lab/holly-fern-native-combined-cost-20261023
```

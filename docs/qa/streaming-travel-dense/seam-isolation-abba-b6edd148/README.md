# Ground seam isolation: negative native ABBA

Root completed A1/B1/B2/A2 in tabs 919–922 and saved each final/disposed/console report before the next arm. All contexts were disposed/lost and tabs closed. **No consistent global frame-stability improvement is demonstrated; do not promote the runtime candidate.** No blind repetition or selective removal of arms.

Source froze at docs HEAD `b6edd1482914c795df70039c5ef859987f0c5cd0`. Runtime candidate is `4390237e82b459d6128f238a1a14eba28c8e3040`, baseline `795f773e83640d3f7541d8e3d826764c3d779750`. The sole execution change forwards the existing isolation policy to seam preparation. Both arms enable isolatePreparation; sharedPreparation is false, owned compilation/waits are false. Fixture bytes are identical. Control5398 is the repaired immutable baseline; candidate5192 is the worktree. URLs and canonical source hashes are in manifest.json. The prerequisite missing-manifest and faulty-dedup failures and the two functional runs remain in `../seam-isolation-preflight-795f773e`, rather than being erased by this timing result.

All 12 original JSON and A2 JPEG bytes are gzip-preserved with SHA-256 for compressed and decompressed data; the unchanged fixture is also preserved. Gzip used Python `gzip.compress(raw,compresslevel=9,mtime=0)`. Read-only verification:

```powershell
python docs/qa/streaming-travel-dense/seam-isolation-abba-b6edd148/verify.py
```

`verified-summary.json` reproduces nearest-rank quantiles (`ceil(N*p)-1`), 30 m position bins, trace categories, compile scopes and the individual seam event with its surrounding frames. GPU query frame indices join their matching RAF frame. Position bins use the fixture's actual applied distance, `clamp(frame.at/1000,0,15)*12`; initial negative timestamps remain in the first bin. Adapter union texture/upload counters are not summed.

## Conditions and verified gates

Paused Gran Río/Suajili historical farm e461b550, seed712, medium, 23,700 plants/1,257 living/34 workers/one structure, 180 m linear travel in15s. Native chunks/far/LOD/shadows, resident programs/textures, crate-shadow warmup and awaited actors are identical. Viewport1280×720, drawing buffer1600×900, DPR1.25, Chrome154/ANGLE Intel UHD0x9A60 Direct3D11, visible in every frame. Root/Loading/Balance confirmed quiet local CPU/GPU; other agents' handles were terminal. No exhaustive OS/thermal/power control is asserted; remote GitHub campaign jobs are not local contention evidence.

All four reports are complete with errors[]/console[]/logicalUnchangedtrue; matched initial/final camera/target/device/farm/quality/stream and25→40 created chunks. All **1,005** queries complete:250/245/255/255, zero disjoint/discard/pending/overflow/foreign/allocation failures. Separate disposed reports show context loss. Functional buffer telemetry was measured separately and is not part of these timing arms.

## Result

| Metric | A1 | B1 | B2 | A2 |
|---|---:|---:|---:|---:|
| Frame interval p95, ms |116.5|116.4|116.4|116.4|
| Frame interval p99, ms |149.7|133.1|133.1|133.1|
| Intervals >100ms |25|22|23|18|
| Frame CPU median, ms |22.4|28.4|21.1|20.6|
| Frame CPU p95, ms |38.6|40.2|32.1|32.2|
| GPU median, ms |47.95|50.42|47.61|47.80|
| GPU p95, ms |71.51|69.22|69.70|70.64|
| Standby compile calls |112|112|111|111|
| Resident merged compile calls |104|104|104|103|
| Other compile calls |12|12|12|12|

CPU/GPU are mixed and A2's control improves alongside B2. The world remains costly even when seam slow-draw observations are absent; this result does not credit a general stability gain to isolation.

Frame interval p95 / frame CPU p95 / GPU p95, milliseconds:

| Meters | A1 | B1 | B2 | A2 |
|---|---|---|---|---|
|0–30|149.7 /41.7 /79.36|133.1 /41.3 /79.86|149.6 /38.3 /78.61|133.0 /40.7 /78.15|
|30–60|123.8 /40.1 /67.15|133.1 /30.1 /65.91|116.5 /27.0 /65.75|116.4 /30.0 /66.27|
|60–90|116.3 /34.1 /64.68|116.3 /34.8 /64.50|116.2 /27.6 /64.17|99.9 /32.2 /64.61|
|90–120|133.2 /30.8 /63.20|133.0 /42.5 /62.97|116.5 /29.9 /62.28|133.0 /23.7 /62.80|
|120–150|116.4 /28.8 /55.17|99.7 /41.9 /55.83|116.2 /31.7 /55.64|99.8 /28.7 /56.92|
|150–180|83.2 /30.5 /42.22|83.1 /40.9 /43.31|83.0 /28.4 /42.73|66.7 /28.3 /41.73|

## Individual seam event: outside the measured synchronous RAF render

A1 records one `renderBufferDirect` event for unnamed MeshBasicMaterial/farGround, recipe `far-ground-native-water-mask-v1:seam-v2`, at **8228.9→8403.2 ms**, lasting **174.3 ms**. It is one duration, not an aggregate/bin. Its containing renderer call is8216.9→8403.3ms,186.4ms. Nested durations must not be added.

The fixture measures CPU only around synchronous `world.render(dt)` inside RAF; it records RAF's timestamp separately. A1 camera-update120 starts8170.1ms, its frame CPU24.3ms ends approximately8194.4ms. Six short preparation renders follow8199–8215ms, then the long containing render. The next camera-update121 starts8403.5ms, after that preparation. Thus the174.3ms draw is outside the measured synchronous world.render interval, consistent with an asynchronous preparation continuation. The trace identifies its material recipe but does not explicitly label the containing root; it cannot prove a compiler call, upload or GPU-backpressure mechanism.

Frame121 carries an earlier RAF timestamp8258.0ms despite being processed after8403.5ms; frame122's next timestamp interval is166.2ms. This explains why frame CPU maximum77.1ms does not include the174.3ms asynchronous draw. Do not equate RAF timestamps with callback start or add that draw to a frame's already measured CPU. The nominal path progress derived from event wall time is98.75m, while the last actually applied pose was frame120's timestamp8158.3ms, **97.90m**; both clocks are preserved explicitly in the verified attribution.

B1 and B2 contain no seam-v2 renderBufferDirect event above the fixture's2ms threshold. **A2 control also contains none.** Absence is a censored observation, not zero cost or zero draw count. Therefore the removed observation cannot be attributed causally to the isolation change: run order/driver/program/resource state remains a competing explanation. Actual compiler invocation wall maxima are2.8/2.7/5.1/2.2ms; they do not establish the origin of the long draw.

## Next scope, without a runtime claim

The candidate stays isolated/experimental; no runtime PR is justified by this ABBA. Both the standby-pruning and shared-resident negatives remain preserved. Before another seam optimization, a targeted read-only preparation trace should match the asynchronous seam draw to its root, exact material program key/identity and geometry upload generation, viewport/scissor and fence phase before adoption. That would distinguish repeated full-world preparation, first-use recipe/upload work and backpressure; none is proved merely by this slow call. It should sample only preparation boundaries and preserve output/ownership/cancellation, rather than adding per-frame tracing to a timing comparison. No new GPU run or repeated ABBA is authorized by this report alone.

The steady GPU cost remains roughly42–80ms by position even in B2/A2 without seam events. If the objective is the overall frame p95, it needs separate pass-level attribution of the existing world drawing rather than another compile-call-count shortcut or a quality reduction. No mobile, all-angle visual, long-session RAM or general FPS acceptance is claimed here.

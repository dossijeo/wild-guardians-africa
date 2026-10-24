# Approved native Mangroves: active low profile

Source9a1050d76, Intel UHD0x9A60/ANGLE D3D11,1280x720,seed712. Existing baja profile, native holly ferns, full backgrounds and production instance culling. Two fresh-page repetitions of same saved world, day then night continuing each world. Camera8m oscillation; separate GPU/cadence passes,60warmup90samples. Simulation advances via canonical app Game module; no manual ticks. Material clock frozen and vegetation sample-driven as previous medium study. No simultaneous recording/encoding/build.

|Run|Time|GPU mean ms|CPU render mean ms|Interval mean ms|Interval p95 ms|
|---|---|---:|---:|---:|---:|
|1|day|18.230|8.257|24.726|35.000|
|1|night|19.806|12.342|28.453|34.200|
|2|day|18.350|7.476|23.167|31.700|
|2|night|19.453|12.164|28.659|34.100|

360valid GPU queries, no recorded JS/GL errors, query failures, unwanted pauses or coverage overflow. Initial day states and camera sequences identical; elapsed/workers change as required. Scene evolves differently during runs; this is not equal-workload A/B, nor a paired speedup claim versus historical medium timings. CPU metric is world.render, not standalone simulation CPU. Do not add CPU and GPU means.

Shadow renderer disabled and native shadow uniform zero verified. Fern castShadow flags remain true but are inactive globally; shadow draw counter increases0 in every phase. Final coverage0near1102far, original32triangle frond geometry unchanged. Existing low spacing.75 vsmedium.65 and40m vs48m range deliberately lower coverage cost; no new density reduction introduced. All changes are QA tools, not profile edits.

Initial renderer resources day256geometries131textures in both repeats; night268/131 and267/131. Live actor/world evolution can differ; no equal-resource or leak-free claim. Nominal counters do not measure VRAM. Whole-frame triangles average425782–447737day and690480–703022night. Scenes and clock continue evolving, so causes of day/night workload difference are not isolated.

Inspected full daytime and nighttime endpoint screenshots. Fern mass remains recognisable; missing solar shadows visibly flatten placement and canopy shape. Preserve medium as artistic reference. Low is a measured fallback candidate with average intervals below33.3ms here, but p95 exceeds33.3ms in3/4passes: no stable30fps or60fps claim, no long-campaign/thermal/streaming certification. Existing active medium study averaged34.9–39.4ms, but different evolving states and run conditions prohibit attributing a precise speedup ratio.

Reproduce node tools/experiments/measure-holly-fern-approved-active-low-20261023.mjs then python tools/experiments/audit-holly-fern-approved-active-low-20261023.py with Vite5190. Default existing baja/cards,cards. Raw queries, frame timings, state records and endpoints retained. Main/simulation/native artwork unchanged.

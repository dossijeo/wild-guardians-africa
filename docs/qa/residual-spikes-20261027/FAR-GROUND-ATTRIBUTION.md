# Far-ground incorporation diagnostic

2026-10-27. Production renderer unchanged. Same active Manglares quality-cycle fixture and controls as quality-current-provenance.json; QA wrapper additionally records synchronous far-layer operations and ground uniforms. Compressed original reports and summaries retain checksums and warnings.

The first run records slot 0 attachData at 25.985 ms. The second records 30.240 ms, with unmapped ground uniforms taking 4.900 ms. Those uniforms begin 24.440 ms after attachData starts. Nested durations are not additive. This contradicts the hypothesis that the shore mask explains most of the attachment spike.

Source inspection finds an avoidable shore mask for unmapped ground: BiomeGround.uniforms still samples 35x35 water positions while global-mangrove-substrate multiplies its contribution by uGroundMapped (zero for this far material). The near material cache requires its mask and must retain it. Removing the far mask alone would leave the majority of the measured stall.

Next attribution must distinguish BufferGeometry normal calculation, UV preparation and any missing worker-provided water data before uniforms. Do not assume which dominates or move work without measurement.

Second run: 240 advancing frames, zero paused frames, 15 installed chunks, final queue empty, 10,369.375 ms travel and 1,853.875 ms additional settling. Both runs retain 28 shader compiler warnings, so neither is a clean-console acceptance run. These are instrumented diagnostics, not interleaved performance acceptance evidence. No visual or full-frame improvement is claimed.

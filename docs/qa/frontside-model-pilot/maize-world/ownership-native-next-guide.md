# Fresh ownership QA after adapter fix

Use HEAD `90499695`, unchanged viewer SHA `f895d3d425ffce4425bd6e2b9291c21695a74925ca9fb29a5965b071e3cdb543`, and updated imported adapter SHA `71f4aa6b7a41d43c5b2b1b0d3bcfe89bc85279496d8b80c880e1421133005b38`. The prior 213bced2 captures do not validate this adapter.

Reserve one fresh native context after other GPU tasks have closed. Open `http://127.0.0.1:5284/tests/browser/frontside-maize-world.html?qaCandidate=front&qaDepth=front`, then load, day, focus and angle once. Keep the initial candidate active. The toggle button says Restore original when the candidate is active, and Activate derived when original is selected.

Run two explicit cycles:

1. Toggle to original, wait for the restored label, Compare and inspect the pair.
2. Toggle to candidate, wait for the restored-original button label, Compare and inspect the pair.
3. Repeat steps 1 and 2 once, retaining the four comparisons visible in the DOM.
4. With candidate still selected, Save/Restore. Wait for exact roundtrip and rebuilt WorldScene, then reapply Day and Focus. The saved fixture variable retains angle 1, so **do not click Angle again**. Compare again, and Finish.

Wait for each semantic status before the next click: WorldScene ready, native maize focus, comparison captured, exact SaveRepository restore, then QA saved/GPU released. A busy fixture ignores additional clicks rather than queues them. Do not infer completion from a button remaining enabled. The paired Compare itself temporarily swaps to source and candidate, then reinstalls the manually selected arm; record both the manual cycle and each completed capture.

The endpoint writes only the last exact PNG. Root should preserve visible evidence of earlier pairs separately when needed, and the raw report records all five comparison contracts. Preserve any error or unexpected result without rerunning to hide it. The fixture does not record every manual toggle in its actions array; record the interaction sequence independently rather than claiming the report alone proves those clicks.

`node tools/frontside_verify_world_maize_ownership_native.mjs <immutable-report.json>` checks five paired comparisons, source/candidate camera and logical contracts, shared growth binding reported at installation, save/restore identity with candidate active, pending review and cleanup. This is a verifier of the exported functional fields, not actual GPU ownership or visual acceptance.

Source evidence is exact: the new release handler removes only candidate attributes matching original attribute references before invoking disposal. The real Three disposal-handler CPU test proves the source growth token is retained across releases/reinstalls and that candidate-owned buffers are removed. Actual native buffer identity, binding state, changing-growth uploads and resident resources still require a separate instrumented resource campaign. Do not infer those from renderer.memory counters, still images or the previous isolated GPU benchmark. No GL probes or timing hooks have been added to this frozen viewer.

This paused sequence tests functional restoration and rendering under repeated release/reinstallation and fresh contexts. It does not change plant growth over time: `world.render(0)` plus a save roundtrip cannot establish that a changing `iGrowth` upload reaches the correct GPU buffer. The separate 12-sample CPU audit is also not a GPU-upload observation. Preserve this limitation explicitly even if all five images look correct and renderer.memory returns to its earlier value.

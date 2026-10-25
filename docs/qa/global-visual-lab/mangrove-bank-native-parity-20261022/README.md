# Native opt-in Mangrove shore

Add `mangroveShore=sediment` to the existing global lighting + mangroveSubstrate=full recipe. Defaults unchanged. Native mangrove-shore.js prepares existing water vertices with shore distance and applies gated sediment shading; BiomeGround owns land R8 shore masks through its existing shared material lifetime. No runtime experiment imports, geometry changes or new draws/passes. Mangroves do not use NativeHorizon (which supports Canyon/Desert only), so no horizon integration is required here.

Run capture-mangrove-bank-native-parity-20261022.mjs with Vite5190. Six native RGB captures are pixel-exact to retained gated QA frames: seed712/media/1280x720, three day/night poses, no captured errors. Only scene observation is routed. test-native-mangrove-shore-20261022.mjs verifies explicit option requirements and native shared-material/scene-first texture disposal.

Retain as opt-in. Prior QA benchmark and live streaming establish supporting evidence but do not replace native live-streaming verification or a native performance comparison. Initial cold-trip difference remains documented in original renderer too. Do not claim global mockup parity or merge main. Next native streaming and refreshed broader art composition, rather than more isolated shader tweaks.

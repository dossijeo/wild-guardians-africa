# Native ground-program identity diagnostic

Run37954683989/sourcebe68204d fails original primary smoke at87%; native minimize skipped, build/installer pass. Raw396677 bytes and SHA receipt retained.143 material/program associations, zero dropped, zero truncated keys.

ID20: MeshBasicMaterial/biome-ground-4.1.10.3/toon4.1.4/resident;21 material associations with position/normal/color geometry and receiveShadow true. ID23: same recipe suffix horizon-clip;one association receiveShadow false. Both are currentProgram at their individual snapshots and first observed after warm-compile-world begins, not in completed staging. Names/defines empty. Source inspection ties these to resident chunk ground and canyon horizon ground; counts do not prove exhaustive mesh consumers.

At deadline only23 remains pending;20 also remained in earlier polls. World readiness barrier12.6229s is nested in world awaited12.7348s and warm-GPU18.6251s. Polls166 cost7.0ms synchronous total/max0.2ms. Metadata70 callbacks cost1.3ms total/max0.1ms. Shader native completion remains pending through isReady; no separately measured compile/link status or physical GPU timing.

Ground shader/wrapping/horizon/quality source blobs are exactly identical to successful baseline57527dc9 (receipt lists hashes). Thus this is not evidence that PR18 newly introduced horizon clipping. Baseline had no diorama and used current-program compileAsync; current production and smoke-union candidate also change timing/fog/readiness recipes. Driver/software identity is environmental, not established cause.

The two color cache keys differ only by resident vs horizon-clip suffix; AfricanToon adds horizon uniform/discard only to horizon. A future opt-in shared Basic ground color recipe can retain the exact half-open discard with private zero bounds for resident. Three r180 refreshes material-owned uniforms on material.id changes despite shared program. This requires alternating-material binding contracts and native acceptance; no promotion, quality reduction, skipped readiness or depth-recipe unification is authorized by this identification alone.

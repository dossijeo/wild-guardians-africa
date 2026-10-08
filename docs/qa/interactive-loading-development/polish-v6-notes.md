# V6 functional framing observation

Feature515265a4, native renderer with latest main8df39a3e. Day portrait390x844 at69% and landscape844x390 at46% both show four intact maize plants, native clouds, soft terrain edge and free planting soil. These are specific frames, not complete growth/orbit/aspect acceptance. Portrait frame looks like two overlapping pairs, which needs mature/extreme-angle review.

Both native worlds reached ready and restored intended camera/logical state without errors, then explicit Dispose released context and tabs54/55 closed. The attempted portrait planting happened after readiness; no028 was expected and this does not validate planting during orbit.

The landscape URL contained time310 but the QA fixture replaced its initial preview state with Game.newGame time0. The image and JSON are correctly archived as DAY, not night. Fix the QA override before configuration so subsequent nocturnal tests use an actual consistent clock. Production new-game time is unchanged. Functional timings are not a matched performance comparison or acceptance.

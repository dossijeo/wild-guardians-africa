# V6 functional framing observation

Feature515265a4, native renderer with latest main8df39a3e. Day portrait390x844 at69% and landscape844x390 at46% both show four intact maize plants, native clouds, soft terrain edge and free planting soil. These are specific frames, not complete growth/orbit/aspect acceptance. Portrait frame looks like two overlapping pairs, which needs mature/extreme-angle review.

Both native worlds reached ready and restored intended camera/logical state without errors, then explicit Dispose released context and tabs54/55 closed. The attempted portrait planting happened after readiness; no028 was expected and this does not validate planting during orbit.

The landscape URL contained time310 but the QA fixture replaced its initial preview state with Game.newGame time0. The image and JSON are correctly archived as DAY, not night. Fix the QA override before configuration so subsequent nocturnal tests use an actual consistent clock. Production new-game time is unchanged. Functional timings are not a matched performance comparison or acceptance.

## Nocturnal native run and isolated growth review

After the QA clock fix, native tab56 at time310 displayed stars, dim blue haze and four complete plants at54%. Exactly one amb_night loop started; no extra plant was accepted in the attempted coordinates, so no farm_crop_interact was emitted. Handoff stopped ambience; camera/logical state and readiness passed, errors empty, explicit Dispose then tab close. The later screenshot is correctly named controls-ready rather than added-maize.

The isolated slider fixture reviewed V3 and V6 at identical99%/267.3 growth, static reduced-motion angle0,390x844. Mature foliage fits V6 without clipping; the compact arrangement overlaps visually into two pairs. Original V3 has barely any left margin. FOV50 to42 gives +21.5% projected linear size at identical camera-space depth, but changed focus/layout means this formula is not a measured per-plant/image-size increase. Further aspect/orbit/input and matched performance review remain required. The fixture slider is never claimed as real loading progress.

QA57 disposal reduced local geometry/program counts to0; one renderer texture remained in its disposed counter, so this is not proof of RAM/VRAM leak freedom. World disposal/context ownership needs repeated native application evidence.

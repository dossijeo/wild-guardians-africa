# V6 functional framing observation

Feature515265a4, native renderer with latest main8df39a3e. Day portrait390x844 at69% and landscape844x390 at46% both show four intact maize plants, native clouds, soft terrain edge and free planting soil. These are specific frames, not complete growth/orbit/aspect acceptance. Portrait frame looks like two overlapping pairs, which needs mature/extreme-angle review.

Both native worlds reached ready and restored intended camera/logical state without errors, then explicit Dispose released context and tabs54/55 closed. The attempted portrait planting happened after readiness; no028 was expected and this does not validate planting during orbit.

The landscape URL contained time310 but the QA fixture replaced its initial preview state with Game.newGame time0. The image and JSON are correctly archived as DAY, not night. Fix the QA override before configuration so subsequent nocturnal tests use an actual consistent clock. Production new-game time is unchanged. Functional timings are not a matched performance comparison or acceptance.

## Nocturnal native run and isolated growth review

After the QA clock fix, native tab56 at time310 displayed stars, dim blue haze and four complete plants at54%. Exactly one amb_night loop started; no extra plant was accepted in the attempted coordinates, so no farm_crop_interact was emitted. Handoff stopped ambience; camera/logical state and readiness passed, errors empty, explicit Dispose then tab close. The later screenshot is correctly named controls-ready rather than added-maize.

The isolated slider fixture reviewed V3 and V6 at identical99%/267.3 growth, static reduced-motion angle0,390x844. Mature foliage fits V6 without clipping; the compact arrangement overlaps visually into two pairs. Original V3 has barely any left margin. FOV50 to42 gives +21.5% projected linear size at identical camera-space depth, but changed focus/layout means this formula is not a measured per-plant/image-size increase. Further aspect/orbit/input and matched performance review remain required. The fixture slider is never claimed as real loading progress.

QA57 disposal reduced local geometry/program counts to0; one renderer texture remained in its disposed counter, so this is not proof of RAM/VRAM leak freedom. World disposal/context ownership needs repeated native application evidence.

## Active orbit interaction

Isolated native QA58 accepted one additional maize at screen260,250 while the actual camera angle was-5.33degrees. Published status recorded world(-2.6157,1.9399), seedling growth32.08 then267.3 after catch-up. Geometry/textures/program counts stayed11/8/5. Day/night landscape screenshots show the new plant; initial four remained complete after rotating to portrait at-5.19degrees. The extra outer plant can leave view after aspect changes. This fixture has no audio owner, so no028/audio claim is made here.

The attempted wait for-9degree pose timed out in the browser selector backend; no extreme screenshot was produced. Both extrema remain a gate. Dispose was executed and tab closed.

Remote Validate Game run37802631367 for earlier9a05db14 completed success:3254/3254 tests, all asset/audio/browser/plan/balance checks, build and web package/ZIP. This precedes latestmain merge and later fixes, and therefore does not certify current HEAD. Current local build22576 and syntax/package40118 succeeded.

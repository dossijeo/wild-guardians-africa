# WebGPU center destruction effects

The existing WebGPU center damage template now creates smoke, sparks, debris and ash chips from `createNativeDestructionEffects`, using the original noise texture, debris shape and confirmed simulation damage/time. The effects are advanced in the render Worker and do not affect damage, collisions or game state. A center restored already damaged initializes its effects without replaying a historic hit; a newly damaged center uses its previously confirmed damage. The existing WebGL path is unchanged.

`tools/experiments/audit_webgpu_center_destruction.mjs` loads the real center model into a WebGPU OffscreenCanvas Worker and exercises intact, damaged and ruined states. One run drew all three states with no uncaptured GPU errors, observing 48 smoke particles, 275 debris/ash instances and 100 emitted fragments at the end. `tools/experiments/audit_live_webgpu_center_effects.mjs` starts the real Worker game with a valid fixture whose center is already collapsing; one run observed WebGPU smoke=28, debris=231 and emitted=56 at simulation time 4.6 seconds. This is not a visual A/B or a performance measurement.

The WebGPU particle pass does not yet reproduce soft-depth blending, terrain-adjusted debris contact, local lighting, fog or the full original toon treatment. Only center effects are covered here; ordinary buildings and wall-specific effects remain separate. The test fixture starts during a collapse and does not validate a raid causing the first hit.

The combined `node --test tests/webgpu-center-destruction.test.js tests/destruction-native.test.js` run passes all 11 checks. Initial hash failures were caused by CRLF checkout of the audited native modules; `.gitattributes` now preserves their LF bytes.

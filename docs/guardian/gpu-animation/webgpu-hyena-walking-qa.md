# Experimental WebGPU hyena walking

The `qa-webgpu-baked-hyena` switch opts the Worker world into a shared baked
Walking texture for hyenas. It is disabled by default. Confirmed walking phases
drive the shader; there is no extrapolation beyond confirmed simulation time.
The original skinned rig remains the presentation path for physical poses,
other actions, and unsupported rigs. This is not a production readiness claim.

On 2026-11-04, an Edge WebGPU test reported an NVIDIA Turing adapter. The
actual hyena GLB compiled and rendered with the TSL skinning nodes, textures,
morph targets and directional shadows. At five phases (0, 0.15, 0.25, 0.5,
0.75 seconds), corresponding original and baked 800 x 600 captures had
respectively 2, 668, 3328, 1 and 12556 pixels whose maximum channel difference
exceeded 3/255. The largest whole-image mean absolute channel difference was
0.44/255. These captures are a limited visual check, not a crowd, terrain,
transition, or artistic parity review.

A second test used the existing mangrove raid fixture, a hosted authoritative
simulation Worker and an OffscreenCanvas WebGPU presentation Worker. The
fixture's hyena was initialized in `walking` to exercise this clip; the other
15 actors were retained. All 16 actors loaded. The roster reported one baked
walking actor; a confirmed Attack was accepted, the Rapier pose became active
and baked walking dropped to zero, then physical presentation released and
baked walking returned to one. No page errors occurred. Physics loaded its own
original GLB (two requests), independently of the presentation asset bank.

The normal Vite server did not answer source/HTML requests in this environment.
The integrated test used a local temporary static server adapting development
imports, WASM URL imports and JSON assertions. Its CSS imports were suppressed;
it does not validate the full playable UI, visual transitions or normal Vite
delivery. The reproducible test is
`tools/experiments/audit_webgpu_baked_hyena_raid.mjs`; its captured result is
`webgpu-hyena-walking-raid-qa.json`. Start the temporary server with
`node tools/experiments/serve_baked_hyena_qa.mjs`, set `QA_BASE_URL` to
`http://127.0.0.1:5390` and, if necessary, `PLAYWRIGHT_MODULE` to the installed
Playwright package, then run the audit with Node. Repeat through the normal game
server before considering default activation. The isolated browser fixture is
`tests/browser/webgpu-baked-walk.html`, and
`node --test tests/webgpu-baked-walk.test.js tests/webgpu-animal-roster.test.js
tests/webgpu-world-client.test.js tests/webgpu-confirmed-animal.test.js`
passed 13 tests.

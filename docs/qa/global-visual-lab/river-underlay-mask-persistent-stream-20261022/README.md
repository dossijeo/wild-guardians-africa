# Persistent River underlay: settled streaming probe

Run `node tools/experiments/capture-river-underlay-mask-persistent-stream-20261022.mjs` with Vite on port 5190.

Real renderer, seed 712, media, 1280x720, frozen simulation and wind, day 150 / night 350. Camera and target translate 0 / 48 / 96 / 48 / 0 units. Each stop waits for chunks and horizon then renders 12 settling frames. This is settled streaming, not continuous-motion latency or a performance benchmark.

All ten frames have 25 resident chunks and 25 mask textures, zero stale mask keys, matching material sampler ownership, zero coverage overflow, and no captured console/WebGL errors. At the far stop the resident key set differs by 20 entries (10 removed and 10 added). Return draws/triangles equal origin: 66 / 888233 in both lighting phases.

Night return is pixel exact. Day return differs in 10438 pixels, maximum channel difference 39/255, mean absolute RGBA difference 0.006812 on the 0-255 scale. Cause not isolated; do not interpret this as proven streaming parity. The origin / far stop / return contact sheets were visually inspected: coverage remains continuous and the underlay remains legible without apparent broad missing patches. This does not rule out small temporal or shading artifacts.

Next: isolate day difference with an unfiltered control and capture mask hashes, then validate actual occupancy events. No production integration yet. Prior CPU benchmark evidence remains separate; this run makes no FPS claim.

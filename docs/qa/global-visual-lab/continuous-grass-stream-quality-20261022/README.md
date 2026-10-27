# Continuous coverage: projection, runtime quality and resident streaming

Native Savanna coverage now invalidates its selection when the camera projection changes (FOV/aspect/zoom), in addition to pose/chunk/event changes. WorldScene forwards quality changes to coverage. Media/alta retain the approved recipe; baja uses the existing light module at spacing .5 and range 40; muy_baja hides geometry and skips selection, retaining the original terrain. Returning to media restores spacing .4, range 48 and refined near modules. This is an explicit quality fallback, not rejection of the richer artwork.

## Real renderer validation

Run `node tools/experiments/capture-continuous-grass-stream-quality-20261022.mjs` then `python tools/experiments/audit-continuous-grass-stream-quality-20261022.py` with Vite on 5190. Seed 712, 1280x720, fixed visual time, day 150/night 350.

- Quality sequence media/baja/muy_baja/media: scene calls 72/69/68/72, triangles 1927535/1274920/1235912/1927535, identical counters in both phases. Global quality also changes shadows and other rendering, so these differences must not be attributed solely to grass.
- Coverage near/far instances: media 2438/8703, baja 0/4876, muy_baja zero submitted (the cached 4876 remain allocated), restored media 2438/8703. Coverage arrays remain 1207752 bytes; no reallocations on quality changes.
- Settled 96-unit outbound/return path in 24-unit steps: 25 coverage chunks matched 25 resident chunks at all 18 observations, no orphan chunks/tiles, no capacity overflow, no console or GL errors. Coverage geometry stays two meshes. Overall renderer geometry/texture counts vary with streamed world assets and do not prove absence of all renderer leaks.
- FOV 42 to 65: automatic and forced selection instance buffers identical; final run images pixel-exact day/night. Earlier attempts showed full-frame differences despite identical instance counts; they were not retained as passing image evidence. The final harness records buffers and images separately. One rerun was interrupted by a Vite reload during source editing and was rerun after process termination.
- Six targeted Node tests pass, including projection invalidation, live quality changes, no selection in very-low, event invalidation and disposal ownership.

Images include each quality, nine path waypoints per phase and projection controls. Reviewed low-quality continuity, restored medium and outbound water-edge view. No new geometry enters water in the reviewed view.

## Limits

These are settled waypoints, not a continuous-motion benchmark/video. No GPU timing or FPS improvement is claimed. Paused wind permits deterministic comparisons but does not validate temporal wind here. A/B/A/B CPU/GPU timing, rapid unsynchronized streaming, long-running resource stability, alta and portrait visual review remain pending. Runtime quality switching has functional evidence; very-low deliberately sacrifices volumetric coverage. Six-biome completion remains unproven.

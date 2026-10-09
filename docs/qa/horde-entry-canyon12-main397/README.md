# Root native twelve-body entry probe

Source `397aaa4d27720d031b47c68b08e23de9f862dd3c`, Gran Canyon/Mapungubwe,
seed712. One explicit group: four warthogs, three hyenas, two buffaloes, two
lions and one rhino. This is an entry-only diagnostic, not a planned campaign.

The root probe used `createOpeningWorld` with its ordinary paid800-coin centre,
the native terrain camera pose `(yaw0, polar1.18, distance34)`, and the active
chunk bounds of that camera eye. It passed the original `chooseRaidEntry` with
explicit preferred side0 and each species' actual presentation footprint.
No Game ticks, modified walkability, injected funds or GPU calls were used.

The [original result](result.json) retains the exact group, bounds, camera,
centre and all twelve entry/exit pairs. Assertions verified complete arrays,
native walkability for each entry/exit footprint, clear exit corridors,
pairwise separation greater than the sum of radii plus1, and unchanged
serialized simulation state across the query. Original process exit0.

The single entry query took74.2859ms and opening plus probe523.5817ms in this
environment. These are descriptive CPU wall times, not a benchmark, frame-time
acceptance, GPU cost or a claim that the synchronous fallback is sufficiently
fast. Prepared-worker reuse and fallback cost require their own evidence.

This does not prove all-biome/culture entry, every group/heading, planner
distribution, delayed or stale prepared replies, physical arrival/retreat,
rendering, save compatibility, or responsible/negligent campaign balance.
The probe inspected current-main entry machinery; the horde candidate remains
isolated and its economic outcomes remain unverified.

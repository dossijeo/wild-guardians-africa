# Short physical yields: isolated native validation

Candidate developed from `e840fdc6` in a separate sparse checkout while the Q9 seed-123 zarzas campaign continues on its frozen source. The active integration checkout has not imported this candidate.

`actor-motion.js` preserves the previous long-yield choices first. Only when those fail does it try bounded 1-, 0.5- and 0.25-metre moves, including lateral directions. Every candidate retains the existing swept terrain/body checks, original body radii and identity-based right-of-way. It prepends a waypoint; native locomotion executes the movement at normal speed. No position correction, RNG consumption, damage compensation or attack-budget reduction is introduced.

The unmodified retained empalizada seed-123 night-16 failure replays through `tools/qa-native-actor-contention.mjs`. The test advances native 0.1-second ticks, checks every moving animal's terrain sweep and sequential body clearance, limits displacement to the native maximum 0.38 metres per tick, reloads after tick 21 and verifies exact final exit positions. Sequential clearance follows the engine's animal array order: earlier actors have already moved, later actors still occupy their pre-tick positions.

Result: 2,277 ticks / 227.7 additional simulated seconds; all five remaining/queued actors execute their remaining attacks and exit with zero attacks left. The raid finishes, night 16 completes and day 17 begins with no defeat. The monetary ledger is unchanged. The original snapshot remains byte-identical. This is a completion replay from a retained failure, not a new full economic campaign.

Thirty-one tests pass across actor motion, paid-defense retreat, incremental grid exit and the new contention replay. These include the recorded five-animal Musgum traffic, fallen workers, paid-defense nights 31 and 39 and reloads. An initial sparse-checkout run lacked four historical fixture files; after checking out those unchanged fixtures, the complete suite passes. No failing fixture was removed or weakened.

The first checker incorrectly used pre-tick positions for all blockers; it rejected the second actor following an already-moving first actor. The corrected checker uses native sequential update order and retains all physical assertions. The rejected diagnostic run is a checker issue, not evidence that collision checks can be omitted.

The standalone final replay took approximately 3.09 CPU seconds locally; this includes navigation, assertions, native attacks and reload. It is not a frame-time or GPU benchmark. Fallback search is finite: at most five original directions plus twenty-one short directions per yield proposal. Rendering/mobile performance and full frozen campaign replay remain unverified. Do not treat this isolated branch as approved hundred-night balance or merge it into main.

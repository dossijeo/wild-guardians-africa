# Legacy marginal animal retreat recovery

The exact Desert/Suajili night9 snapshot from run37871996318 retains lion8183 at (103.879397,17.845155), radius0.85, six unused hits. Its west footprint sample has slope0.5006139286, above the unchanged ordinary limit0.5. PR9 fractional connectivity alone cannot leave an already illegal origin. Original failures and root landing-prevention evidence remain in `docs/qa/campaign-ci/desierto-suajili-failure-37871996318/`. This follow-up starts from main3324d17d, which already prevents new illegal physical landings.

## Physical recovery

The exception applies only to an already marginal **retreating** actor: initial five-point footprint slope strictly above0.5 and at most0.51. A legal waypoint is at most0.5m away. The helper retains native solid sweeps and original biome fluid rules, checking excess over0.5 at intervals no greater than0.025m. Excess cannot increase. During the actual first segment, dynamic bodies run first, fluid occupancy stays checked at every physical landing, and the real landing's slope excess cannot increase either. The ordinary strict limit resumes as soon as the first legal waypoint is consumed.

The proof is memoized by actor, navigation epoch, radius, route array, first waypoint and last physical position. Geometry, route or waypoint changes invalidate it. Stationary failed searches are memoized; ordinary legal routes cache that no recovery applies. No fields or flags are added to saves: restoration revalidates the existing first waypoint from the current marginal position. No teleport, radius/speed/hit changes or ordinary terrain-limit changes.

Search has at most160 candidates (32 directions at distances0.1–0.5m) per changed recovery origin, at most20 fine intervals per candidate, and a native tail query only after a candidate's complete prefix passes. Failed searches do no repeated candidate/tail work until invalidation. Proof creation is not repeated per frame; during the exceptional substeps only the five footprint samples of the actual endpoint are evaluated. Outside the first segment, all normal route and endpoint checks stay active. Technical search failure never proves that the world is physically enclosed.

## Validation

- `regression-before.txt.gz`: both exact legacy snapshot tests fail against main3324d17d source, preserving the negative.
- `directed-tests.txt.gz`: first86 directed tests pass.
- `directed-final.txt.gz`: **87/87 pass** after adding the explicit failed-tail budget case. Includes original snapshot dt0.1/1, save/load inside its tiny exit at both dt values, fresh native9 with no illegal lion landings, earlier Saheliana25/28 cases, worker recovery, body traffic and other-biome retreats.
- Negatives cover non-retreating states, slope above0.51, fluid masks/strips, solids, uphill excess, body blockage, off-prefix/backward motion, navigation epoch changes with new wall/shield, same-array waypoint mutation, a narrow real intermediate slope/fluid landing, and strict tail clearance.
- `npm run build` passes with exit0; output and receipt archived. No GPU test or full100-night campaign rerun.

The original lion physically reaches its original exit and day10 mandatory hiring after5.7s at dt0.1 /6s at dt1. Maximum displacement is0.38/3.8m respectively; its six remaining hits are unchanged. The first legal waypoint is (103.91766562965933,17.93754304536908), **0.1m** from the legacy origin.

## CPU diagnostics and limitations

Reproduce: `node tools/qa_animal_legacy_slope.mjs`. Windows / Node20.11.0. These diagnostic runs coexist with root integration CPU checks; they are **not isolated performance acceptance** and make no GPU/frametime improvement claim.

`replay-after.json` retains the first standalone cold result: recovery43.76ms, four walk queries, one native tail and3564 slope calls; native replay max tick40.92ms (dt0.1) and23.63ms (dt1). `replay-phases.json` preserves a slower instrumented67.01ms run:59.70ms generating four collision/navigation chunks. Walk, sweep, tail and chunk phases are inclusive/overlapping and must not be summed.

`replay-production-order.json` repeats the actual precedence of native16/32/64 routing before recovery. The preceding native queries cost49.77ms with cold chunks; the recovery after those queries costs **0.94ms**. Its separate standalone phase is62.46ms, including54.12ms generating the same four chunks. All outliers remain archived. This attributes most standalone cold cost to existing lazy procedural collision preparation; it does not remove that cost or claim a hard millisecond deadline. The finite one-off recovery is a correctness repair for an old marginal save, not a general optimization of camera travel or a relaxed routing mode.

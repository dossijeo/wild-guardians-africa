# Three settled windows in one browser session

After the same stream traversal, simulation paused and camera fixed. Two seconds of stable sampled resource/state values and no reported regional preparation precede three 10-second windows. Exact before/after equality for elapsed/time, camera/target, resident keys and renderer geometry/texture/program counts. Shader animation and driver scheduling are not frozen; counts do not prove identical draw submissions.

CPU P95 9.335 / 8.930 / 9.290 ms. GPU query P95 33.039 / 30.481 / 28.719 ms. RAF P95 49.810 / 49.780 / 34.420 ms; maxima 66.985 / 66.985 / 49.995 ms. No page/console errors. Variability persists without streaming or simulation advancement. This does not prove its cause, nor quantify an active-game optimization; static windows differ from earlier moving scenes.

Initial attempt was explicitly aborted for an invalid readiness field, then corrected to preparationPending(). No failed result was accepted. Further attribution must distinguish shader animation, actual submitted work, GPU/driver waits and host activity. Do not infer thermal causes or change the art based solely on these counters. Runtime unchanged; QA only.

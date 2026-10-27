# Route-progress recovery experiment — rejected

The direct-distance timer can call a valid bent route stalled. The observer-only
trace in `route-progress.md` found 31 of 31 destination-stall recovery events
linked to late worker overlaps had moved at least 0.75 m and shortened the
recorded remaining route by at least 0.75 m in the sampled window. This is a
real detection error, but removing the recovery trigger alone is not a safe
fix for the full simulation.

`route-progress-recovery-rejected.patch` contains the isolated candidate and a
directed test. For workers, it sampled the remaining polyline distance at most
once per three simulated seconds. A change of at least 0.75 m reset the
destination-stall timer. The unchanged stationary timer could still trigger
the bounded collision escape. It did not change animal movement.

The 59 applicable actor-motion, native-home, wall, and return-route tests passed
(three tests skipped). The same uninterrupted 14-night Sabana/Mapungubwe/712
native-intent campaign gave:

| Measure | Baseline | Candidate |
| --- | ---: | ---: |
| Late worker overlap pair-ticks | 43 | 9 |
| Phased late worker overlap pair-ticks | 42 | 7 |
| Collision recoveries | 164 | 40 |
| Deliveries | 1,317 | 1,257 |
| Ending coins | 899 | 773 |
| Living crops | 145 | 133 |
| State SHA-256 | `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05` | `ad28fa1588764d3f42d448809df5ef5c536f3673c5d28e8d55fa737b9e21bb57` |

The candidate preserves static clearance but leaves more workers waiting behind
mobile bodies; its economic and agricultural outcome is worse. The experiment
is therefore **not integrated**. The underlying false-stall detection remains
documented. A future fix needs a physically separated way through contested
passages, or a bounded recovery that does not allow body overlap, before
removing the existing escape behavior.

Reproduce from a checkout with the patch applied:

```powershell
node --test tests/actor-motion.test.js tests/spatial-native-worker-home.test.js tests/spatial-wall-deferred-commit.test.js tests/worker-return-route.test.js tests/worker-gate-closure-return.test.js
$env:WG_WORKER_PROBE_OUTPUT='test-results/worker-route-progress-candidate-14.json'
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine
```

The campaign probe counts overlap pair-ticks in its sampled simulation ticks;
it is a correctness diagnostic, not a CPU or GPU benchmark. Its JSON report is
an ignored local output, so the commands above are the reproducible evidence.

## Follow-up: only count a shrinking route

The first candidate also reset the timer when a local detour made the route
longer. `route-progress-decrease-only-rejected.patch` removes that part: it
resets the timer only after the remaining path shrinks by at least 0.75 m. The
same 59 directed tests passed (three skipped). The 14-night campaign still
finished with only 1,257 deliveries and 773 coins; living crops fell to 129.
Late worker overlap pair-ticks fell from 43 to eight, while collision
recoveries fell from 164 to 42. The final state hash was
`9b9f38a241ccadd8bf541564245d7d9ec71f0a930954073e5e754efb9db5b813`.
This also remains experimental and unmerged. The campaign cost is not explained
solely by treating an increased route length as progress. Removing unsafe
phasing requires a way to clear contested traffic without losing deliveries.

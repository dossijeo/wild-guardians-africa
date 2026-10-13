# Night 15 retreat stall: isolated QA correction

This branch starts at balance candidate `5980e3be`. The retained good-management
Sabana/Mapungubwe seed-123 pilot completed 14 days, then stopped at day 15,
time 600 because the raid never finished. That run is a technical harness
failure, **not** an economic or military defeat. Its partial snapshot is
retained in `tests/fixtures/raid-retreat-day15.json.gz` (100,315 bytes).

At the checkpoint, 19 of 20 animals had gone. Buffalo `animal-14852` had no
hits left and was retreating from `(104.766, -3.063)` to its assigned exit
`(115.513, 30.522)` with no route. It was outside the farm and could move
physically to `(104.699, 0.937)`, also outside the farm. The native swept
collision and walkability tests accept that short segment. The fixed exit
connector and incremental searches had no route to the assigned exit.

The candidate retains every original route search. Only after the last
footprint connector explicitly reports exhaustion, and after 10 simulated
seconds with no route or movement, it can select a local exterior exit. Each
candidate lies beyond the live farm's plant/structure bounds and must pass the
existing full-radius `walkable` and `segmentClear` tests. No animal is removed
without physically walking to that point. If no candidate passes, the animal
remains in the raid. The alternate point is saved with the animal so reloads
retain the chosen physical route. Balance values, hit budgets and RNG are
unchanged.

`replay-candidate-40s.json` is a native replay of the retained checkpoint. It
resolved the raid in 12 simulated seconds and advanced to day 16. The prior
pilot had reached the same checkpoint and then timed out at 600 seconds. The
old replay reporter could not read this checkpoint because it assumed every
animal had a non-null path; this branch fixes that reporter. It does not claim
the 100-night campaign is complete.

Validation: 82 directed tests passed, including original-exit regressions,
Gran Cañón, live/ruined structures, save/reload and the retained night-15
fixture. The first version of the fallback failed the night-17 bridge test by
switching away from a valid pending search; the explicit exhaustion gate fixed
that regression. `npm run build` passed. The Vite bundle-size and mixed-import
warnings are pre-existing. A fresh multi-night pilot and a full campaign must
be run after this isolated fix is integrated into the experimental balance
branch; this replay is only a narrow technical validation.

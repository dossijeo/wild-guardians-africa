# Candidate 5: pressure responds to agricultural losses

Experimental branch `codex/raid-loss-pressure-response`, based on the technical
runtime `codex/raid-recovery-perf` (candidate 4). Not integrated into main.

## Cause and change

Candidates 1–4 used `max(current harvest value, EMA)` for intensity. Historical
agricultural wealth could therefore keep species composition, hit intensity,
and radius high after losses. The independent temporal term also persisted
when very little agriculture remained. Candidate 4 reduced population using
current value but did not fix the intensity calculation.

Candidate 5 uses the base harvest value of currently living plants, V:

```
P = clamp(0.45 * (night - 1) / 99 * V / (V + 1000)
        + 0.55 * log(1 + V / 1000) / log(26), 0, 1)
```

The existing candidate-4 population recovery factor remains. Its scale of
1000 is reused, without adding a second independent calibration constant.
The EMA remains persisted for historical plan validation and diagnostics;
it cannot impose a historical intensity floor on new candidate-5 plans.
Time still increases difficulty at a fixed nonzero farm value. Large farms
retain substantial late-game pressure. Empty agriculture has zero intensity
but still the existing minimum of one physical animal; this is not immunity.

This also reduces pressure-driven species mix, radius and damage through
their existing formulas. No base hit ranges, damage recipes, prices, wages,
growth, wall resistance, magic, or virtual-player strategies were changed.

## Timing and persistence

Apply the response when preparing the next night, not by removing existing
animals or changing their committed attacks. A load/readiness retry reuses
the exact committed plan/RNG, including planned waves. Saved candidate-4
plans retain the original recipe; candidate 5 is used on the following night.

The former EMA anti-withdrawal safeguard is deliberately removed from new
intensity calculation: an actual reduction in living crops reduces threat.
Do not interpret this as preserving that former anti-withdrawal protection.
Reloading or repeating preparation cannot reroll a committed raid.

## Evidence and limits

53 tests passed, zero failures/skips in the final run: pressure/budget,
migration, loss response, planning, native wave lifecycle and exterior entry.
Loss-response coverage invokes the real crop-impact function, verifies the
committed plan remains unchanged, and prepares a lower-pressure next night.
This is a functional test, not a 100-night survival campaign.

`plan-comparison.json` compares versions 3/4/5 with the native planner, seed
123, historical EMA 25000, nights 33/50/100 and several current values. The
potential/budget columns are theoretical reference HP products, not damage
actually inflicted or predicted losses. Reproduce with:

```
node tools/check-raid-loss-pressure-response.mjs
node --test tests/raid-pressure-budget.test.js tests/raid-pressure-candidate-migration.test.js tests/raid-loss-pressure-response.test.js tests/raid-pressure-plan.test.js tests/raid-pressure-lifecycle.test.js tests/raid-wave-entry-readiness.test.js
```

For example, night 33 with V=22 and EMA=25000: candidate 4 has P=0.695455,
one animal and selected potential 12; candidate 5 has P=0.006805, one animal
and selected potential 4. This is a controlled hypothetical planner case,
not the measured state of the historical campaign.

Initial negative logs are preserved: the first run exposed a test setup that
rewound historical memory; corrected to a valid following night. The second
run missed a tracked fixture because this worktree is sparse. Materializing
that exact original fixture allowed the complete final test set to run.

No claim of calibrated win rates, recovered campaign, or acceptable 100-night
balance. The candidate-4 night-41 stop was a technical retreat-path failure,
not economic defeat. That failure remains separate and must be resolved
before full campaigns resume. Do not change frozen historical source hashes
or relabel earlier results as candidate 5. A new reviewed source inventory
is required before launching candidate-5 campaigns through frozen launchers.

Risk to evaluate in native campaigns: current-value response may make recovery
too forgiving; conversely, even one attacker can destroy the last few plants.
The existing physical minimum does not guarantee recovery. Validate the
frozen good/normal/bad policies with matched seeds before proposing integration.

# Local obstacle detour for a native enclosure cut

## Frozen failure

Sabana/712, V1 recovery-count candidate, day 80 at the hiring pause: 52 living
crops in the first unprotected group. The snapshot is
`tests/fixtures/sabana712-d80-cut-obstacle-state.json.gz` (SHA-256
`ACCD1B3DCE4CFA31BC1A76685BA554529A0AF22FD403BECB5184010A7AECED88`).
The directed test performs the ordinary hire of five `olderFemale` workers
before planning. This is a geometric regression fixture, not a claim that
the balance candidate survives night 100. Both comparisons use the same
Wild Engine binary (SHA-256
`B1C0F1804905C605345ED59E3F73C8B77290803DB9C7F28180E10D1F88809BE8`).

The native cut required six modules. A rock prevented the module at
`(105.5, -6.5)`. Omitting that module left two boundary faces uncertified:
`[106,-7,105,-7]` and `[106,-6,105,-6]`. The previous plan returned
`unknown/no-certified-proposal`. Allowing the missing module through the
final preview did **not** close those faces. This is a genuine geometric gap,
not an overly strict quote check.

## Change and certification

When exactly one module of a native cut is rejected by a physical obstacle,
the planner tries a bounded one- or two-metre translation of that short
stroke. It never translates a stroke that intersects a crop or was silently
shortened to preserve worker access. The first legal candidate must pass a
new native cut under its final preview. The old boundary is deliberately
discarded: a translated wall cannot inherit its certificate. Every resulting
boundary face must be continuously blocked for the smallest animal, the
attack-reach margin must be positive, and every previously valid worker
round trip must remain valid. The ordinary quote and paid build retain legal
placement, doors and exact cost.

In the frozen case, translation by +1 metre gives six legal modules at 60
coins. The new cut has zero remaining proposed edges and 156 proved boundary
faces. The integration test buys the actual wall chain and confirms that the
native crop-group service reports `protected`. A -2 metre variant still
leaves one cut edge even though the coarser crop-group classifier says
`protected`; the renewed cut correctly rejects that variant. This is why
the crop-group classifier alone is not used as a construction certificate.

## Matched timings and validation

`tools/experiments/diagnose-topological-enclosure.mjs` reproduces the
snapshot. Four independent process runs in ABBA order, measuring only the
planner call after loading the state and resident sectors:

```powershell
$env:WILD_ENGINE_DIAGNOSTIC_HIRE_PROFILE='olderFemale'
node tools/experiments/diagnose-topological-enclosure.mjs tests/fixtures/sabana712-d80-cut-obstacle-state.json.gz
```

| Arm | Planning time (ms) | Result |
| --- | ---: | --- |
| A: `origin/main` planner | 131.9, 125.5 | `unknown`, no modules |
| B: local detour planner | 373.5, 358.4 | `ready`, six modules |

The fallback costs more on this exceptional obstacle. It changes an
inconclusive decision into a constructible, physically certified enclosure;
these timings must not be presented as a speedup. The normal planner does
not evaluate translations when its first cut contains no rejected module.

Validation: 18/18 directed topological tests, including the new day-80 paid
construction regression; 204/204 `test:playable`; production Vite build.
This patch does not change prices, damage, pressure, animal profiles or the
economic policy. Longer campaign outcomes remain unmeasured for this patch.

The native cut's 256-crop and 4096-cell local budgets still return `unknown`
for larger groups. Cases with multiple blocked strokes still need a bounded
contour search; this change intentionally does not claim to solve them.

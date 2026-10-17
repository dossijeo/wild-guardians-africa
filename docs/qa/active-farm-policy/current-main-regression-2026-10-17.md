# Current active-farm regression (2026-10-17)

The 100-night victories in `campaign-tests.txt` and `README.md` are historical results. They do not describe the current `main` behavior. The failure was reproduced at both `d51ec60684110e4d960da81ab0584fa2b8b17be3` and, after the tutorial merge, `c17aafbcaafbcaf6ca49c9f9e755dd41903baa74`.

On both commits, `node --test tests/active-farm.test.js` fails both cases: the sunflower farm and the eight-crop variant each return `defeat` where the test expects `victory`. The latter has `diversifyDay: 20`, so both runs fail before diversification can start. These failures are preserved; the victory assertions have not been weakened.

The exact sunflower test configuration can also be reproduced with:

```sh
node --input-type=module -e 'import {simulateActiveFarm} from "./tools/check_active_farm.mjs"; const r=simulateActiveFarm({days:100,profile:"olderFemale",species:"girasol",repairBelowHp:540}); console.log(JSON.stringify({result:r.result,day:r.day,completedNights:r.completedNights,money:r.money,centerRuined:r.counts.StructureRuined,gameOver:r.counts.GameOver,raids:r.counts.RaidSpawned,centerHpByDay:r.daily.map(d=>({day:d.day,hp:d.centerHp[0]??null,living:d.living,money:d.money}))}));'
```

The result is `defeat` on day 8 after seven completed nights, with 215 coins remaining, eight raids spawned, one `StructureRuined`, and one `GameOver`. Center HP after days 4–7 is 560, 560, 476, and 348; it is ruined on day 8. Live crops after days 5–8 are 15, 5, 1, and 0. One repair was requested and applied. Thus the immediate defeat condition is loss of the only center, not lack of cash. This reproduction alone does not establish which changed rule or decision caused the historical victory to regress.

This diagnostic is a fixed-plot strategy, not a competent-defense benchmark. Its defeat must not be turned into a balance target without comparisons against defended policies and independent seeds. A future balance experiment should preserve this failure as a regression datum, identify the first causal change, and evaluate any adjustment separately from physical engine correctness.

## Controlled eight-night comparison

On 2026-10-17, the same legal diagnostic was run through eight nights on `63a28057` (the `main` commit immediately before the provisional magic and raid integration `2f3a43dc`) and on `2f7b186a` (current implementation at the time of the comparison). Both checkouts installed their own locked dependencies. The command was:

```sh
node --input-type=module -e 'import {simulateActiveFarm} from "./tools/check_active_farm.mjs"; const r=simulateActiveFarm({days:8,profile:"olderFemale",species:"girasol",repairBelowHp:540}); console.log(JSON.stringify({result:r.result,day:r.day,nights:r.completedNights,money:r.money,raids:r.counts.RaidSpawned,ruins:r.counts.StructureRuined,days:r.daily.map(d=>({day:d.day,living:d.living,money:d.money,hp:d.centerHp[0]??null}))}));'
```

| Revision | Result after the eighth raid | Living crops | Center HP | Money |
| --- | --- | ---: | ---: | ---: |
| `63a28057` | Still active, day 9 | 16 | 600 | 2,116 |
| `2f7b186a` | Defeat, day 8 | 0 | Ruined | 215 |

Both spawned eight raids. The new rules in `2f3a43dc` include area crop impacts, progressive horde pressure, and multiple waves from night 6; the old planner selected an ordinary budgeted group. This comparison proves that the historical victory assertion no longer describes the current rules and that the divergence was present by night 8. It does **not** isolate one rule within the large integration commit, prove a navigation defect, or show whether a defended policy can survive. Keep the failing assertions visible until the balance lab supplies a separately validated replacement acceptance scenario.

# Lower harvest income and cheaper defenses: candidate review

User direction, 2026-10-10: reduce harvest gains and compensate activity with cheaper walls and useful construction/repairs. Responsible management must remain viable; neglecting defenses must be capable of causing defeat. Accepted player inactivity is below 25%. This records requirements and inspected current behavior, not approval of a parameter set.

## Fixed values and candidate scope

Keep initial money1500, work center800 and wages30/40. Center800 and minimum wage30 are spoken in tutorial audio. Use constant integer crop and wall prices, not an unrequested day-dependent market. Mijo33 belongs to the unpromoted e040 pilot, whereas current main has mijo11: any new candidate must state its baseline and exact mapping rather than call an experimental price a production value.

Cheaper defenses reduce responsible capital and maintenance costs. They do not directly worsen the negligent player's income. A feasible interval still depends on real protection, damaged crops, retained crop stock and paid repair completion. A negative stationary margin alone does not prove defeat before night100.

## Inspected cost ownership

Inspected main `0fb35a4c0ec313deb8697fcbdf4efd6d5ba68401`:

- `src/simulation/game.js`: `previewWallChain` assigns `cost:spec.cost` to each newly built piece. `repairCost` uses that stored target cost, proportional to damage, or its full value for reconstruction. `wallRefund` also uses the stored cost and surviving health.
- `src/simulation/money.js`: `transact` rounds a fractional charge upward at settlement. Thus a cheaper wall does not imply a proportionally identical reduction in small repairs: a positive fractional charge still costs at least one coin.
- The candidate should preserve existing pieces' original paid cost on save restoration. Rewriting it would also alter refunds. A retained fixture built at old prices cannot demonstrate candidate cheap-repair economics without explicitly reporting that historical cost.
- Automatic gates can have fractional HP. Preserve proportional damage, reconstruction and refund semantics when changing prices; do not replace them with rounded HP shortcuts.

## Required evidence before long campaigns

1. Exact integer harvest/wall mapping, reproducible balance generation and fixed audio-backed prices.
2. A legal new-game opening under those prices, including worker reserve and funds for meaningful defenses. Do not assume unchanged planting/hiring counts after economics change.
3. Paired responsible/neglect runs with the same productive and magic policy. Differences in achieved shield coverage must be measured, not introduced by disabling one arm's magic.
4. Newly paid defenses in useful positions, observed crop/structure contacts, and actual completed paid repairs. Request spam, failed placements, unreachable repairs and unnecessary rebuild/refund loops are not useful player activity.
5. Activity accounting with construction and repairs identified separately from cultivating, including inactive time. No campaign acceptance from a single late-state algebraic estimate.
6. Only after the bounded physical pilot validates protection and opening: responsible100-night and poor-defense defeat tests, followed by the full biome/culture coverage. Preserve previous failures.

## Current verification

Ran `node --test tests/balance-audio-prices.test.js tests/wall-refund-audio.test.js tests/repair-settlement-evidence.test.js` on the inspected main:13 passed,0 failed/skipped,1021.0656ms. These cover fixed-price generator guards, existing refund/audio behavior and repair-evidence integrity. They do not validate new candidate prices, historic-save migration, defensive efficacy or100-night survival. Additional candidate-specific historical-cost and new-price settlement contracts remain required.

No gameplay prices or save data were changed by this review.

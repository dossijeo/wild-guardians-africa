# Production V1 military-pressure adoption

This change activates the frozen [V1 pressure recipe](../../../content/balance/raid_pressure_v1.json)
for newly planned nights. It scales animal count, available hits and structural
damage with observed agricultural attraction from night 6 onward. The five
introductory nights retain their original animal and damage profiles. Wall
prices and HP, crop HP, economy, combat geometry, movement, species shares and
the event-driven topological player are unchanged.

The [five-biome decision record](v1-decision.md) contains two authentic narrow
100-night victories and three authentic late defeats with the same frozen
candidate and bot. This is evidence that competent management can win while
losses remain possible; it does not estimate a general win probability. The
initial 2–4% agricultural-loss hypothesis was exceeded and has not been used
as an artificial cap.

Production uses recipe version 5. Existing saved v3 night plans retain their
committed cohort until that raid ends; the next night uses v5. The QA-only v4
registration remains separate. A frozen v3 save generated on the previous
main loaded successfully with its eight planned actors, and the following
night selected v5. New v5 saves round-trip and reject a changed recipe
signature.

## Same-code production/QA parity

Two Sabana/123 14-night runs used commit `b4b32b99`, identical game/raid/WASM
input hashes, seed, bot, topology and rules. One used the new production
default; the other explicitly registered the frozen V1 candidate via the
experiment runner. The only expected distinction is recipe provenance: v5
versus v4. Both completed 14 verified physical raids with zero issues and no
coverage loss, ending with 143 crops and 1,018 coins. Every night's living
crops, money, staffing, planting, deliveries and destruction matched. All 14
raid receipts matched after removing only their pressure-recipe provenance;
animal composition, contacts, damage, targets and physical results agreed.
Serialized-state hashes differ because they include recipe version and
provenance, so they are not used as the parity criterion.

Reproduce from this branch with the normal `run-native-intent-campaign.mjs`
and `run-balance-candidate.mjs` commands, both using `14 sabana 123 good` and
the `topological` defense policy. For the normal runner set
`WILD_ENGINE_SPATIAL_ADVICE=1`, `WILD_ENGINE_DEFENSE_GATE=event`,
`WILD_ENGINE_DEFENSE_POLICY=topological` and
`WILD_ENGINE_DECISION_PROFILE=1`. The candidate runner sets these itself.
The complete compressed [production report](production-v1-sabana123-14-parity.json.gz)
and [QA report](candidate-v1-sabana123-14-parity.json.gz) retain the source and
input hashes. Their SHA-256 values are respectively
`925fb88a9c89b4c5842c1de53ab1e911cc57e97e9b21c0d95411bf21146207fb`
and `63cfa21a35c810b262da9f6f942c6eb85723c2e52cf6903a7b7d4839e3bfbc55`.

Targeted pressure, candidate, lifecycle, persistence and QA/production parity
tests passed. `verify:balance` and the production build passed. The expanded
playable suite, including the new V1 tests, passed **214/214**.

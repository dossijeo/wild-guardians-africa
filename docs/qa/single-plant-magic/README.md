# Agricultural magic targets one living crop

The previous implementation used a 2.6 m Growth area and a 2.2 m Multiply area. A single cast could affect several plants, while the visual direction calls for one crop and permits several blessings in the same plot. This change makes the simulation and VFX share a plant identity: a new agricultural spell stores `targetId`, snaps to that living plant's position, and uses a 0.79 m presentation radius. The Shield retains its 1.95 m area and physical overlap rule. Growth and Multiply may coexist, including on adjacent plants.

Preview and confirmation resolve the nearest living crop within the agricultural targeting radius. Empty ground is rejected without consuming a command. Entity selection passes its ID to confirmation, which rejects a stale or different target; direct coordinate casts resolve the crop at confirmation. `spellAt` matches the stored ID, so destroying a crop and planting another at the same coordinates cannot transfer Growth or Multiply. Multiply records its bonus on the selected crop once; harvest still fixes the value only when a worker physically picks it up. Existing saves containing legacy area spells without `targetId` retain their historical behavior until those short-lived effects expire, and the snapshot validator accepts both formats.

The game rules for duration, cooldown, wages, crop cost, growth, watering and harvest value are unchanged. Native campaign and active-farm QA policies no longer score agricultural casting by area coverage; they select the first eligible crop in their existing order. That is a necessary policy adaptation, **not** an equivalent economic strategy. Historical campaign balances and performance results must not be presented as A/B evidence for this version. Recalibration of the 100-night player policy remains separate.

Directed tests cover adjacent crops, simultaneous VFX plans, empty ground, expiry, save/load, destruction and replacement, legacy area compatibility, cooldowns, bilingual UI and physical delivery. The directed magic suite and i18n/native-policy tests pass, and the Vite build and asset verifier pass. A complete `npm test` run on 19 October 2026 executed 4,098 tests: **4,080 passed and 18 failed**. Two previous acceptance failures were reproduced against unmodified `HEAD:src/simulation/game.js` and subsequently repaired as test-fixture issues: one compared a 1e-14 clock rounding difference exactly, and the other allowed a second pressure-driven raid into a cargo-recovery fixture. Separate directed tests pass after those corrections.

Two active-farm scenarios that previously expected 100-night victories now end in defeat with one-crop magic. This is an economic/policy change that requires investigation and recalibration, not a test expectation to erase. Two other old tests cast agricultural magic on empty ground; their fixtures have been adapted and pass. The full run also found a committed-attack invalidation defect, fixed with directed regression coverage; a static SFX audit unable to trace conditional raid events has likewise been corrected. Several source-hash/evidence tests and a structure-alert test still require independent review. There has not yet been a second complete suite run after those fixes, a new campaign certification, or an in-game visual capture for this branch.

Reproduce the directed checks with:

```sh
node --test tests/single-plant-magic.test.js tests/agriculture-vfx.test.js tests/spell-placement.test.js tests/spell-preview.test.js tests/acceptance-agriculture.test.js tests/multiply-persistence.test.js tests/spell-cards.test.js tests/power-ready-audio.test.js tests/i18n.test.js
npm run build
npm run verify:assets
```

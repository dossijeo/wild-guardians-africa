# Agricultural magic targets one living crop

The previous implementation used a 2.6 m Growth area and a 2.2 m Multiply area. A single cast could affect several plants, while the visual direction calls for one crop and permits several blessings in the same plot. This change makes the simulation and VFX share a plant identity: a new agricultural spell stores `targetId`, snaps to that living plant's position, and uses a 0.79 m presentation radius. The Shield retains its 1.95 m area and physical overlap rule. Growth and Multiply may coexist, including on adjacent plants.

Preview and confirmation resolve the nearest living crop within the agricultural targeting radius. Empty ground is rejected without consuming a command. Entity selection passes its ID to confirmation, which rejects a stale or different target; direct coordinate casts resolve the crop at confirmation. `spellAt` matches the stored ID, so destroying a crop and planting another at the same coordinates cannot transfer Growth or Multiply. Multiply records its bonus on the selected crop once; harvest still fixes the value only when a worker physically picks it up. Existing saves containing legacy area spells without `targetId` retain their historical behavior until those short-lived effects expire, and the snapshot validator accepts both formats.

The game rules for duration, cooldown, wages, crop cost, growth, watering and harvest value are unchanged. Native campaign and active-farm QA policies no longer score agricultural casting by area coverage; they select the first eligible crop in their existing order. That is a necessary policy adaptation, **not** an equivalent economic strategy. Historical campaign balances and performance results must not be presented as A/B evidence for this version. Recalibration of the 100-night player policy remains separate.

Directed tests cover adjacent crops, simultaneous VFX plans, empty ground, expiry, save/load, destruction and replacement, legacy area compatibility, cooldowns, bilingual UI and physical delivery. The directed magic suite and i18n/native-policy tests pass, and the Vite build and asset verifier pass. The attempted full `npm test` run was stopped after test 386 to clear the host for isolated WebGL benchmarking; it is **not** a full-suite pass. Two failures were reproduced against both this change and the unmodified `HEAD:src/simulation/game.js`: `acceptance-clock.test.js` compares `0.05000000000001137` with `0.05` in a raid event, and `acceptance-crate-recovery.test.js` does not reach the next dawn in its fixture. The latter does cast Multiply, but the identical baseline failure establishes that this change did not introduce the failure. Both need separate investigation. No new 100-night campaign or in-game visual capture is claimed here.

Reproduce the directed checks with:

```sh
node --test tests/single-plant-magic.test.js tests/agriculture-vfx.test.js tests/spell-placement.test.js tests/spell-preview.test.js tests/acceptance-agriculture.test.js tests/multiply-persistence.test.js tests/spell-cards.test.js tests/power-ready-audio.test.js tests/i18n.test.js
npm run build
npm run verify:assets
```

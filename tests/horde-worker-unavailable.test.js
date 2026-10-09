import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {serialize} from '../src/persistence/snapshots.js';
const group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
test('Worker-disabled capped fallback is honestly pending, preserves actors and does not repeat work',()=>{
 const {s,nav}=createOpeningWorld({biome:'desierto',seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
 nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.nightPlan={at:400,group:[...group],done:false};
 const preparer=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('worker disabled');}});preparer.update(s);
 assert.equal(preparer.stats.failed,1);assert.equal(spawnRaid(s,s.nightPlan,nav),'unavailable');assert.equal(s.raid,null);assert.equal(s.nightPlan.done,false);
 const before=serialize(s),budget=nav.lastRaidEntryBudget;assert.equal(budget.exhausted,'geometry');assert.equal(budget.geometryChecks,256);
 assert.equal(spawnRaid(s,s.nightPlan,nav),'unavailable');assert.equal(nav.lastRaidEntryBudget,budget);assert.equal(serialize(s),before);preparer.dispose();
 // This is a safety/pending test, explicitly not eventual-playability approval.
});

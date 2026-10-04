import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {tutorialHandTarget} from '../src/rendering/tutorial-hand-target.js';
import {numberOf} from '../src/simulation/money.js';

for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])
for(const culture of ['mapungubwe','saheliana','suajili','musgum','etiope'])
test(`guided first seed can be watered, harvested and delivered on native ${biome}/${culture}`,()=>{
 const {s,nav}=createOpeningWorld({biome,culture,seed:712,slotId:`guide-${biome}-${culture}`});
 const target=tutorialHandTarget(s,nav,'plant');assert.ok(target,'guide offers a legal first seed');
 Game.plant(s,'guided-seed','mijo',target.position[0],target.position[2],nav);
 assert.equal(s.plants.length,1);assert.equal(numberOf(s.ledger.balance),695);
 Game.openInitialHiring(s);Game.hire(s,'guided-hire',{youngFemale:1});
 assert.equal(numberOf(s.ledger.balance),655);
 const plant=s.plants[0];let actingOutside=false;
 for(let tick=0;tick<600&&!s.result&&s.day===1&&!s.pauses.length&&!s.crates.some(c=>c.delivered);tick++){
  Game.tick(s,.5,nav);
  const worker=s.workers[0],task=s.tasks.find(t=>t.id===worker?.taskId);
  if(worker?.status==='acting'&&['initial','water'].includes(task?.kind)){
   assert.ok(Math.hypot(worker.x-plant.x,worker.z-plant.z)>=.82-1e-6);
   actingOutside=true;
  }
 }
 assert.equal(actingOutside,true,'worker actually stands beside the crop to water');
 assert.ok(plant.water.every(w=>w.status==='manual'),'all mandatory waterings completed');
 const crate=s.crates.find(c=>c.sourcePlantId===plant.id);assert.ok(crate?.delivered,'physical delivery completes during the first day');
 assert.equal(s.crates.length,1);assert.equal(s.events.filter(e=>e.type==='CrateDelivered').length,1);
 assert.equal(numberOf(s.ledger.balance),655+Math.ceil(numberOf(crate.value)));
 assert.equal(s.result,null);assert.equal(s.day,1);
});

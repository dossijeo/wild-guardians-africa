import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {tutorialHudHandTarget} from '../src/ui/tutorial-hud-hand.js';
import {syncTutorialActionPause} from '../src/tutorial/action-pause.js';
import {numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

const nav={field:{surface:()=>0},placement:()=>({valid:true,suppress:[]}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
function setup(){
  const state=Game.newGame({seed:712});state.villages[0].center={x:10,z:0};
  const records=[],profile={read:()=>new Set(records),record:id=>records.push(id),basicCompleted:false};
  const controller=new TutorialController(state,profile);controller.acknowledge();
  return {state,profile,records,controller};
}

test('completing placement immediately advances the visible text and hand without acknowledging the old instruction',()=>{
  const {state:s,controller:c,records}=setup();
  syncTutorialActionPause(s,{hudTarget:tutorialHudHandTarget(s,c.presentation())});
  Game.placeStructure(s,'center',{x:10,z:0},nav);c.update();
  assert.equal(c.presentation().id,'basic.plant');
  assert.equal(tutorialHudHandTarget(s,c.presentation()),'[data-menu="grow"]');
  assert.equal(records.filter(id=>id==='basic.center').length,1);
  c.update();assert.equal(records.filter(id=>id==='basic.center').length,1);
  Game.plant(s,'seed','mijo',18,0,nav);c.update();
  assert.equal(c.presentation().id,'basic.hiring');assert.ok(s.tutorial.seen.includes('basic.plant'));
  syncTutorialActionPause(s);assert.ok(!s.pauses.includes('tutorial-action'));
  assert.equal(numberOf(s.ledger.balance),695);
});

test('actual paid worker watering, automatic pickup and delivery advance explanations without extra clicks',()=>{
  const {state:s,controller:c,records}=setup();
  Game.placeStructure(s,'center',{x:10,z:0},nav);c.update();
  Game.plant(s,'seed','mijo',18,0,nav);c.update();
  Game.openInitialHiring(s);Game.hire(s,'wage',{olderMale:1});c.update();
  assert.equal(c.presentation().id,'basic.work');assert.ok(s.tutorial.seen.includes('basic.hiring'));
  let sawHarvest=false;
  for(let i=0;i<2900&&!s.crates.some(crate=>crate.delivered);i++){
    Game.tick(s,.1,nav);c.update();
    if(c.presentation()?.id==='basic.harvest')sawHarvest=true;
  }
  assert.ok(sawHarvest);assert.equal(s.crates.filter(crate=>crate.delivered).length,1);
  assert.equal(numberOf(s.ledger.balance),606);assert.equal(c.presentation().id,'basic.complete');
  for(const id of ['basic.center','basic.plant','basic.hiring','basic.work','basic.harvest'])assert.equal(records.filter(value=>value===id).length,1,id);
  assert.ok(!s.tutorial.seen.includes('basic.complete'),'Completion announcement still needs reading or timed dismissal');
});

test('reload preserves unfinished instructions but advances instructions whose actions already completed',()=>{
  const {state:s,profile,controller:c}=setup();
  const unfinished=deserialize(serialize(s));new TutorialController(unfinished,profile);
  assert.equal(unfinished.tutorial.reading,'basic.center');assert.ok(!unfinished.tutorial.seen.includes('basic.center'));
  Game.placeStructure(s,'center',{x:10,z:0},nav);
  const completed=deserialize(serialize(s)),loaded=new TutorialController(completed,profile);
  assert.equal(loaded.presentation().id,'basic.plant');assert.ok(completed.tutorial.seen.includes('basic.center'));
  assert.equal(completed.structures.length,1);assert.equal(numberOf(completed.ledger.balance),700);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {retireFarmHistory} from '../src/simulation/retire-farm-history.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {rational} from '../src/simulation/money.js';
import {TutorialController} from '../src/tutorial/controller.js';

test('dawn retirement keeps only living crops and references required by pending gameplay',()=>{
 const s=Game.newGame({seed:712,slotId:'retire-history'});
 const live=createPlant('plant-live','mijo',1,1,null);
 const carried=createPlant('plant-carried','mijo',2,2,null);carried.alive=false;
 const spellTarget=createPlant('plant-spell','mijo',3,3,null);spellTarget.alive=false;
 const dead=createPlant('plant-dead','mijo',4,4,null);dead.alive=false;
 s.plants.push(live,carried,spellTarget,dead);
 s.crates.push({id:'crate-pending',sourcePlantId:carried.id,species:'mijo',x:2,z:2,value:rational(9),delivered:false,carrierId:null});
 s.crates.push({id:'crate-paid',sourcePlantId:dead.id,species:'mijo',x:4,z:4,value:rational(9),delivered:true,carrierId:null});
 s.spells.push({id:'spell-active',kind:'growth',targetPlantId:spellTarget.id,x:3,z:3,remaining:2});
 retireFarmHistory(s);
 assert.deepEqual(s.plants.map(p=>p.id),['plant-live','plant-carried','plant-spell']);
 assert.deepEqual(s.crates.map(c=>c.id),['crate-pending']);
 assert.deepEqual(deserialize(serialize(s)).plants.map(p=>p.id),s.plants.map(p=>p.id));
 s.crates=[];s.spells=[];retireFarmHistory(s);
 assert.deepEqual(s.plants.map(p=>p.id),['plant-live']);
 assert.equal(deserialize(serialize(s)).crates.length,0);
});

test('old saves migrate a completed harvest lesson without inferring it from the tutorial step alone',()=>{
 const profile={read:()=>new Set(),record:()=>{}};
 const completed=Game.newGame({seed:712,slotId:'legacy-harvest'});
 completed.tutorial.step='done';completed.tutorial.seen=['basic.harvest'];
 new TutorialController(completed,profile);
 assert.equal(completed.tutorial.harvestCompleted,true);
 const skipped=Game.newGame({seed:712,slotId:'skipped-harvest'});
 skipped.tutorial.step='done';
 new TutorialController(skipped,profile);
 assert.notEqual(skipped.tutorial.harvestCompleted,true);
});

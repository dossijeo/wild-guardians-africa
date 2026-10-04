import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {resumeLoadedWorld} from '../src/app/resume-loaded-world.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {spawnRaid} from '../src/simulation/raids.js';

const nav={placement:()=>({valid:true,suppress:[]}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function paidOpening(){
 const state=Game.newGame({seed:712,slotId:'hidden-resume'});Game.resume(state,'intro');
 Game.placeStructure(state,'center',{x:-12,z:0},nav);Game.plant(state,'seed','mijo',8,4,nav);
 Game.openInitialHiring(state);Game.hire(state,'contract',{youngFemale:1});state.tutorial.step='done';
 Game.tick(state,.1,nav);return state;
}
test('continuing a paid game in a hidden document preserves all simulated state until it becomes visible',()=>{
 const saved=paidOpening();Game.pause(saved,'menu');Game.pause(saved,'hidden');
 const state=deserialize(serialize(saved));resumeLoadedWorld(state,{hidden:true});
 const frozen=serialize(state);Game.advanceReal(state,600,nav);
 assert.equal(serialize(state),frozen,'no offline money, water, damage, paths, clock or cooldown changes');
 const elapsed=state.elapsed;Game.resume(state,'hidden');Game.advanceReal(state,.1,nav);
 assert.ok(state.elapsed>elapsed);assert.equal(state.ledger.balance.n,saved.ledger.balance.n);
 assert.equal(state.events.filter(e=>e.type==='HiringConfirmed').length,1);
});
test('restoring current visibility retains mandatory hiring and removes only disposed-world interruptions',()=>{
 const state=paidOpening();Game.pause(state,'hiring');Game.pause(state,'menu');Game.pause(state,'context-lost');Game.pause(state,'runtime-error');
 resumeLoadedWorld(state,{hidden:true});resumeLoadedWorld(state,{hidden:true});
 assert.deepEqual(state.pauses,['hiring','hidden']);
 resumeLoadedWorld(state,{hidden:false});assert.deepEqual(state.pauses,['hiring']);
 const frozen=serialize(state);Game.advanceReal(state,600,nav);assert.equal(serialize(state),frozen);
});
test('an active saved incursion and shield keep damage, duration and cooldown frozen during hidden restoration',()=>{
 const saved=paidOpening();saved.time=320;Game.cast(saved,'shield','shield',saved.plants[0].x,saved.plants[0].z,nav);
 spawnRaid(saved,{group:['warthog']},nav);assert.ok(saved.raid);assert.equal(saved.cooldowns.shield,90);assert.equal(saved.spells[0].remaining,20);
 const state=deserialize(serialize(saved));resumeLoadedWorld(state,{hidden:true});const frozen=serialize(state);
 Game.advanceReal(state,600,nav);assert.equal(serialize(state),frozen);
 Game.resume(state,'hidden');Game.advanceReal(state,.1,nav);
 assert.ok(state.cooldowns.shield<90);assert.ok(state.spells[0].remaining<20);assert.ok(state.elapsed>saved.elapsed);
});

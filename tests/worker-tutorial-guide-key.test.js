import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {workerTutorialGuideKey,tutorialGuideCropHeightsCurrent} from '../src/app/worker-tutorial-guide-key.js';

test('crop growth alone does not invalidate the eligibility key, but thresholds and occupancy do',()=>{
 const state=newGame({seed:712,slotId:'guide-key'}),plant=createPlant('p','platano',0,0,'center');state.plants.push(plant);
 const key=()=>workerTutorialGuideKey(state,{toolKind:'spell',toolSpell:'growth'}),initial=key();
 plant.growth+=.5;plant.water[0].wait+=.5;assert.equal(key(),initial);
 plant.water[0].status='manual';assert.notEqual(key(),initial);const watered=key();
 state.workers.push({id:'worker',status:'walking',x:1,z:2});assert.notEqual(key(),watered);const worker=key();
 state.workers[0].x=2;assert.notEqual(key(),worker);const moved=key();
 state.pauses.push('menu');assert.notEqual(key(),moved);
});

test('only heights actually read by authority require exact crop growth',()=>{
 const state=newGame({seed:712,slotId:'guide-heights'}),a=createPlant('a','platano',0,0,'center'),b=createPlant('b','platano',5,0,'center');state.plants.push(a,b);
 const inputs=[{id:'a',species:'platano',growth:0}];assert.equal(tutorialGuideCropHeightsCurrent(state,inputs),true);
 b.growth=1;assert.equal(tutorialGuideCropHeightsCurrent(state,inputs),true);
 a.growth=1;assert.equal(tutorialGuideCropHeightsCurrent(state,inputs),false);
 a.growth=0;a.alive=false;assert.equal(tutorialGuideCropHeightsCurrent(state,inputs),false);
 assert.equal(tutorialGuideCropHeightsCurrent(state,null),false);
});

test('financial, spell, terrain-suppression and tutorial changes invalidate the key',()=>{
 const state=newGame({seed:712,slotId:'guide-revisions'}),plant=createPlant('p','platano',0,0,'center');state.plants.push(plant);
 const key=()=>workerTutorialGuideKey(state,{toolKind:'spell',toolSpell:'multiply'});let before=key();
 state.ledger.balance.n+=1;assert.notEqual(key(),before);before=key();
 state.suppressed.push('removed-prop');assert.notEqual(key(),before);before=key();
 state.spells.push({kind:'growth',x:0,z:0,radius:1,remaining:2,targetPlantId:'p'});assert.notEqual(key(),before);before=key();
 state.spells[0].remaining=1;assert.equal(key(),before);state.spells[0].remaining=0;assert.notEqual(key(),before);before=key();
 state.events.push({type:'SpellActivated',kind:'growth',benefited:true,targetPlantId:'p'});assert.notEqual(key(),before);before=key();
 state.cooldowns.shield=5;assert.notEqual(key(),before);before=key();state.cooldowns.shield=4;assert.equal(key(),before);state.cooldowns.shield=0;assert.notEqual(key(),before);
});

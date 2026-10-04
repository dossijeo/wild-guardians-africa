import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {syncTutorialActionPause,TUTORIAL_ACTION_PAUSE} from '../src/tutorial/action-pause.js';
import {tutorialHudHandTarget} from '../src/ui/tutorial-hud-hand.js';
import {tutorialHandTarget} from '../src/rendering/tutorial-hand-target.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const profile={read:()=>new Set(),record(){},basicCompleted:false};
const nav={field:{surface:()=>0},placement:()=>({valid:true,suppress:[]}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
function setup(){const state=Game.newGame({seed:712});state.villages[0].center={x:10,z:0};return {state,controller:new TutorialController(state,profile)};}
test('HUD then world guidance stops the clock through center and seed placement, without blocking commands',()=>{
 const {state:s,controller:c}=setup();c.acknowledge();s.time=290;s.elapsed=290;
 assert.equal(syncTutorialActionPause(s,{hudTarget:tutorialHudHandTarget(s,c.presentation())}),true);
 Game.advanceReal(s,30,nav);assert.equal(s.time,290);assert.equal(s.day,1);
 syncTutorialActionPause(s,{selectionOpen:true});Game.advanceReal(s,30,nav);assert.equal(s.time,290);
 const center=tutorialHandTarget(s,nav,'center');syncTutorialActionPause(s,{worldTarget:center});Game.advanceReal(s,30,nav);assert.equal(s.time,290);
 Game.placeStructure(s,'center',{x:center.position[0],z:center.position[2]},nav);c.update();assert.equal(s.structures.length,1);assert.equal(s.tutorial.step,'plant');
 syncTutorialActionPause(s,{hudTarget:tutorialHudHandTarget(s,{id:'basic.plant'})});Game.advanceReal(s,30,nav);assert.equal(s.time,290);
 const seed=tutorialHandTarget(s,nav,'plant');syncTutorialActionPause(s,{worldTarget:seed});
 Game.plant(s,'seed','mijo',seed.position[0],seed.position[2],nav);c.update();syncTutorialActionPause(s);assert.equal(s.plants.length,1);assert.ok(!s.pauses.includes(TUTORIAL_ACTION_PAUSE));
 // Hiring has its own mandatory pause; remove it only to isolate the clock assertion.
 Game.resume(s,'hiring');Game.advanceReal(s,.5,nav);assert.ok(Math.abs(s.time-290.5)<1e-8);
});
test('informational readings run; automatic text dismissal retains the hand; explicit dismissal releases it',()=>{
 const {state:s,controller:c}=setup();syncTutorialActionPause(s);Game.advanceReal(s,1,nav);assert.ok(Math.abs(s.time-1)<1e-8);
 c.acknowledge();syncTutorialActionPause(s,{hudTarget:true});c.advance(30);
 assert.equal(c.presentation(),null);assert.ok(tutorialHudHandTarget(s,null));assert.equal(syncTutorialActionPause(s,{hudTarget:tutorialHudHandTarget(s,null)}),true);assert.ok(s.pauses.includes(TUTORIAL_ACTION_PAUSE));
 const other=setup();other.controller.acknowledge();syncTutorialActionPause(other.state,{hudTarget:true});other.controller.dismiss();assert.ok(!other.state.pauses.includes(TUTORIAL_ACTION_PAUSE));assert.equal(tutorialHudHandTarget(other.state,null),null);
 s.tutorial.step='observe';assert.equal(syncTutorialActionPause(s,{hudTarget:true}),false);Game.advanceReal(s,1,nav);assert.ok(Math.abs(s.time-2)<1e-8);
});
test('absent or inaccessible guidance cannot retain a pause; other pause reasons remain independent',()=>{
 const {state:s,controller:c}=setup();c.acknowledge();syncTutorialActionPause(s,{hudTarget:true});Game.pause(s,'menu');syncTutorialActionPause(s);
 assert.deepEqual(s.pauses,['menu']);Game.resume(s,'menu');
 const blocked={...nav,placement:()=>({valid:false})};assert.equal(tutorialHandTarget(s,blocked,'center'),null);assert.equal(syncTutorialActionPause(s,{worldTarget:tutorialHandTarget(s,blocked,'center')}),false);
 for(const change of [s=>s.day=2,s=>s.result='defeat',s=>s.tutorial.basicSkipped=true]){const other=setup();other.controller.acknowledge();syncTutorialActionPause(other.state,{hudTarget:true});change(other.state);assert.equal(syncTutorialActionPause(other.state,{hudTarget:true}),false);}
});
test('loading clears presentation-only pauses and reconstructs them from current actionable guidance',()=>{
 const {state:s,controller:c}=setup();c.acknowledge();syncTutorialActionPause(s,{hudTarget:true});const loaded=deserialize(serialize(s));assert.ok(loaded.pauses.includes(TUTORIAL_ACTION_PAUSE));
 const reader=new TutorialController(loaded,profile);assert.ok(!loaded.pauses.includes(TUTORIAL_ACTION_PAUSE));syncTutorialActionPause(loaded,{hudTarget:tutorialHudHandTarget(loaded,reader.presentation())});assert.ok(loaded.pauses.includes(TUTORIAL_ACTION_PAUSE));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../src/audio/audio.js';
import * as Game from '../src/simulation/game.js';
import {clearNavigation} from './clear-navigation.js';
import {serialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
function fixture(){const calls=[],audio=new AudioSystem({sfx:1,music:0});audio.context={state:'running',currentTime:0};audio.sound=async(id,options)=>{calls.push({id,options});};return {audio,calls};}
function farm(){const state=Game.newGame({seed:712}),nav=clearNavigation();Game.resume(state,'intro');Game.placeStructure(state,'center',{x:4,z:0},nav);Game.plant(state,'seed','mijo',10,4,nav);Game.openInitialHiring(state);return {state,nav};}
test('actual initial and proportional mid-day payroll cue once after payment, without audio altering gameplay',()=>{
 const {state}=farm(),{audio,calls}=fixture();audio.remember(state.events);
 for(const additional of [false,true]){
  const before=numberOf(state.ledger.balance);if(additional)state.time=150;
  if(additional)Game.hireAdditional(state,'extra',{youngMale:1},state.structures[0].id);else Game.hire(state,'hire',{olderMale:1});
  const event=state.events.at(-1);assert.equal(event.type,'HiringConfirmed');assert.equal(event.cost,before-numberOf(state.ledger.balance));assert.equal(event.cost,additional?16:30);
  const snapshot=serialize(state),offset=calls.length;audio.process(state.events,{state});audio.process(state.events,{state});
  assert.deepEqual(calls.slice(offset).map(c=>c.id),['ui_confirm','eco_spend']);assert.equal(serialize(state),snapshot);
  assert.equal(calls.at(-1).options.family,'economic-spend');assert.equal(calls.at(-1).options.bus,'ui');
 }
 const restored=fixture();restored.audio.remember(state.events);restored.audio.process(state.events,{state});assert.equal(restored.calls.length,0);
});
test('empty contracts and duplicate/rejected commands never produce a new spending cue',()=>{
 const {state}=farm(),{audio,calls}=fixture();audio.remember(state.events);Game.hire(state,'empty',{});audio.process(state.events,{state});
 assert.equal(state.events.at(-1).cost,0);assert.deepEqual(calls.map(c=>c.id),['ui_confirm']);
 assert.equal(Game.hire(state,'empty',{olderMale:1}),false);assert.equal(Game.hireAdditional(state,'empty-extra',{},state.structures[0].id),false);
 assert.throws(()=>Game.hireAdditional(state,'invalid',{olderMale:1},'missing'));
 const snapshot=serialize(state);assert.throws(()=>Game.hireAdditional(state,'unaffordable',{olderMale:999999},state.structures[0].id),/Fondos insuficientes/);assert.equal(serialize(state),snapshot);
 audio.process(state.events,{state});assert.deepEqual(calls.map(c=>c.id),['ui_confirm']);
 audio.process([0,-1,NaN,Infinity,undefined].map((cost,i)=>({id:'bad-'+i,type:'HiringConfirmed',cost})));assert.equal(calls.filter(c=>c.id==='eco_spend').length,0);
});
test('delayed payroll cues expire on blocking pauses, suspension, disposal and deadline',()=>{
 for(const mode of ['menu','hidden','context-lost','runtime-error','suspended','dispose','late']){
  const {audio,calls}=fixture(),state={pauses:[]};audio.process([{id:'pay',type:'HiringConfirmed',cost:30}],{state});const current=calls.find(c=>c.id==='eco_spend').options.isCurrent;assert.equal(current(),true);
  if(mode==='late')audio.context.currentTime=.6;else if(mode==='dispose')audio.generation++;else if(mode==='suspended')audio.context.state='suspended';else state.pauses.push(mode);
  assert.equal(current(),false,mode);
 }
});

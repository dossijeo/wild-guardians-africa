import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../src/audio/audio.js';
import * as Game from '../src/simulation/game.js';
import {clearNavigation} from './clear-navigation.js';
import {serialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const calls=[],audio=new AudioSystem({sfx:1,music:0});audio.context={state:'running',currentTime:0};
 audio.sound=async(id,options)=>{calls.push({id,options});return null;};return {audio,calls};
}
for(const damage of [0,.4])test(`paid wall refund at ${damage} damage cues income once without changing the ledger`,async()=>{
 const state=Game.newGame({seed:712}),nav=clearNavigation();Game.resume(state,'intro');
 Game.placeStructure(state,'center',{x:4,z:0},nav);
 Game.buildWallChain(state,'wall','empalizada',[[10,0],[16,0]],nav);
 const wall=state.structures.find(s=>s.kind==='wall');wall.hp=wall.maxHp*(1-damage);
 const {audio,calls}=fixture();audio.remember(state.events);const before=numberOf(state.ledger.balance);
 Game.removeWall(state,'remove',wall.id,nav);const event=state.events.at(-1);assert.equal(event.type,'WallRemoved');
 assert.ok(event.refund>0);assert.equal(numberOf(state.ledger.balance)-before,event.refund);
 const snapshot=serialize(state);audio.process(state.events,{state});audio.process(state.events,{state});await flush();
 assert.deepEqual(calls.map(c=>c.id),['build_demolish_manual','eco_gain']);
 assert.equal(calls[1].options.bus,'ui');assert.equal(calls[1].options.emitter,'ui:refund');assert.equal(serialize(state),snapshot);
 const restored=fixture();restored.audio.remember(state.events);restored.audio.process(state.events,{state});assert.equal(restored.calls.length,0);
});
test('zero, missing and invalid refunds do not cue income; crop sale keeps its specific sound',()=>{
 const {audio,calls}=fixture();audio.process([0,-1,NaN,Infinity,undefined].map((refund,i)=>({id:'remove-'+i,type:'WallRemoved',refund})));
 assert.ok(calls.every(c=>c.id==='build_demolish_manual'));
 audio.process([{id:'sale',type:'CrateDelivered',refund:100}]);assert.equal(calls.at(-1).id,'eco_crop_sold');assert.equal(calls.filter(c=>c.id==='eco_gain').length,0);
});
test('pending refund decoding expires on pause, deadline and disposal',()=>{
 for(const mode of ['menu','hidden','context-lost','runtime-error','late','dispose']){
  const {audio,calls}=fixture(),state={pauses:[]};audio.process([{id:'refund',type:'WallRemoved',refund:10}],{state});
  const current=calls.find(c=>c.id==='eco_gain').options.isCurrent;assert.equal(current(),true);
  if(mode==='late')audio.context.currentTime=.6;else if(mode==='dispose')audio.generation++;else state.pauses.push(mode);
  assert.equal(current(),false,mode);
 }
});

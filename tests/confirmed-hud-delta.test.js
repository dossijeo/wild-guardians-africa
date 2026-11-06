import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {projectConfirmedHud,validateConfirmedHudSchema} from '../src/simulation/confirmed-hud-projection.js';
import {createConfirmedHudDeltaEncoder,createConfirmedHudDeltaDecoder} from '../src/simulation/confirmed-hud-delta.js';

test('real HUD baseline and per-entity deltas preserve order, removals, events and raids',()=>{
 const state=newGame({seed:712}),encoder=createConfirmedHudDeltaEncoder({validate:validateConfirmedHudSchema}),decoder=createConfirmedHudDeltaDecoder({validate:validateConfirmedHudSchema}),view=sequence=>projectConfirmedHud(state,sequence);
 state.workers=[{id:'w1',profile:'farmer',status:'idle',x:1,z:2},{id:'w2',profile:'farmer',status:'idle',x:3,z:4}];state.plants.push(createPlant('p','platano',4,5,'center'));
 const first=view(1),base=encoder.encode(first);assert.equal(base.kind,'baseline');assert.deepEqual(decoder.decode(base),first);
 state.workers[0].x=7;state.events.push({id:'event-1',type:'Something'});const second=view(2),delta=encoder.encode(second);assert.equal(delta.base,1);assert.deepEqual(delta.collections.workers.upsert.map(item=>item.id),['w1']);assert.equal(delta.collections.workers.order,undefined);assert.deepEqual(decoder.decode(delta),second);
 state.workers.reverse();state.workers.pop();state.raid={id:'r1',animals:[{id:'a1',species:'hiena',status:'walking',x:9,z:10}]};const third=view(3),next=encoder.encode(third);assert.deepEqual(next.collections.workers.remove,['w1']);assert.deepEqual(next.collections.workers.order,['w2']);assert.equal(next.collections.raidAnimals.upsert[0].id,'a1');assert.deepEqual(decoder.decode(next),third);
 state.raid=null;state.events=[];const fourth=view(4),last=encoder.encode(fourth);assert.equal(last.raid,null);assert.deepEqual(last.collections.events.remove,['event-1']);assert.deepEqual(decoder.decode(last),fourth);
});

test('missing, invalid or out-of-order deltas leave the previous baseline intact',()=>{
 const state=newGame({seed:713}),encoder=createConfirmedHudDeltaEncoder({validate:validateConfirmedHudSchema}),decoder=createConfirmedHudDeltaDecoder({validate:validateConfirmedHudSchema}),base=encoder.encode(projectConfirmedHud(state,1));assert.throws(()=>decoder.decode({kind:'delta',base:1,sequence:2}),/base mismatch/);decoder.decode(base);state.time=5;const packet=encoder.encode(projectConfirmedHud(state,2));assert.throws(()=>decoder.decode({...packet,base:0}),/base mismatch/);assert.equal(decoder.status().sequence,1);assert.throws(()=>decoder.decode({...packet,collections:{workers:{remove:['missing'],upsert:[]}}}),/entity removal/);assert.equal(decoder.status().sequence,1);assert.deepEqual(decoder.decode(packet),projectConfirmedHud(state,2));assert.throws(()=>decoder.decode(base),/Stale HUD baseline/);assert.throws(()=>decoder.decode(packet),/base mismatch/);decoder.reset();assert.throws(()=>decoder.decode(packet),/base mismatch/);
});

test('prepared deltas only commit once after the consumer accepts them',()=>{const state=newGame({seed:714}),encoder=createConfirmedHudDeltaEncoder(),decoder=createConfirmedHudDeltaDecoder(),base=encoder.encode(projectConfirmedHud(state,1)),initial=decoder.prepare(base);assert.equal(decoder.status().sequence,null);initial.commit();state.time=4;const delta=encoder.encode(projectConfirmedHud(state,2)),first=decoder.prepare(delta),second=decoder.prepare(delta);first.view.time=999;assert.equal(decoder.status().sequence,1);assert.equal(first.commit().time,4);assert.throws(()=>first.commit(),/Stale/);assert.throws(()=>second.commit(),/Stale/);assert.equal(decoder.status().sequence,2);});

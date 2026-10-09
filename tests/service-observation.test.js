import test from 'node:test';
import assert from 'node:assert/strict';
import {createServiceObservation} from '../tools/service-observation.mjs';
const freeze=o=>{if(o&&typeof o==='object'){Object.freeze(o);for(const v of Object.values(o))freeze(v);}return o;};
const state=(elapsed,extra={})=>({day:1,time:elapsed,elapsed,raid:null,plants:[{id:'p',alive:true,water:[{status:'due'}]}],tasks:[{id:'t',targetId:'p',kind:'initial',created:1,workerId:null,blocked:false}],workers:[],crates:[],events:[],rng:712,...extra});
test('pure observer reads deeply frozen state without retaining mutable references or RNG changes',()=>{
 const o=createServiceObservation(),s=freeze(state(1));const before=JSON.stringify(s);o.observe(s);assert.equal(JSON.stringify(s),before);assert.equal(s.rng,712);
 const mutable=state(2);o.observe(mutable);mutable.tasks[0].kind='changed';assert.equal(o.result().tasks[0].kind,'initial');
});
test('reservation and observed zero movement remain separate from unknown collision/search',()=>{
 const o=createServiceObservation();o.observe(state(0));
 const worker={id:'w',contractDay:1,status:'walking',x:0,z:0,taskId:'t',crateId:null,path:[{x:2,z:0}],gateWaiting:false};
 o.observe(state(1,{tasks:[{...state(0).tasks[0],workerId:'w'}],workers:[worker]}));
 o.observe(state(2,{tasks:[{...state(0).tasks[0],workerId:'w'}],workers:[worker]}));
 const r=o.result();assert.equal(r.tasks[0].daylightSeconds.unreserved,1);assert.equal(r.tasks[0].daylightSeconds.reserved,1);
 assert.deepEqual(r.tasks[0].firstReservationInterval,[0,1]);assert.equal(r.days[0].movement['walking:initial'].zeroDisplacementSeconds,1);
 assert.equal(r.days[0].movement['walking:initial'].displacementMetres,0);assert.match(r.unknowns[0],/cannot be inspected/);
});
test('task disappearance is censored until matching physical completion evidence',()=>{
 const o=createServiceObservation();o.observe(state(0));o.observe(state(1,{tasks:[],events:[{id:'e',type:'RaidSpawned'}]}));
 assert.equal(o.result().tasks[0].removal.outcome,'unknown-censored-removal');
 const p=createServiceObservation();p.observe(state(0));p.observe(state(1,{tasks:[],events:[{id:'e',type:'WaterSatisfied',targetId:'p',workerId:'w'}]}));
 assert.equal(p.result().tasks[0].removal.evidence.type,'WaterSatisfied');
});
test('gaps are retained and not interpolated into worker or queue durations',()=>{
 const o=createServiceObservation();o.observe(state(0));o.observe(state(9));assert.equal(o.result().days[0].contiguousDaylightSeconds,0);
 assert.deepEqual(o.result().gaps,[{from:0,to:9,seconds:9}]);assert.equal(o.result().tasks[0].daylightSeconds.unreserved,0);
});
test('observer never accesses RNG, navigation or commands and decision data stays independent',()=>{
 const s=state(0);for(const key of ['rng','nav','Game'])Object.defineProperty(s,key,{get(){throw Error('Forbidden read '+key);}});
 const o=createServiceObservation();o.observe(s);const decision={day:1,time:0,actions:0,reason:'budget'};o.decision(decision);decision.reason='changed';
 assert.equal(o.result().decisions[0].reason,'budget');
});
test('a mismatched worker completion event cannot complete an observed reservation',()=>{
 const o=createServiceObservation();o.observe(state(0,{tasks:[{...state(0).tasks[0],workerId:'w1'}]}));
 o.observe(state(1,{tasks:[],events:[{id:'e',type:'WaterSatisfied',targetId:'p',workerId:'w2'}]}));
 assert.equal(o.result().tasks[0].removal.evidence,null);
});
test('loose crate pickup is evidenced separately from physical paid delivery',()=>{
 const o=createServiceObservation();o.observe(state(0,{tasks:[{id:'t',targetId:'c',kind:'crate',workerId:'w1'}]}));
 o.observe(state(1,{tasks:[],crates:[{id:'c',carrierId:'w1',delivered:false}]}));
 assert.equal(o.result().tasks[0].removal.evidence.type,'carrier-pickup-observed');assert.equal(o.result().days[0].firstObservedDelivery,null);
 o.observe(state(2,{tasks:[],crates:[{id:'c',carrierId:null,delivered:true}],events:[{id:'e',type:'CrateDelivered',targetId:'c',workerId:'w1'}]}));
 assert.equal(o.result().days[0].firstObservedDelivery.time,2);
});
test('attack, day boundary and interval crossing daylight end are excluded',()=>{
 for(const [first,second] of [[state(0),state(1,{raid:{}})],[state(299),state(301)],[state(299),state(600,{day:2,time:0})]]){
  const o=createServiceObservation();o.observe(first);o.observe(second);assert.equal(o.result().days.reduce((n,d)=>n+d.contiguousDaylightSeconds,0),0);
 }
});
test('creation order is retained as order and never converted to a timestamp',()=>{
 const o=createServiceObservation();o.observe(state(6,{tasks:[{...state(0).tasks[0],created:999999}]}));const r=o.result().tasks[0];
 assert.equal(r.created,999999);assert.equal(r.firstObservedAt,6);assert.deepEqual(r.firstAppearanceInterval,[null,6]);assert.equal(r.creationTimestamp,'not-in-state');
});

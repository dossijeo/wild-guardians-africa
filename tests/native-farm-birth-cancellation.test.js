import test from 'node:test';
import assert from 'node:assert/strict';
import {rational} from '../src/simulation/money.js';
import {nativeFarmAuthoritySave} from './helpers/native-farm-authority-save.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {centerServicePoint} from '../src/world/centers.js';
import {createPlant} from '../src/simulation/crops.js';

const actor=w=>Number(w.id.split('-').at(-1)),pose=w=>Object.fromEntries(['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'].map(k=>[k,w[k]]));
async function preparedBirth(){
 const targetCenter='structure-900097';
 const {state}=nativeFarmAuthoritySave({profile:'youngFemale',approach:true,configureState(s){const w=s.workers[0],center={...s.structures.find(c=>c.id===w.centerId),id:targetCenter};center.z+=16;s.structures.push(center);const point=centerServicePoint(center,s,.8),plant=createPlant('plant-900099','mijo',point.x+5,point.z,center.id);for(const water of plant.water)water.status='manual';s.plants.push(plant);s.time=243;s.hiringPaidDay=s.day;s.ledger.balance=rational(100000);s.villages.find(v=>v.id===w.villageId).entry={x:w.x,z:w.z+6};}}),f=await nativeProductionAuthority(state);
 try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));const original=f.resourcePort.onmessage,held={farm:null,home:null};
  f.resourcePort.onmessage=event=>{const d=event.data,q=d.result?.preparedFarmArrivalTemplate,h=d.result?.preparedHomeRouteTemplate;if(d.kind==='nativeGateResourcesResult'&&q&&q.actorId!==actor(state.workers[0])&&!held.farm){held.farm=event;return;}if(d.kind==='nativeGateResourcesResult'&&h&&h.actorId!==actor(state.workers[0])&&!held.home){held.home=event;return;}original(event);};
  const before=f.snapshot(),r=f.command({kind:'hireAdditional',id:'cancel-ready-birth',selection:{olderMale:1},centerId:targetCenter});assert.equal(r.value,true,r.rejection);const born=JSON.parse(r.snapshot).workers[1];
  for(let i=0;i<600&&!held.farm;i++){f.advance(.02);await f.present();assert.deepEqual(f.faults,[]);}assert(held.farm,JSON.stringify(f.authority.nativeIntentProductionStatus()));assert.equal(held.farm.data.result.preparedFarmArrivalTemplate.bodyId,2);
  const record=f.records.find(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born));assert(record&&!record.committed&&!record.aborted);assert.deepEqual(pose(f.snapshot().workers[1]),pose(born));return {f,born,before,record,held,deliver:event=>original(event)};
 }catch(error){await f.close();throw error;}
}
for(const order of ['late-before-home','late-after-home'])test(`actual newborn READY expiry ${order} cannot acquire the cancelled Farm or consume Home's response`,async()=>{
 const {f,born,record,held,deliver}=await preparedBirth();try{
  const peer=pose(f.snapshot().workers[0]);for(let i=0;i<600&&!held.home;i++){f.advance(.02);await f.present();assert.deepEqual(f.faults,[]);}assert(held.home,JSON.stringify(f.authority.nativeIntentProductionStatus()));assert(record.aborted);assert.equal(record.committed,false);assert.equal(f.snapshot().workers[1].nativeRouteAdmission,'pending-home-resources');assert.deepEqual(pose(f.snapshot().workers[1]),pose(born));assert.notDeepEqual(pose(f.snapshot().workers[0]),peer);
  assert.notEqual(held.home.data.id,held.farm.data.id);assert.equal(held.home.data.result.preparedHomeRouteTemplate.bodyId,2);
  if(order==='late-before-home'){deliver(held.farm);await f.present();assert.equal(f.records.some(r=>r.kind==='home-route'&&r.committed),false);assert.equal(record.committed,false);}
  deliver(held.home);await untilProduction(f,()=>f.records.some(r=>r.kind==='home-route'&&r.committed));if(order==='late-after-home'){deliver(held.farm);await f.present();}
  deliver(held.farm);await f.present();assert.equal(record.committed,false);assert.equal(f.records.filter(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)&&r.committed).length,0);
  assert.equal(f.records.filter(r=>r.kind==='home-route'&&r.resources.nativeHome.actorId===actor(born)&&r.committed).length,1);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
test('closing the authority after genuine newborn READY aborts its packet and cannot acquire its late reply',async()=>{
 const {f,record,held,deliver}=await preparedBirth();try{f.authority.dispose();await f.present();assert(record.aborted);deliver(held.farm);await f.present();assert.equal(record.committed,false);assert.equal(f.authority.nativeIntentProductionStatus().phase,'closed');assert.deepEqual(f.faults,[]);}finally{await f.close();}
});

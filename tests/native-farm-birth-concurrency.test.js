import test from 'node:test';
import assert from 'node:assert/strict';
import {rational} from '../src/simulation/money.js';
import {nativeFarmAuthoritySave} from './helpers/native-farm-authority-save.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {centerServicePoint} from '../src/world/centers.js';
import {createPlant} from '../src/simulation/crops.js';

const actor=w=>Number(w.id.split('-').at(-1)),pose=w=>Object.fromEntries(['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'].map(k=>[k,w[k]]));
for(const selection of [{youngFemale:2},{youngFemale:1,olderMale:1}])test(`ordinary batch ${JSON.stringify(selection)} at one entry acquires both Farm routes toward a clear second center after a READY wait`,async()=>{
 const targetCenter='structure-900097';
 const {state}=nativeFarmAuthoritySave({profile:'youngFemale',approach:true,configureState(s){const w=s.workers[0],original=s.structures.find(c=>c.id===w.centerId),center={...original,id:targetCenter,z:original.z+16};s.structures.push(center);const point=centerServicePoint(center,s,.8),crop=createPlant('plant-900099','mijo',point.x+5,point.z,center.id);for(const water of crop.water)water.status='manual';s.plants.push(crop);s.hiringPaidDay=s.day;s.ledger.balance=rational(100000);s.villages.find(v=>v.id===w.villageId).entry={x:w.x,z:w.z+6};}}),oldId=state.workers[0].id;
 let release;const held=new Promise(r=>release=r);let retained=null;
 const f=await nativeProductionAuthority(state,{async onReady(record){if(record.kind==='farm-arrival'&&record.resources.nativeFarmArrival.actorId!==actor(state.workers[0])&&!retained){retained=record;await held;}}});
 try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));const before=f.snapshot(),result=f.command({kind:'hireAdditional',id:'batch-'+JSON.stringify(selection),selection,centerId:targetCenter});assert.equal(result.value,true,result.rejection);
  const born=JSON.parse(result.snapshot).workers.filter(w=>w.id!==oldId);assert.equal(born.length,2);assert.equal(born[0].x,born[1].x);assert.equal(born[0].z,born[1].z);assert.deepEqual(JSON.parse(result.snapshot).workers[0],before.workers[0]);
  for(let i=0;i<800&&!retained;i++){f.advance(.02);await f.present();assert.deepEqual(f.faults,[]);}assert(retained,JSON.stringify(f.authority.nativeIntentProductionStatus()));assert.equal(retained.resources.nativeFarmArrival.bodyId,2);
  const waiting=f.snapshot();for(let i=0;i<12;i++){f.advance(.05);await f.present();}
  const pending=f.snapshot();assert.notDeepEqual(pose(pending.workers.find(w=>w.id===oldId)),pose(waiting.workers.find(w=>w.id===oldId)));
  for(const w of born){const current=pending.workers.find(v=>v.id===w.id);assert.deepEqual(pose(current),pose(w));assert.equal(current.nativeRouteAdmission,'pending-farm-arrival-resources');}
  assert.equal(f.records.filter(r=>r.kind==='farm-arrival'&&born.some(w=>actor(w)===r.resources.nativeFarmArrival.actorId)).length,1);
  release();
  for(let i=0;i<1600&&!born.every(w=>f.records.some(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(w)&&r.committed));i++){f.advance(.02);await f.present();assert.deepEqual(f.faults,[]);}
  const records=born.map(w=>f.records.filter(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(w)&&r.committed));assert(records.every(r=>r.length===1),JSON.stringify({production:f.authority.nativeIntentProductionStatus(),workers:f.snapshot().workers.map(w=>({id:w.id,x:w.x,z:w.z,status:w.status,admission:w.nativeRouteAdmission})),records:f.records.map(r=>({kind:r.kind,committed:r.committed,aborted:r.aborted,actor:r.resources.nativeFarmArrival?.actorId,body:r.resources.nativeFarmArrival?.bodyId}))}));
  assert.deepEqual(records.map(r=>r[0].resources.nativeFarmArrival.bodyId).sort(),[2,3]);assert.equal(records[0][0].resources.nativeFarmArrival.worldBoundary.authorityEpoch,records[1][0].resources.nativeFarmArrival.worldBoundary.authorityEpoch);
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f.close();}
});

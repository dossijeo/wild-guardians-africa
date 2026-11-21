import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
for(const opening of [undefined,.4])test(`restored Farm with an existing gate admits and advances its original owner (${opening??'uninitialized'})`,async()=>{
 const source=nativeFarmArrivalRouteFixture({peer:false});let f;
 try{const state=structuredClone(source.state),gate={id:`structure-${state.nextId++}`,created:29207,kind:'wall',material:'zarzas',gate:true,...source.point(0,8),yaw:0,maxHp:60,hp:60,status:'intact',villageId:'village-1',cost:10,collapseRemaining:0,...(opening===undefined?{}:{gateOpen:opening})};state.structures.push(gate);
  f=await nativeProductionAuthority(state,{chunkKeys:[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1']});
  assert.notEqual(f.authority.nativeIntentProductionStatus().phase,'unsupported-cohort');await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));
  const before=f.snapshot(),actor=before.workers[0];assert.equal(actor.nativeRouteAdmission,'native-farm-arrival');
  const removal=f.command({kind:'removeWall',id:'qa-remove-native-gate',targetId:gate.id});
  assert.equal(removal.value,false);
  assert.match(removal.rejection,/necesita preparación nativa/);
  assert.deepEqual(removal.events,[]);
  const retained=JSON.parse(removal.snapshot);
  assert.deepEqual(retained.structures,before.structures);
  assert.deepEqual(retained.ledger,before.ledger);
  assert.equal(retained.commandIds.includes('qa-remove-native-gate'),false);
  const after=f.advance(.05);await f.present();assert(after.elapsed>before.elapsed);assert.notDeepEqual([after.workers[0].x,after.workers[0].z],[actor.x,actor.z]);assert.equal(after.workers[0].id,actor.id);assert.equal(after.structures.find(s=>s.id===gate.id).gateOpen,opening??0,'only the native opening is projected; the legacy controller cannot close it');assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f?.close();source.close();}
});

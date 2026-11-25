import test from 'node:test';
import assert from 'node:assert/strict';
import {centerServicePoint} from '../src/world/centers.js';
import {rational} from '../src/simulation/money.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';

const chunkKeys=[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1'];
const command={kind:'castShield',id:'shield-across-native-farm',x:-14,z:8.2};

async function fixture(options){
 const source=nativeFarmArrivalRouteFixture({peer:false});
 const state=structuredClone(source.state),worker=state.workers[0],start={x:-14,z:11.8};
 const center=state.structures.find(value=>value.id===worker.centerId),service=centerServicePoint(center,state,.8);
 center.x+=-14-service.x;center.z+=3.2-service.z;
 Object.assign(worker,start);state.villages.find(value=>value.id===worker.villageId).entry=start;
 state.ledger.balance=rational(100000);state.cooldowns.shield=0;source.close();
 const f=await nativeProductionAuthority(state,{chunkKeys,...options});
 try{
  await untilProduction(f,()=>f.records.some(item=>item.kind==='farm-arrival'&&item.committed));
  f.advance(.14);await f.present();
  return f;
 }catch(error){await f.close();throw error;}
}

async function pump(f,promise){
 let settled=false;promise.then(()=>{settled=true;},()=>{settled=true;});
 await untilProduction(f,()=>settled);
 return promise;
}

test('a ready Shield keeps its polygon, spell and Farm cursor private until the same ticket draws',async()=>{
 let release;
 const wait=new Promise(resolve=>{release=resolve;});
 const f=await fixture({onReady(record){if(record.kind==='shield')return wait;}});
 try{
  const snap=()=>f.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
  const before=snap(),source=JSON.parse(before.snapshot),prior=before.nativeAuthorityCheckpoint.spatialState;
  const pending=f.authority.prepareNativeStructureCommand(command);pending.catch(()=>{});
  await untilProduction(f,()=>f.records.some(item=>item.kind==='shield'&&item.packet));
  const record=f.records.find(item=>item.kind==='shield');
  assert.equal(record.committed,false);assert.equal(record.resources.kind,3);
  assert.deepEqual(snap().nativeAuthorityCheckpoint.spatialState,prior);
  assert.deepEqual(f.snapshot().spells,source.spells);
  release();await pump(f,pending);
  const result=await pump(f,f.structureCommand(command));
  await f.authority.finishNativeStructureCommand(command);
  assert.equal(result.value,true,result.rejection);
  const game=JSON.parse(result.snapshot),event=result.events.filter(item=>item.type==='SpellActivated');
  assert.equal(event.length,1);assert.equal(event[0].commandId,command.id);
  assert.deepEqual(game.ledger,source.ledger);
  assert.deepEqual(game.workers[0],source.workers[0]);
  const receipt=result.nativeWorldResources[0],shield=receipt.nativeShield;
  assert.equal(receipt.kind,3);assert.deepEqual(receipt.worldBoundary,record.resources.worldBoundary);
  assert.deepEqual(game.spells,[shield.spell]);assert.equal(event[0].spellId,shield.spell.id);
  const spatial=snap().nativeAuthorityCheckpoint.spatialState;
  assert.deepEqual(spatial.polygons.map(item=>item.id),[...prior.polygons.map(item=>item.id),shield.polygonId]);
  let shown=false;record.packet.presented.then(()=>{shown=true;});await untilProduction(f,()=>shown);
  const current=f.advance(.05);assert.equal(current.workers[0].nativeRouteAdmission,'native-farm-arrival');
  assert.notEqual(current.workers[0].z,source.workers[0].z);
  assert.deepEqual(f.faults,[]);
 }finally{release();await f.close();}
});

test('a Shield READY for an older native clock cannot commit a polygon or an activation',async()=>{
 let release;
 const wait=new Promise(resolve=>{release=resolve;});
 const f=await fixture({onReady(record){if(record.kind==='shield')return wait;}});
 try{
  const pending=f.authority.prepareNativeStructureCommand(command);pending.catch(()=>{});
  await untilProduction(f,()=>f.records.some(item=>item.kind==='shield'&&item.packet));
  const record=f.records.find(item=>item.kind==='shield');
  const advanced=f.advance(.05);
  assert(advanced.elapsed>record.resources.effectiveTime);
  release();await pump(f,pending);
  const result=await pump(f,f.structureCommand(command));
  assert.equal(result.value,false);assert.match(result.rejection,/stale/);
  await f.authority.finishNativeStructureCommand(command);
  const after=f.snapshot();
  assert.deepEqual(after.spells,[]);assert(!after.commandIds.includes(command.id));
  assert.equal(record.committed,false);assert.deepEqual(f.faults,[]);
 }finally{release();await f.close();}
});

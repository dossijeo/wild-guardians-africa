import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {rational} from '../src/simulation/money.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {spatialStructureBarriers} from '../src/world/wild-engine/spatial-wall-bridge.js';

async function withFarm(operation){
 const source=nativeFarmArrivalRouteFixture({peer:false});
 const chunks=[...Array.from({length:9},(_,index)=>`${index%3-1},${Math.floor(index/3)-1}`),'2,-1','2,0','2,1'];
 const state=structuredClone(source.state);
 state.ledger.balance=rational(100000);
 let authority;
 try{
  authority=await nativeProductionAuthority(state,{chunkKeys:chunks});
  await untilProduction(authority,()=>authority.records.some(record=>record.kind==='farm-arrival'&&record.committed));
  authority.advance();
  await authority.present();
  const command={kind:'placeStructure',id:'native-ordinary-gate',structure:{kind:'wall',material:'zarzas',gate:true,yaw:0,...source.point(0,8)}};
  await operation(authority,command,chunks);
 }finally{await authority?.close();source.close();}
}

async function withPreparedFrame(f,pending){
 let complete=false,result,failure;
 pending.then(value=>{result=value;complete=true;},error=>{failure=error;complete=true;});
 for(let index=0;index<500&&!complete;index++)await f.present();
 assert(complete,'authority never completed its frame transaction');
 if(failure)throw failure;
 return result;
}

test('one prepared gate is paid once, retains Farm and restores from its save',()=>withFarm(async(f,command,chunks)=>{
 const before=f.snapshot();
 await withPreparedFrame(f,f.authority.prepareNativeStructureCommand(command));
 const ready=f.snapshot(),candidate=f.records.find(record=>record.kind==='barrier-addition');
 assert.deepEqual(ready.ledger,before.ledger);
 assert.deepEqual(ready.structures,before.structures);
 const result=await withPreparedFrame(f,f.structureCommand(command));
 assert.equal(result.value,true,result.rejection);
 await withPreparedFrame(f,f.authority.finishNativeStructureCommand(command));
 const committed=f.snapshot(),binding=result.nativeWorldResources[0].nativeBarrierAdditionBinding;
 const gate=committed.structures.find(entity=>entity.id===binding.reference.gate.entityId);
 assert.equal(gate.gate,true);
 assert.equal(gate.gateOpen,binding.reference.gate.opening);
 assert.equal(committed.structures.length,before.structures.length+1);
 assert.deepEqual(committed.ledger.entries[command.id],{n:'-10',d:'1'});
 assert.equal(result.events.filter(event=>event.type==='PlacementCommitted'&&event.targetId===gate.id).length,1);
 assert.deepEqual(binding.preparedReference,candidate.resources.nativeBarrierAddition);
 assert.equal(new Set(binding.nativeIds).size,3);
 assert.deepEqual(binding.reference.gate.proxies.map(proxy=>proxy.passMask),[0,0,1]);
 await withPreparedFrame(f,f.authority.prepareNativeStructureCommand(command));
 assert.equal((await withPreparedFrame(f,f.structureCommand(command))).value,false);
 await withPreparedFrame(f,f.authority.finishNativeStructureCommand(command));
 const after=f.advance(.1),worker=after.workers[0],prior=committed.workers[0];
 assert.equal(worker.nativeRouteAdmission,'native-farm-arrival');
 assert.equal(worker.id,prior.id);
 assert.notDeepEqual([worker.x,worker.z],[prior.x,prior.z]);
 assert.deepEqual(f.records.map(record=>record.kind),['farm-arrival','barrier-addition']);
 assert.deepEqual(after.ledger,committed.ledger);
 assert.deepEqual(f.faults,[]);
 const restored=await nativeProductionAuthority(after,{chunkKeys:chunks});
 try{
  await untilProduction(restored,()=>restored.records.some(record=>record.kind==='farm-arrival'&&record.committed));
  const next=restored.snapshot();
  assert.deepEqual(next.structures.find(entity=>entity.id===gate.id),gate);
  assert.deepEqual(next.ledger,after.ledger);
  assert.equal(next.workers[0].id,worker.id);
  assert.equal(next.workers[0].nativeRouteAdmission,'native-farm-arrival');
  assert.notEqual(restored.records[0].resources.worldBoundary.authorityEpoch,binding.reference.worldBoundary.authorityEpoch);
  assert.deepEqual(restored.faults,[]);
 }finally{await restored.close();}
}));

test('cancelling a gate after resource preparation keeps the previous world and balance',()=>withFarm(async(f,command)=>{
 const before=f.snapshot();
 await withPreparedFrame(f,f.authority.prepareNativeStructureCommand(command));
 const candidate=f.records.find(record=>record.kind==='barrier-addition');
 await withPreparedFrame(f,f.authority.finishNativeStructureCommand(command));
 const after=f.advance(.1);
 assert.equal(candidate.committed,false);
 assert.equal(candidate.aborted,true);
 assert.deepEqual(after.structures,before.structures);
 assert.deepEqual(after.ledger,before.ledger);
 assert.equal(after.workers[0].nativeRouteAdmission,'native-farm-arrival');
 assert.notDeepEqual([after.workers[0].x,after.workers[0].z],[before.workers[0].x,before.workers[0].z]);
 assert.deepEqual(f.faults,[]);
}));

test('cold restore honors the native proxy triplet of a purchased rotated gate',async()=>{
 const snapshot=gunzipSync(readFileSync(new URL('./fixtures/desierto712-native-gate-prehire.json.gz',import.meta.url))).toString();
 const state=deserialize(snapshot),before=state.workerNativeAuthorityCheckpoint;
 const [owner]=before.wallOwners,gate=state.structures.find(row=>row.id===owner.entityId);
 assert.deepEqual(owner.ids,[1,2,3]);
 assert.equal(gate.gateOpen,0);
 const js=spatialStructureBarriers(gate).map((row,i)=>({id:owner.ids[i],...Object.fromEntries(
  Object.entries(row).map(([key,value])=>[key,Math.fround(value)]))}));
 assert.notEqual(js[0].halfX,before.spatialState.barriers[0].halfX);
 const f=await nativeProductionAuthority(state,{...savedNativeAuthorityOptions(snapshot),emptyBeastPhysics:true});
 try{
  const after=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint;
  assert.deepEqual(after.spatialState,before.spatialState);
  assert.deepEqual(after.wallOwners,before.wallOwners);
  assert.deepEqual(f.snapshot().structures,state.structures);
  assert.deepEqual(f.snapshot().ledger,state.ledger);
  const command={kind:'removeWall',id:'remove-restored-paid-gate',targetId:gate.id};
  await withPreparedFrame(f,f.authority.prepareNativeStructureCommand(command));
  const result=await withPreparedFrame(f,f.structureCommand(command));
  await withPreparedFrame(f,f.authority.finishNativeStructureCommand(command));
  assert.equal(result.value,true,result.rejection);
  assert.deepEqual(result.nativeWorldResources[0].nativeBarrierAdditionBinding.nativeIds,owner.ids);
  const removed=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint;
  assert.deepEqual(removed.wallOwners,[]);
  assert.deepEqual(removed.spatialState.barriers,[]);
  assert.equal(removed.spatialState.nextBarrierId,before.spatialState.nextBarrierId);
  assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
 const legacy=structuredClone(state);
 legacy.workerNativeAuthorityCheckpoint.spatialState.barriers=js;
 const legacyOptions=savedNativeAuthorityOptions(serialize(legacy)),old=await nativeProductionAuthority(legacy,legacyOptions);
 try{assert.deepEqual(old.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint.spatialState.barriers,js);}
 finally{await old.close();}
 for(const alter of [
  checkpoint=>{checkpoint.spatialState.barriers[1].halfX+=.01;},
  checkpoint=>{checkpoint.spatialState.barriers[2].passMask=0;},
  checkpoint=>{checkpoint.wallOwners[0].ids.reverse();}
 ]){
  const broken=structuredClone(state);
  alter(broken.workerNativeAuthorityCheckpoint);
  await assert.rejects(nativeProductionAuthority(broken,savedNativeAuthorityOptions(serialize(broken))),/Native world bootstrap reconstruction mismatch/);
 }
});

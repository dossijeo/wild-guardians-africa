import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {rational} from '../src/simulation/money.js';

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
  await operation(authority,command);
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

test('one prepared gate is acquired and paid once while the original Farm keeps advancing',()=>withFarm(async(f,command)=>{
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

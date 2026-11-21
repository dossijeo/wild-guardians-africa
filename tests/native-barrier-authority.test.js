import test from 'node:test';import assert from 'node:assert/strict';
import {rational} from '../src/simulation/money.js';
import {wallSpec} from '../src/simulation/rules.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
async function pump(f,promise){let done=false,result,error;promise.then(value=>{done=true;result=value;},value=>{done=true;error=value;});for(let i=0;i<2000&&!done;i++)await f.present();if(!done)throw Error('Native Build directed test timed out');if(error)throw error;return result;}
async function setup(away=false){
 const source=nativeFarmArrivalRouteFixture({peer:false}),saved=structuredClone(source.state),a=source.point(0,away?8:-3),b=source.point(0,away?14:3);saved.ledger.balance=rational(100000);
 const f=await nativeProductionAuthority(saved,{chunkKeys:[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1']});
 await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));for(let i=0;i<2;i++){f.advance();await f.present();}
 return {f,command:{kind:'buildWallChain',id:away?'native-solid-away':'native-solid-crossing',material:'zarzas',points:[[a.x,a.z],[b.x,b.z]],options:{smooth:false,snap:false}},async close(){try{await f.close();}finally{source.close();}}};
}
for(const away of [false,true])test(`ordinary native solid Build ${away?'outside':'across'} Farm commits only in its own command and preserves immediate checkpoint`,async()=>{
 const x=await setup(away),{f,command}=x;try{
  const before=f.snapshot(),original=f.records.find(r=>r.kind==='farm-arrival').resources.nativeFarmArrival;
  await pump(f,f.authority.prepareNativeStructureCommand(command));
  const ready=f.records.find(r=>r.kind==='barrier-addition');assert(ready);assert.equal(ready.committed,false);assert.equal(f.snapshot().ledger.entries[command.id],undefined);
  const intermediate=f.command({kind:'advance',seconds:.05,nightFastForward:false});assert.equal(intermediate.events.some(e=>e.type==='WallChainBuilt'),false);assert.equal(JSON.parse(intermediate.snapshot).ledger.entries[command.id],undefined);assert.equal(intermediate.nativeWorldResources?.some(r=>r.kind===2)??false,false);
  const result=await pump(f,f.structureCommand(command)),after=JSON.parse(result.snapshot),event=result.events.find(e=>e.type==='WallChainBuilt');
  assert.equal(result.value,true,JSON.stringify({rejection:result.rejection,events:result.events,faults:f.faults}));assert(event);assert.equal(event.commandId,command.id);assert.equal(result.events.filter(e=>e.type==='WallChainBuilt').length,1);assert.equal(event.gates,0);
  assert.deepEqual(after.ledger.entries[command.id],rational(-event.count*wallSpec(command.material).cost));assert.equal(after.structures.length,before.structures.length+event.count);
  const record=result.nativeWorldResources?.find(r=>r.kind===2);assert(record?.nativeBarrierAdditionBinding);assert.equal(result.terrainChanged,false);assert.deepEqual(record.chunks,[]);assert.deepEqual(record.removed,[]);
  const nextTick=f.command({kind:'advance',seconds:.05,nightFastForward:false});assert.equal(nextTick.events.some(e=>e.type==='WallChainBuilt'),false);
  const checkpoint=f.command({kind:'snapshot',visualTerrain:true});assert.deepEqual(checkpoint.terrainCheckpoint.nativeWorldBoundary,record.worldBoundary);assert.equal(checkpoint.events.some(e=>e.type==='WallChainBuilt'),false);
  const duplicate=f.command(command);assert.equal(duplicate.value,false);assert.equal(duplicate.events.some(e=>e.type==='WallChainBuilt'),false);
  await pump(f,f.authority.finishNativeStructureCommand(command));await f.present();assert(ready.committed,JSON.stringify({faults:f.faults,errors:f.errors.map(String),aborted:ready.aborted,host:f.host.inspect()}));assert.deepEqual(f.faults,[]);
  assert.deepEqual(ready.resources.nativeBarrierAddition.additions.map(x=>x.entityId),event.presentation.targetIds);
  if(away){assert.equal(f.records.some(r=>r.kind==='farm-arrival-stop'),false);assert.equal(after.workers[0].nativeRouteAdmission,'native-farm-arrival');}
  else{const stopped=f.records.find(r=>r.kind==='farm-arrival-stop'&&r.committed);assert(stopped);assert.equal(stopped.resources.nativeStop.sourceRoute.actorId,original.actorId);assert.equal(after.workers[0].nativeRouteAdmission,'native-farm-arrival-held');}
 }finally{await x.close();}
});
test('cancelling a ready native solid Build retires its preparation without consuming the purchase',async()=>{
 const x=await setup(true),{f,command}=x;try{
  const before=f.snapshot();await pump(f,f.authority.prepareNativeStructureCommand(command));const record=f.records.find(r=>r.kind==='barrier-addition');assert(record);
  await pump(f,f.authority.finishNativeStructureCommand(command));await f.present();const late=f.command(command),after=JSON.parse(late.snapshot);assert.equal(late.value,false);assert.equal(after.ledger.entries[command.id],undefined);assert.deepEqual(after.structures,before.structures);assert.equal(record.committed,false);assert.deepEqual(f.faults,[]);
 }finally{await x.close();}
});
test('native solid Build rejects an expired quote in its command and never charges',async()=>{
 const x=await setup(true),{f,command}=x;try{
  await pump(f,f.authority.prepareNativeStructureCommand(command));const before=f.snapshot();f.command({kind:'pause',reason:'test-build-stale'});
  const result=await pump(f,f.structureCommand(command)),after=JSON.parse(result.snapshot);assert.equal(result.value,false);assert.equal(after.ledger.entries[command.id],undefined);assert.deepEqual(after.structures,before.structures);assert.equal(result.nativeWorldResources?.some(r=>r.kind===2)??false,false);assert.equal(result.events.some(e=>e.type==='WallChainBuilt'),false);
  await pump(f,f.authority.finishNativeStructureCommand(command));assert.equal(f.records.find(r=>r.kind==='barrier-addition').committed,false);assert.deepEqual(f.faults,[]);
 }finally{await x.close();}
});

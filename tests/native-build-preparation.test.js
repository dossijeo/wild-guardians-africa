import test from 'node:test';import assert from 'node:assert/strict';
import {rational} from '../src/simulation/money.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
async function setup(onPrepare=()=>{},advances=2){
 const source=nativeFarmArrivalRouteFixture({peer:false}),saved=structuredClone(source.state),a=source.point(0,-3),b=source.point(0,3);saved.ledger.balance=rational(100000);
 const f=await nativeProductionAuthority(saved,{onPrepare,chunkKeys:[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1']});await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));
 for(let i=0;i<advances;i++){f.advance();await f.present();}
 return {source,f,command:{kind:'buildWallChain',id:'prepared-crossing',material:'zarzas',points:[[a.x,a.z],[b.x,b.z]],options:{smooth:false,snap:false}},async close(){try{await f.close();}finally{source.close();}}};
}
async function pump(f,promise){let done=false,error,result;promise.then(r=>{done=true;result=r;},e=>{done=true;error=e;});for(let i=0;i<2000&&!done;i++)await f.present();if(!done)throw Error('Preparation timed out');if(error)throw error;return result;}
test('ordinary Build stops its native Farm consumer before purchase and admits the continuation',async()=>{
 const x=await setup(),{f,command}=x;
 try{
  const before=f.snapshot(),original=f.records[0].resources.nativeFarmArrival;
  await pump(f,f.authority.prepareNativeStructureCommand(command));
  await f.present();const stop=f.records.find(r=>r.kind==='farm-arrival-stop');assert(stop?.committed);
  assert.equal(f.snapshot().ledger.entries[command.id],undefined,'preparation never charges');
  assert.equal(f.snapshot().workers[0].nativeRouteAdmission,'native-farm-arrival-held');
  const result=f.command(command);assert.equal(result.value,true);assert.equal(result.events.filter(e=>e.type==='WallChainBuilt').length,1);
  assert.equal(f.command(command).value,false);f.authority.finishNativeStructureCommand(command);
  for(let i=0;i<2;i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r!==f.records[0]&&r.committed));
  const replacement=f.records.findLast(r=>r.kind==='farm-arrival');assert.equal(replacement.resources.nativeFarmArrival.actorId,original.actorId);assert.equal(replacement.resources.nativeFarmArrival.bodyId,original.bodyId);
  const held=f.snapshot().workers[0];for(let i=0;i<4;i++){f.advance();await f.present();}
  const moving=f.snapshot().workers[0];assert.notDeepEqual([moving.x,moving.z],[held.x,held.z]);assert.deepEqual(f.faults,[]);
 }finally{await x.close();}
});
test('bypassing preparation cannot charge or invalidate a moving Farm',async()=>{
 const x=await setup(),{f,command}=x;try{const before=f.snapshot(),result=f.command(command),after=JSON.parse(result.snapshot);assert.equal(result.value,false);assert.equal(after.ledger.entries[command.id],undefined);assert.equal(after.workers[0].nativeRouteAdmission,'native-farm-arrival');assert.deepEqual(after.structures,before.structures);assert.equal(f.records.length,1);}finally{await x.close();}
});
test('pending stop preparation keeps actual native execution and Game advancing before any purchase',async()=>{
 let release;const gate=new Promise(r=>{release=r;});const x=await setup(r=>r.kind==='farm-arrival-stop'?gate:undefined),{f,command}=x;
 try{
  const before=f.snapshot(),pending=f.authority.prepareNativeStructureCommand(command);pending.catch(()=>{});
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival-stop'));
  assert.throws(()=>f.authority.finishNativeStructureCommand(command),/identity/);
  await assert.rejects(f.authority.quiesceNativeIntentProduction(),/structure/);
  for(let i=0;i<5;i++){f.advance();await f.present();}
  const during=f.snapshot();assert(during.elapsed>before.elapsed);assert.notDeepEqual([during.workers[0].x,during.workers[0].z],[before.workers[0].x,before.workers[0].z]);assert.equal(during.ledger.entries[command.id],undefined);assert.deepEqual(during.structures,before.structures);
  release();await pump(f,pending);await f.present();assert.equal(f.command(command).value,true);f.authority.finishNativeStructureCommand(command);assert.deepEqual(f.faults,[]);
 }finally{release();await x.close();}
});
test('a failed stop preparation cannot charge, destroy the acquired route or keep production held',async()=>{
 const x=await setup(r=>{if(r.kind==='farm-arrival-stop')throw Error('intentional stop rejection');}),{f,command}=x;
 try{await assert.rejects(pump(f,f.authority.prepareNativeStructureCommand(command)),/intentional stop rejection/);const state=f.snapshot();assert.equal(state.ledger.entries[command.id],undefined);assert.equal(state.workers[0].nativeRouteAdmission,'native-farm-arrival');assert.equal(f.authority.nativeIntentProductionStatus().phase,'idle');assert.equal(f.command(command).value,false);}finally{await x.close();}
});
test('finishing a prepared but cancelled Build permits continuation without purchase',async()=>{
 const x=await setup(),{f,command}=x;try{await pump(f,f.authority.prepareNativeStructureCommand(command));await f.present();assert.throws(()=>f.authority.finishNativeStructureCommand({...command,id:'other'}),/identity/);f.authority.finishNativeStructureCommand(command);for(let i=0;i<2;i++){f.advance();await f.present();}await untilProduction(f,()=>f.records.filter(r=>r.kind==='farm-arrival'&&r.committed).length===2);assert.equal(f.snapshot().ledger.entries[command.id],undefined);assert.deepEqual(f.faults,[]);}finally{await x.close();}
});
test('cold Build refuses eager region publication after native acquisition without charging or stopping Farm',async()=>{
 const x=await setup(),{f}=x,command={...x.command,points:[[120,8],[120,14]]};try{const before=f.snapshot();await assert.rejects(pump(f,f.authority.prepareNativeStructureCommand(command)),/prepared regions/);const result=f.command(command),after=JSON.parse(result.snapshot);assert.equal(result.value,false);assert.deepEqual(result.commandLoadedChunks??[],[]);assert.notEqual(result.terrainChanged,true);assert.equal(result.nativeWorldResources,undefined);assert.deepEqual(after.structures,before.structures);assert.equal(after.ledger.entries[command.id],undefined);assert.equal(f.records.length,1);assert.deepEqual(f.faults,[]);}finally{await x.close();}
});
test('a native fact change during stop preparation invalidates Build without purchase or fabricated readiness',async()=>{
 let release;const gate=new Promise(r=>{release=r;});const x=await setup(r=>r.kind==='farm-arrival-stop'?gate:undefined,0),{f,command}=x;
 try{const pending=f.authority.prepareNativeStructureCommand(command);pending.catch(()=>{});await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival-stop'));f.advance();await f.present();release();await assert.rejects(pump(f,pending),/stale/);assert.equal(f.snapshot().ledger.entries[command.id],undefined);assert.equal(f.records.find(r=>r.kind==='farm-arrival-stop').committed,false);assert.equal(f.authority.nativeIntentProductionStatus().phase,'idle');}finally{release();await x.close();}
});
test('ordinary cold construction without an acquired native world keeps its existing region-loading behavior',async()=>{
 const origin=nativeFarmArrivalRouteFixture({peer:false}),state=structuredClone(origin.state),a=origin.point(0,8),b=origin.point(0,14);delete state.workers[0].nativeRouteAdmission;state.ledger.balance=rational(100000);let f;
 try{f=await nativeProductionAuthority(state,{attach:false});const result=f.command({kind:'buildWallChain',id:'legacy-cold-build',material:'zarzas',points:[[a.x,a.z],[b.x,b.z]],options:{smooth:false,snap:false}});assert.equal(result.value,true);assert.deepEqual(result.commandLoadedChunks,['2,-1','2,0','2,1']);assert.equal(result.terrainChanged,true);assert.equal(result.nativeWorldResources,undefined);assert.equal(f.records.length,0);}finally{try{await f?.close();}finally{origin.close();}}
});

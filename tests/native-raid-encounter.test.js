import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';

const chunkKeys=Array.from({length:25},(_,i)=>[i%5-2,Math.floor(i/5)-2].join(','));
const eventLoop=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(qualifyRaidEncounter){
 const fixture=nativeFarmArrivalRouteFixture({peer:false}),state=structuredClone(fixture.state);
 fixture.close();
 state.rng=3;
 state.dayPlan={done:false,at:state.time+.8,group:['warthog']};
 const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,qualifyRaidEncounter});
 await untilProduction(world,()=>world.records.some(record=>record.kind==='farm-arrival'&&record.committed));
 world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-16,z:1.4},target:{x:-10,z:0}}});
 return world;
}
async function advance(world,count=1){
 return await world.command({kind:'advance',steps:count,seconds:.02,nightFastForward:false});
}
async function reachSecondHit(world){
 let snapshot=world.snapshot();
 while(snapshot.elapsed<12.60-1e-9){
  snapshot=JSON.parse((await advance(world)).snapshot);
  await world.present();
 }
 return snapshot;
}
async function until(read){
 for(let i=0;i<1000;i++){
  const value=read();
  if(value)return value;
  await eventLoop();
 }
 assert.fail('Native encounter did not reach the expected port boundary');
}

test('the qualified Desert encounter waits for its submitted Retreat before the next substep',async()=>{
 const world=await setup(true);
 try{
  let snapshot=await reachSecondHit(world);
  const worker=snapshot.workers[0],first=snapshot.events.find(event=>event.type==='WorkerHit');
  assert.equal(first.nativeHomeImpact.home.reference.bodyId,1);
  assert.equal(worker.hits,1);
  const checkpoint=await world.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(checkpoint.saveAvailable,false);
  assert.equal(checkpoint.nativeAuthorityCheckpoint,undefined);
  const receive=world.resourcePort.onmessage;
  let held,settled=false;
  world.resourcePort.onmessage=event=>{
   if(event.data.result?.assignment){held=event;return;}
   receive(event);
  };
  const advancing=advance(world,2);
  advancing.then(()=>{settled=true;},()=>{settled=true;});
  const at=snapshot.elapsed+.02;
  await until(()=>settled||world.host.inspect().nativeCausalClock.committedThrough===at&&world.host.inspect().pendingSequence!==null);
  assert.equal(settled,false);
  assert.equal(held,undefined);
  const lastDraw=world.host.inspect().nativeRouteFrame?.sequence;
  world.host.setVisibility(true);
  await world.present();
  const hidden=world.host.inspect();
  assert.equal(hidden.presentationOpportunities.at(-1).outcome,'hidden');
  assert.equal(hidden.nativeRouteFrame?.sequence,lastDraw);
  assert.equal(hidden.nativeCausalClock.committedThrough,at);
  assert.equal(held,undefined);
  assert.equal(settled,false);
  world.host.setVisibility(false);
  await world.present();
  await until(()=>held||settled);
  assert.equal(settled,false);
  const submitted=world.host.inspect().nativeRouteFrame;
  assert.equal(submitted.worldBoundary.ticket,held.data.result.worldBoundary.ticket);
  assert.equal(submitted.sequence,held.data.result.sequence);
  assert.equal(submitted.clockElapsed,at);
  assert.equal(submitted.bindings.find(row=>row.nativeAnimalCrop?.purpose==='retreat').relativeTime,0);
  assert.equal(held.data.result.assignment,12);
  receive(held);
  world.resourcePort.onmessage=receive;
  const completed=await advancing;
  assert.equal(completed.stepsExecuted,2);
  assert.equal(completed.elapsed,at+.02);
  assert.equal(completed.events.filter(event=>event.type==='AnimalRetreating').length,1);
  snapshot=JSON.parse(completed.snapshot);
  while(snapshot.elapsed<19&&!snapshot.workers[0].recoveryExitRemaining){
   snapshot=JSON.parse((await advance(world)).snapshot);
   await world.present();
  }
  assert.equal(snapshot.workers[0].recoveryExitRemaining,.24);
  assert.equal(snapshot.workers[0].hits,2);
  assert.equal(snapshot.raid,null);
  assert.equal(snapshot.structures[0].hp,600);
  assert.deepEqual([...world.errors,...world.faults],[]);
 }finally{await world.close();}
});

for(const order of ['commit in transit','commit accepted'])test(`retiring Draw before the Retreat submit leaves the next substep unexecuted with ${order}`,async()=>{
 const world=await setup(true);
 try{
  const snapshot=await reachSecondHit(world);
  const at=snapshot.elapsed+.02;
  const receive=world.resourcePort.onmessage;
  const post=world.resourcePort.postMessage.bind(world.resourcePort);
  let heldCommit;
  if(order==='commit in transit')world.resourcePort.postMessage=(message,...args)=>{
   if(message.kind==='commitEncounterRetreatResources'){heldCommit=message;return;}
   post(message,...args);
  };
  const submissions=[];
  world.resourcePort.onmessage=event=>{
   if(event.data.result?.assignment)submissions.push(event.data.result);
   receive(event);
  };
  const advancing=advance(world,2);
  advancing.catch(()=>{});
  await until(()=>world.host.inspect().nativeCausalClock.committedThrough===at&&world.host.inspect().pendingSequence!==null&&
   (order==='commit in transit'?heldCommit:world.records.some(record=>record.resources.reference?.purpose==='retreat'&&record.committed)));
  const pending=world.host.inspect().pendingSequence;
  assert.notEqual(world.host.inspect().nativeRouteFrame?.sequence,pending);
  world.client.dispose();
  await world.host.dispose();
  if(heldCommit)post(heldCommit);
  const reason=order==='commit in transit'?/graphics retired before commit/i:/disposed/i;
  await assert.rejects(advancing,reason);
  assert.deepEqual(submissions,[]);
  assert.notEqual(world.host.inspect().nativeRouteFrame?.sequence,pending);
  assert.throws(()=>world.command({kind:'snapshot'}),reason);
 }finally{await world.close();}
});

for(const first of ['resources','draw'])test(`encounter recovery waits for both retirements with ${first} first`,async()=>{
 const world=await setup(true);
 try{
  const snapshot=await reachSecondHit(world);
  const at=snapshot.elapsed+.02;
  const advancing=advance(world,2);
  advancing.catch(()=>{});
  await until(()=>world.host.inspect().nativeCausalClock.committedThrough===at&&world.host.inspect().pendingSequence!==null&&
   world.records.some(record=>record.resources.reference?.purpose==='retreat'&&record.committed));
  const submitted=world.host.inspect().nativeRouteFrame?.sequence;
  const hold=await world.authority.quiesceNativeIntentProduction();
  await assert.rejects(world.authority.flushNativeResourcePreparation({allowRetired:true}),/already pending/);
  let settled=false;
  const retired=world.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
  retired.then(()=>{settled=true;},()=>{settled=true;});
  if(first==='resources'){
   world.retireResourceEndpoint();
   await until(()=>world.authority.nativeResourcePreparationStatus().phase==='failed');
  }else{
   await world.host.dispose();
   await until(()=>world.authority.nativeIntentControlStatus().current?.drained);
  }
  await eventLoop();
  assert.equal(settled,false);
  assert.equal(world.host.inspect().nativeRouteFrame?.sequence,submitted);
  assert.throws(()=>world.authority.resumeNativeIntentProduction(hold),/still owns/);
  if(first==='resources')await world.host.dispose();
  else world.retireResourceEndpoint();
  assert.deepEqual(await retired,{version:1,session:'production-resources',terminal:true,callbacksSettled:true});
  await assert.rejects(advancing,first==='resources'?
   {name:'AbortError',message:'Native gate preparation cancelled'}:/WebGPU device lost/);
  assert.equal(world.host.inspect().nativeRouteFrame?.sequence,submitted);
  assert.equal(world.authority.nativeIntentProductionStatus().phase,'suspended');
 }finally{await world.close();}
});

test('the ordinary Desert qualifications still withhold contact corridors without encounter qualification',async()=>{
 const world=await setup(false);
 try{
  let snapshot=world.snapshot();
  while(snapshot.elapsed<12.64-1e-9){
   snapshot=JSON.parse((await advance(world)).snapshot);
   await world.present();
  }
  assert.equal(snapshot.workers[0].hits,0);
  assert.equal(snapshot.events.some(event=>event.nativeHomeImpact),false);
  assert.equal(world.records.some(record=>record.kind==='animal-crop-route'&&record.committed),false);
  assert.equal((await world.command({kind:'snapshot',nativeAuthorityCheckpoint:true})).nativeAuthorityCheckpoint.version,3);
  assert.deepEqual([...world.errors,...world.faults],[]);
 }finally{await world.close();}
});

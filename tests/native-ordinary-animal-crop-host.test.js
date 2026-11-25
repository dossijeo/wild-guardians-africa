import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import test from 'node:test';
import {nativeFrameReadiness} from '../src/rendering/webgpu-frame-recovery.js';
import {sameNativeWorldBoundary} from '../src/world/native-world-boundary.js';
import {checkCropHitPreview} from './helpers/native-crop-hit-preview.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
function fixture(){
const s=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d1-native-active-raid.json.gz')).toString());
const {chunkKeys}=JSON.parse(readFileSync('docs/guardian/performance/native-ordinary-attack-crops-20261121.json'));
const manifest={epoch:'crop',chunks:chunkKeys.map(k=>{const [cx,cz]=k.split(',').map(Number);return {cx,cz,revision:1};})};
return {s,manifest,chunkKeys};
}
test('prepared warthog retains its original rig across the issued crop route and strike',async()=>{
const {s,manifest,chunkKeys}=fixture();
const retired=[];
const rig=await originalRig(structuredClone(s),manifest,{contention:'post-strike',onNativeCropStrikeRetired:ref=>retired.push(ref)});const ready=[],commits=[],frames=[];
const f=await nativeProductionAuthority(s,{qualifyAnimalCrop:true,chunkKeys,getTerrainManifest:()=>manifest,onPrepare:r=>rig.prepare(r.resources),onReady:r=>new Promise(resolve=>ready.push(resolve)),
 onCommit:(r,data)=>{const proof=data.nativeAnimalCropRouteBinding??data.nativeAnimalCropStrikeBinding;rig.commit(proof,data);commits.push(proof);}});
try{
 const advance=()=>JSON.parse(f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false}).snapshot);let state=f.snapshot();
 for(const kind of [26,27]){
  await untilProduction(f,()=>ready.length>0);
  const held=state.raid.animals[0];state=advance();
  assert.equal(state.raid.animals[0].x,held.x);assert.equal(state.raid.animals[0].motionPhase,held.motionPhase);
  ready.shift()();await untilProduction(f,()=>commits.at(-1)?.reference.kind===kind);
  await untilProduction(f,()=>f.host.inspect().nativeRouteFrame?.worldBoundary?.ticket===commits.at(-1).reference.worldBoundary.ticket);
  const ref=commits.at(-1).preparedReference,proof=commits.at(-1).reference,first=f.host.inspect().nativeRouteFrame;
  assert(first.bindings.some(b=>b.nativeAnimalCrop?.kind===kind&&b.executionEpoch===proof.worldBoundary.effectiveTime));
  const ages=[];let testedQueuedRetirement=false;
  for(let i=0;i<400;i++){
   let queued=null,outcome=null,count=0;
   if(kind===27&&state.raid.animals[0].status==='attacking'&&state.elapsed+.05>=proof.endTime){
    const group=f.records.at(-1).cropGroup;
    const metadata={nativeWorldBoundary:proof.worldBoundary,
      clock:{...f.clock,elapsed:state.elapsed,safeUntil:proof.endTime,paused:true,segments:[]}};
    queued=submitAnimalFrame(f,group,metadata).then(()=>{outcome='drawn';},error=>{outcome=error;});
    for(let wait=0;wait<100&&f.host.inspect().pendingSequence===null&&!outcome;wait++)
      await new Promise(resolve=>setImmediate(resolve));
    assert(f.host.inspect().pendingSequence!==null,'strike packet admitted before direct retirement');
    assert.equal(outcome,null);count=f.gpu.submitted.length;
   }
   state=advance();rig.update(structuredClone(state));await f.present();
   if(queued){
    testedQueuedRetirement=true;assert.equal(state.raid.animals[0].hitApplied,true);
    assert.equal(f.host.inspect().pendingSequence,null,'revoked pending packet must release producer');
    await queued;assert.equal(outcome?.code,'remote-frame-native-route-obsolete');
    assert.equal(outcome.resourcePreparationsRetained,true);assert.equal(f.gpu.submitted.length,count);
   }
   const fact=f.host.inspect().nativeRouteFrame?.bindings.find(b=>b.nativeAnimalCrop?.kind===kind);
   if(fact){if(!ages.length){const bad=structuredClone(f.host.inspect());bad.nativeRouteFrame.bindings.find(b=>b.nativeAnimalCrop).nativeAnimalCrop.worldBoundary.authorityEpoch='obsolete';assert.throws(()=>captureNativeRoutePickFrame(bad));}
     if(ages.length%45===0&&state.raid.animals[0].targetId)rig.presented(fact.relativeTime);assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getAnimalCropAge(ref),fact.relativeTime);assert.deepEqual(fact.nativeAnimalCrop,ref);ages.push(fact.relativeTime);}
   if(kind===26&&f.records.length===2||kind===27&&state.events.some(e=>e.type==='AnimalLogicalHit'))break;
  }
  assert.equal(testedQueuedRetirement,kind===27);
  assert(ages.some(age=>age>.1));assert(ages.every((age,i)=>!i||age>=ages[i-1]));
  frames.push({kind,ticket:proof.worldBoundary.ticket,first:first.clockElapsed,ages:ages.length,last:ages.at(-1)});
 }
 assert.equal(state.events.filter(e=>e.type==='AnimalLogicalHit'&&e.attackId==='attack-661').length,1);
 assert.equal(state.raid.animals[0].hitsRemaining,1);assert.deepEqual(f.faults,[]);
 await rig.checkHistoricalDemand();
 await checkLateAnimalPacket(f,commits.at(-1),f.records.at(-1),retired);
 console.log(JSON.stringify({frames,hit:'attack-661',faults:f.faults}));
}catch(e){console.error(f.faults,f.authority.nativeIntentProductionStatus(),f.host.inspect().nativeRouteFrame);throw e;}finally{await f.close();rig.close();}

});

test('ordinary profile finishes a two-step advance across the first hit until the successor is admitted',async()=>{
const {s,manifest,chunkKeys}=fixture();
const f=await nativeProductionAuthority(s,{chunkKeys,getTerrainManifest:()=>manifest});
try{
 let state=f.snapshot(),hits=new Set(),ticks=0;
 while(!hits.size&&ticks++<550){state=f.advance();for(const e of state.events)if(e.type==='AnimalLogicalHit')hits.add(e.attackId);await f.present();}
 assert(hits.size);const after=f.advance();assert(after.elapsed>state.elapsed);assert.equal(f.records.length,0);assert.deepEqual(f.faults,[]);
 console.log(JSON.stringify({twoStepOrdinary:true,ticks,hits:[...hits],elapsedAfterHit:after.elapsed,cropProposals:f.records.length}));
}finally{await f.close();}
});

for(const contention of ['historical','locomotion']){
 test('crop route acquires its original rig during '+contention+' preparation',async()=>{
  const {s,manifest,chunkKeys}=fixture();
  const rig=await originalRig(structuredClone(s),manifest,{contention});
  const f=await nativeProductionAuthority(s,{qualifyAnimalCrop:true,chunkKeys,getTerrainManifest:()=>manifest,
   onPrepare:r=>rig.prepare(r.resources),onCommit:(r,data)=>rig.commit(data.nativeAnimalCropRouteBinding,data)});
  try{
   await untilProduction(f,()=>f.host.inspect().nativeRouteFrame?.bindings.some(b=>b.nativeAnimalCrop?.kind===26));
   assert.deepEqual(f.faults,[]);
  }finally{await f.close();rig.close();}
 });
}

// Exercise the Surface functions and the options wired to its real roster.
// The fixture supplies only the single acquired world and the capture wake.
function terminalSurfaceGate(world){
 const source=readFileSync(new URL('../src/rendering/webgpu-world-surface.js',import.meta.url),'utf8');
 const functions=source.slice(source.indexOf('const nativeFrameState='),source.indexOf('function acceptPreparedNativeTerrain('));
 const roster=source.slice(source.indexOf('roster=createWebGpuAnimalRoster(')).split('});roster.sync()')[0];
 const options=roster.slice(roster.indexOf('onlyActorId:'));
 const build=new Function('world','nativeFrameReadiness','sameNativeWorldBoundary',`
  let closed=false,nativeGateProposal=null,terrain=null,nativeResumeTarget=null,nativeRejectedFrame=null,retainedCenterRuin=null;
  let timelineRecovering=false,nativeRoutePreparations=0,nativeRouteRejected=false,nativeRouteResourceRevision=1,wakes=0;
  const remoteGpu={requiredNativeWorldBoundary:()=>world},preparedNativeWorldBoundary=world,onPresentationReady=()=>wakes++;
  const experimentalAllActors=true,onSelectableChange=()=>{},onError=()=>{},onActorReady=()=>{};
  ${functions}
  const options={${options}};
  return {reject:retainRejectedNativeFrame,readiness:nativeDrawReadiness,notify:r=>options.onNativeCropStrikeRetired?.(r),
   wakes:()=>wakes,revision:()=>nativeRouteResourceRevision};
 `);
 return build(world,nativeFrameReadiness,sameNativeWorldBoundary);
}

async function waitForCropCommitWithoutDraw(done){
 for(let i=0;i<2000&&!done();i++)await new Promise(resolve=>setImmediate(resolve));
 assert(done(),'expected acquired crop receipt while RAF is withheld');
}
function submitAnimalFrame(f,bindGroup,metadata){
 f.client.beginFrame(metadata);
 const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[
   {view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
 pass.setPipeline(f.pipeline);pass.setBindGroup(0,bindGroup);pass.draw(3);pass.end();
 f.client.device.queue.submit([encoder.finish()]);return f.client.endFrame();
}

async function checkLateAnimalPacket(f,proof,record,retired){
 const {reference,preparedReference}=proof,metadata={nativeWorldBoundary:reference.worldBoundary,
   clock:{...f.clock,elapsed:reference.endTime,safeUntil:reference.endTime,paused:true,segments:[]}};
 const draw=group=>submitAnimalFrame(f,group,metadata);
 const count=f.gpu.submitted.length;
 const selector={byteOffset:0,semantic:'relative',epoch:preparedReference.worldBoundary.effectiveTime,
   resourceEnd:reference.kind===26?nativeClockResourceEnd(preparedReference.worldBoundary.effectiveTime,preparedReference.endTime):preparedReference.endTime,nativeAnimalCrop:preparedReference};
 f.client.registerClockBinding(record.cropBuffer,selector);
 let rejection;
 await assert.rejects(draw(record.cropGroup),e=>{rejection=e;return e.code==='remote-frame-native-route-obsolete'&&e.resourcePreparationsRetained;});
 const gate=terminalSurfaceGate(reference.worldBoundary),captured={nativeRouteResourceRevision:gate.revision()};
 assert(gate.reject(rejection,captured));assert.equal(gate.readiness(),'waiting');
 for(const other of [{...reference,kind:26,purpose:undefined},{...reference,worldBoundary:{...reference.worldBoundary,authorityEpoch:'other'}}]){
  gate.notify(other);assert.equal(gate.readiness(),'waiting');assert.equal(gate.wakes(),0);
 }
 for(const event of retired)gate.notify(event);
 assert.equal(gate.readiness(),'ready','the confirmed roster release must wake the Surface capture');
 assert.deepEqual(retired,[reference]);assert.equal(gate.wakes(),1);
 // The same recording can be rejected after the confirmed roster event.
 assert(gate.reject(rejection,captured));assert.equal(gate.readiness(),'ready');
 assert.equal(gate.revision(),captured.nativeRouteResourceRevision+1);
 await f.present();assert.equal(f.gpu.submitted.length,count);assert.deepEqual(f.errors,[]);
 const clean=f.frame(1,metadata);await f.present();await clean;
 assert(f.gpu.submitted.length>count);
 // A copied reference on a different buffer never received this assignment.
 const alien=f.client.device.createBuffer({size:16,usage:72});
 f.client.registerClockBinding(alien,selector);
 const forged=f.client.device.createBindGroup({entries:[{binding:0,resource:{buffer:alien}}]});
 await assert.rejects(draw(forged),/lacks its current native source/);
}

for(const forgePreviousTicket of [false,true])test(forgePreviousTicket?
 'second native crop rejects a request naming another completed strike':
 'second native crop uses the terminal body and ordinary selection on the following step',async()=>{
 const {s,manifest,chunkKeys}=fixture(),ready=[],commits=[];
 const retired=[];
 const rig=await originalRig(structuredClone(s),manifest,{contention:'successor-history',onNativeCropStrikeRetired:r=>retired.push(r)});
 const f=await nativeProductionAuthority(s,{qualifyAnimalCrop:true,observeWorldMotion:!forgePreviousTicket,captureHistoricalEvents:!forgePreviousTicket,chunkKeys,getTerrainManifest:()=>manifest,onPrepare:r=>rig.prepare(r.resources),onReady:r=>new Promise(resolve=>ready.push(resolve)),onCommit:(r,data)=>{
  const proof=data.nativeAnimalCropRouteBinding??data.nativeAnimalCropStrikeBinding;rig.commit(proof,data);commits.push(proof);
 }});
 let altered=false;
 if(forgePreviousTicket){
  const send=f.controlPort.postMessage;
  f.controlPort.postMessage=message=>{
   if(message.pendingAnimalCrop?.previousStrike){
    const event=structuredClone(message);event.pendingAnimalCrop.previousStrike.ticket++;altered=true;send(event);
   }else send(message);
  };
 }
 try{
  let state=f.snapshot(),afterHit=null;const hits=[];
  const actor=()=>state.raid.animals[0],pose=()=>[actor().x,actor().z,actor().heading,actor().motionPhase];
  const step=async()=>{
   const message=f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false,captureClockSegments:!forgePreviousTicket});
   if(!forgePreviousTicket&&message.events.some(event=>event.type==='AnimalLogicalHit'))checkCropHitPreview(state,message,rig.nativeCropLease);
   state=JSON.parse(message.snapshot);rig.update(structuredClone(state));await f.present();
  };
  for(const [i,kind] of [26,27,26,27].entries()){
   if(i===2){
    assert.equal(actor().targetId,null);assert.equal(actor().reservation,null);assert.equal(actor().hitsRemaining,1);
    await step();
    if(forgePreviousTicket){
      await untilProduction({...f,faults:[]},()=>f.errors.length>0);
      assert(altered);assert.match(f.errors.join(' '),/Crop successor lacks the completed strike body/);
      assert.equal(commits.length,2);assert.deepEqual(pose(),afterHit);return;
    }
    assert.deepEqual(pose(),afterHit);assert.equal(actor().targetId,'plant-337');assert.equal(state.raid.reservations['crop:plant-337'],actor().id);
   }
   await untilProduction(f,()=>ready.length>0);
   const oldPose=pose(),budget=actor().hitsRemaining;
   for(let hold=0;hold<3;hold++){await step();assert.deepEqual(pose(),oldPose);assert.equal(actor().hitsRemaining,budget);}
   ready.shift()();
   if(forgePreviousTicket)await untilProduction(f,()=>commits.length===i+1);
   else{
    await waitForCropCommitWithoutDraw(()=>commits.length===i+1);
    await step();
    const proof=commits[i],frame=f.host.inspect().nativeRouteFrame;
    assert.equal(frame.worldBoundary.ticket,proof.reference.worldBoundary.ticket);
    assert(frame.clockElapsed>proof.reference.worldBoundary.effectiveTime);
    assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getAnimalCropAge(proof.preparedReference),0);
   }
   const proof=commits[i],ref=proof.reference;
   assert.equal(ref.kind,kind);assert.equal(ref.bodyId,1);assert.equal(ref.targetId,i<2?373:337);assert(ref.worldBoundary.ticket>proof.preparedReference.worldBoundary.ticket);
   await untilProduction(f,()=>f.host.inspect().nativeRouteFrame?.worldBoundary?.ticket===ref.worldBoundary.ticket);
   const image=f.host.inspect().nativeRouteFrame;
   assert(image.bindings.some(b=>b.nativeAnimalCrop?.kind===kind&&b.executionEpoch===ref.worldBoundary.effectiveTime));
   if(i===2){assert.equal(proof.preparedReference.phase,afterHit[3]);}
   let finished=false;
   for(let n=0;n<400;n++){
    await step();
    if(kind===26&&f.records.length>i+1){finished=true;break;}
    if(kind===27&&actor().hitApplied&&actor().status!=='attacking'){
     const event=state.events.find(e=>e.type==='AnimalLogicalHit'&&e.attackId===actor().attackId);
     assert(event);assert.equal(event.targetId,'plant-'+ref.targetId);assert.equal(state.events.filter(e=>e.id===event.id).length,1);
     assert.equal(state.plants.find(p=>p.id===event.targetId).alive,false);
     hits.push(event.attackId);afterHit=pose();finished=true;break;
    }
   }
   assert(finished);
  }
  assert.equal(new Set(hits).size,2);assert.equal(hits[0],'attack-661');assert.equal(actor().hitsRemaining,0);assert.equal(state.raid.introCropsDestroyed,2);assert.equal(actor().status,'walking');
  assert.equal(actor().targetId,null);assert.equal(actor().reservation,null);
  const clock={...f.clock,elapsed:state.elapsed,safeUntil:state.elapsed,paused:true,segments:[]};
  const drawn=f.frame(1,{nativeWorldBoundary:commits.at(-1).reference.worldBoundary,clock});await f.present();await drawn;
  assert.equal(f.host.inspect().nativeRouteFrame.bindings.some(b=>b.nativeAnimalCrop),false);
  assert.deepEqual(f.faults,[]);
  await step();assert.equal(actor().status,'retreating');assert.equal(actor().targetId,null);assert.deepEqual(pose(),afterHit);
  await untilProduction(f,()=>ready.length===1);
  for(let hold=0;hold<4;hold++){await step();assert.deepEqual(pose(),afterHit);}
  ready.shift()();
  // Keep RAF pending after GO. Let the direct causal channel advance first.
  await waitForCropCommitWithoutDraw(()=>commits.length===5);
  const depart=commits.at(-1),exit=actor().exit;
  assert.equal(depart.reference.purpose,'retreat');assert.equal(depart.reference.bodyId,1);
  assert.equal(depart.reference.targetId,null);assert.equal(depart.reference.centerId,null);
  assert.deepEqual([depart.reference.targetX,depart.reference.targetZ],[exit.x,exit.z]);
  assert.equal(depart.reference.phase,afterHit[3]);
  const origin=depart.reference.worldBoundary.effectiveTime,ticket=depart.reference.worldBoundary.ticket;
  assert.notEqual(f.host.inspect().nativeRouteFrame?.worldBoundary?.ticket,ticket);
  state=JSON.parse(f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false}).snapshot);
  rig.update(structuredClone(state));
  const count=f.gpu.submitted.length;
  f.host.setVisibility(true);
  f.command({kind:'pause',reason:'menu'});
  await f.present();
  assert.equal(f.gpu.submitted.length,count,'hidden opportunity never consumes first use');
  assert.notEqual(f.host.inspect().nativeRouteFrame?.worldBoundary?.ticket,ticket);
  const writes=[],queue=f.gpu.device.queue,write=queue.writeBuffer;
  queue.writeBuffer=(buffer,offset,data)=>{if(data instanceof Float32Array&&data.length===1)writes.push({buffer,offset,value:data[0]});return write.call(queue,buffer,offset,data);};
  f.host.setVisibility(false);
  try{await f.present();}finally{queue.writeBuffer=write;}
  const first=f.host.inspect().nativeRouteFrame,binding=first.bindings.find(row=>row.nativeAnimalCrop);
  assert.equal(first.worldBoundary.ticket,ticket);
  assert(first.clockElapsed>origin,'direct causal clock already covers the first sample');
  assert.equal(binding.relativeTime,0,'first submitted local age of the acquired retreat');
  assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getAnimalCropAge(depart.preparedReference),0);
  const alias=writes.find(row=>row.offset===4);
  assert(alias&&alias.value===0);
  assert(writes.some(row=>row.offset===0&&row.buffer===alias.buffer&&row.value===0));
  const age=()=>captureNativeRoutePickFrame(f.host.inspect()).getAnimalCropAge(depart.preparedReference);
  const firstSeq=first.sequence;
  await f.present();
  assert.equal(f.host.inspect().nativeRouteFrame.sequence,firstSeq);
  assert.equal(age(),0,'paused replay holds its submitted origin');
  f.command({kind:'resume',reason:'menu'});
  await step();
  const runningAge=age();assert(runningAge>0);
  const readSlot=offset=>new Float32Array(alias.buffer.data.buffer,alias.buffer.data.byteOffset+offset,1)[0];
  assert.equal(readSlot(0),runningAge);assert.equal(readSlot(4),runningAge);
  f.command({kind:'pause',reason:'menu'});await f.present();
  const pausedAge=age();await f.present();assert.equal(age(),pausedAge);
  const ordinary=submitAnimalFrame(f,f.records.at(-1).cropGroup,{clock:{...f.clock,elapsed:state.elapsed,safeUntil:state.elapsed,paused:true,segments:[]},nativeWorldBoundary:depart.reference.worldBoundary});
  await f.present();await ordinary;
  assert(f.host.inspect().nativeRouteFrame.sequence>firstSeq);
  assert.equal(age(),pausedAge,'new packet referencing the same GO cannot restart its motion');
  assert.equal(readSlot(0),pausedAge);assert.equal(readSlot(4),pausedAge);
  f.command({kind:'resume',reason:'menu'});
  const lifecycle=[];let moving=false;
  for(let n=0;n<300&&state.raid;n++){
    const result=f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});state=JSON.parse(result.snapshot);
    lifecycle.push(...(result.presentationJournal??[]).filter(x=>x.kind==='animalGone'));
    if(state.elapsed<depart.reference.endTime){assert.equal(actor().status,'retreating');moving ||= actor().motionPhase>afterHit[3];}
    rig.update(structuredClone(state));await f.present();
  }
  assert(moving);assert.equal(state.raid,null);assert.equal(state.events.filter(e=>e.type==='RaidEnded').length,1);
  assert.equal(lifecycle.length,1);assert.equal(lifecycle[0].actorId,'animal-396');
  assert(lifecycle[0].at>=depart.reference.endTime&&lifecycle[0].at<depart.reference.endTime+.051);
  assert.equal(commits.length,5);assert.deepEqual(f.faults,[]);
  const afterExit=f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
  assert.equal(JSON.parse(afterExit.snapshot).raid,null);
  assert.equal(afterExit.presentationJournal?.filter(x=>x.kind==='animalGone').length??0,0);
  await checkLateAnimalPacket(f,depart,f.records.at(-1),retired.filter(r=>r.purpose==='retreat'));
  assert.equal(f.host.inspect().nativeRouteFrame.bindings.some(b=>b.nativeAnimalCrop),false);
  console.log(JSON.stringify({hits,body:1,depart:depart.reference.worldBoundary.ticket,end:depart.reference.endTime,gone:lifecycle}));
 }finally{for(const release of ready)release();await f.close();rig.close();}
});



import {tick} from '../src/simulation/game.js';
import {canAttackCrop,targetFor,nativeCropCohortCurrent,previewRaidStrike,projectAcquiredRaidStrike} from '../src/simulation/raids.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';

test('completed crop honors quota and shields and rejects cancelled or unrelated successor readiness',()=>{
 const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const {s,chunkKeys}=fixture();
const chunks=new Map(),session=createSpatialGameSession(module,s,{loaded:()=>chunks,onData:d=>chunks.set(d.cx+','+d.cz,d)});
try{
 for(const key of chunkKeys){const [x,z]=key.split(',').map(Number);session.core.addChunk(x,z);chunks.set(key,session.core.chunkPayload());}
 const planner=createEventDrivenTaskPlanner(session),restored=planner.resetFromState(s),w=session.core.wasm;
 const nav=createSpatialNavigationMovement(session,s);nav.intentTaskPlanner=planner;
 planner.observeTasks(s);planner.observeWorld(s);
 const animal=s.raid.animals[0],phase=animal.motionPhase,actor=396,body=1,pose=()=>[animal.x,animal.z,animal.motionPhase];
 assert.equal(phase,4.497729763870326);assert.equal(restored.restoredAnimalRoutes,1);
 assert.equal(w.spatial_body_upsert(body,animal.x,animal.z,animal.radius,1,1),1);
 assert(planner.requestNativeAnimalCropRoute(s,animal,body));assert.equal(planner.commitNativeCausalClock().status,'committed');
 const source=planner.nativeAnimalCropState(animal.id),sid=w.nav_intent_session();
 const tuple=()=>{assert.equal(w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));};
 const step=()=>tick(s,.05,nav);
 assert(nativeCropCohortCurrent(s,planner));assert.equal(w.nav_animal_route_proposal_stage(actor,sid,source.requestSequence),1);
 const ready=tuple(),initial=pose();step();assert.deepEqual(pose(),initial);
 assert.equal(w.nav_animal_route_proposal_revalidate(sid,ready[1]),1);const acquired=tuple();
 assert.equal(w.nav_animal_route_proposal_commit_bound(...acquired.slice(0,5),ready[1]),1);
 assert.equal(planner.beginNativeRouteExecution().status,'started');planner.commitNativeCausalClock();
 const handle=planner.intentChanges().at(-1).routeHandle,packet=planner.captureNativeRoutePresentation(handle);
 assert.equal(packet.rows[4],phase);
 let arrival;
 for(let n=0;n<400;n++){step();arrival=planner.nativeAnimalCropState(animal.id);if(arrival.arrived)break;}
 assert(arrival.arrived);
 const terminal=pose();
 const choice=previewRaidStrike(s,animal),assignment=planner.nativeAnimalRouteBinding(handle).assignmentSequence;
 assert.equal(w.nav_animal_strike_proposal_stage(actor,sid,assignment,choice.index,choice.duration),1);
 const prepared=tuple();for(let i=0;i<5;i++){step();assert.deepEqual(pose(),terminal);assert.equal(animal.attackId,null);}
 assert.equal(w.nav_animal_strike_proposal_revalidate(sid,prepared[1]),1);const actual=tuple();
 assert.equal(w.nav_animal_strike_proposal_commit_bound(...actual.slice(0,5),prepared[1],s.sequence),1);
 assert.equal(w.nav_animal_strike_snapshot(actor),1);const h=new Float64Array(w.memory.buffer,w.nav_animal_strike_snapshot_ptr(),24);
 projectAcquiredRaidStrike(s,animal,{actor:h[1],body:h[2],target:h[3],clip:h[7],duration:h[8],targetX:h[9],targetZ:h[10],x:h[11],z:h[12],yaw:h[14],at:h[15],attackId:h[19]});
 for(let n=0;n<120&&animal.status==='attacking';n++)step();
 assert.equal(animal.status,'walking');assert.equal(animal.hitsRemaining,1);
 const before=pose();const previousId=animal.attackId;
 // Exercise true game eligibility on the retained, signed endpoint.
 const limit=s.raid.introCropLimit;
 const crops=s.plants.filter(p=>p.alive),prior=crops.map(p=>p.attackHits);
 s.raid.introCropLimit=s.raid.introCropsDestroyed;
 for(const p of crops)p.attackHits=p.attackHitPoints??2;
 assert(crops.every(p=>!canAttackCrop(s,p)));
 assert.equal(targetFor(s,animal,nav,true),null);
 assert.equal(w.nav_intent_actor(actor),0);
 for(let i=0;i<crops.length;i++){if(prior[i]===undefined)delete crops[i].attackHits;else crops[i].attackHits=prior[i];}
 s.raid.introCropLimit=limit;
 s.spells.push({id:'negative-shield',kind:'shield',x:animal.x,z:animal.z,remaining:10});
 assert.equal(targetFor(s,animal,nav,true),null);assert.equal(w.nav_intent_actor(actor),0);s.spells.pop();
 animal.motionPhase=before[2]+1;assert.equal(planner.nativeFinishedAnimalCrop(s,animal),null);animal.motionPhase=before[2];
 assert.equal(w.nav_animal_plan_finished_crop(actor,animal.x+1,animal.z,animal.radius,1,0,0,0),-2);
 assert.deepEqual(pose(),before);
 assert.deepEqual(planner.nativeFinishedAnimalCrop(s,animal),{body,attackId:661,phase:before[2]});
 step();
 assert.equal(animal.targetId,'plant-337');assert.equal(animal.attackId,previousId);assert.deepEqual(pose(),before);
 const pending=planner.nativeAnimalCropState(animal.id);assert.equal(pending.mode,1);
 assert.equal(w.nav_animal_route_proposal_stage(actor,sid,pending.requestSequence),1);
 const stale=tuple();assert.equal(w.nav_animal_route_proposal_cancel(sid,stale[1]),1);
 assert.notEqual(w.nav_animal_route_proposal_commit_bound(...stale.slice(0,5),stale[1]),1);
 assert.deepEqual(pose(),before);assert.equal(planner.nativeAnimalCropState(animal.id).mode,1);
 assert.equal(w.nav_animal_route_proposal_stage(actor,sid,pending.requestSequence),1);
 const valid=tuple();step();assert.deepEqual(pose(),before);
 assert.equal(w.nav_animal_route_proposal_revalidate(sid,valid[1]),1);const acquiredNext=tuple();
 assert.notEqual(w.nav_animal_route_proposal_commit_bound(...acquiredNext.slice(0,5),stale[1]),1);
 assert.equal(w.nav_animal_route_proposal_commit_bound(...acquiredNext.slice(0,5),valid[1]),1);
 assert.equal(planner.beginNativeRouteExecution().status,'started');planner.commitNativeCausalClock();assert.equal(planner.nativeAnimalCropState(animal.id).body,body);
 const handle2=planner.intentChanges().at(-1).routeHandle;
 for(let n=0;n<400&&!planner.nativeAnimalCropState(animal.id).arrived;n++)step();
 assert(planner.nativeAnimalCropState(animal.id).arrived);
 const second=previewRaidStrike(s,animal),assignment2=planner.nativeAnimalRouteBinding(handle2).assignmentSequence;
 assert.equal(w.nav_animal_strike_proposal_stage(actor,sid,assignment2,second.index,second.duration),1);
 const prep2=tuple();step();assert.equal(w.nav_animal_strike_proposal_revalidate(sid,prep2[1]),1);
 const t2=tuple();assert.equal(w.nav_animal_strike_proposal_commit_bound(...t2.slice(0,5),prep2[1],s.sequence),1);
 assert.equal(w.nav_animal_strike_snapshot(actor),1);const secondRow=new Float64Array(w.memory.buffer,w.nav_animal_strike_snapshot_ptr(),24);
 projectAcquiredRaidStrike(s,animal,{actor:secondRow[1],body:secondRow[2],target:secondRow[3],clip:secondRow[7],duration:secondRow[8],targetX:secondRow[9],targetZ:secondRow[10],x:secondRow[11],z:secondRow[12],yaw:secondRow[14],at:secondRow[15],attackId:secondRow[19]});
 while(animal.status==='attacking')step();
 assert.equal(animal.hitsRemaining,0);assert.equal(w.nav_animal_finished_strike_snapshot(actor),1);

 const originalExit=animal.exit,atExitHold=pose();
 const absent={x:202,z:96},cx=Math.floor((absent.x+24)/48),cz=Math.floor((absent.z+24)/48);
 assert(session.core.selectChunk(cx,cz)<0,'negative requires a missing destination chunk');
 assert.equal(w.nav_intent_plan_retreat(actor,animal.x,animal.z,originalExit.x,originalExit.z),-2);
 assert.equal(w.nav_intent_restore_retreat(actor,animal.x,animal.z,originalExit.x,originalExit.z,1),-2);
 animal.exit=absent;
 assert.equal(planner.requestNativeRetreat(s,animal),'unknown');
 assert.equal(w.nav_animal_plan_finished_retreat(actor,661,absent.x,absent.z),-2);
 step();
 assert(animal.retreatRouteUnknown);assert.equal(w.nav_intent_actor(actor),0);
 const attempts=w.nav_intent_actor_planning_calls(actor);
 for(let i=0;i<4;i++){step();assert.deepEqual(pose(),atExitHold);assert.equal(animal.status,'walking');}
 assert.equal(w.nav_intent_actor_planning_calls(actor),attempts);
 animal.exit=originalExit;
 step();const request=planner.nativeAnimalCropState(animal.id);assert(request.retreat);assert.equal(request.body,body);
 assert.equal(w.nav_animal_route_proposal_stage(actor,sid,request.requestSequence),1);
 const cancelled=tuple();assert.equal(w.nav_animal_route_proposal_cancel(sid,cancelled[1]),1);
 assert.equal(w.nav_animal_route_proposal_stage(actor,sid,request.requestSequence),1);const retained=tuple();
 const oldX=animal.exit.x;animal.exit.x+=1;
 assert.equal(nativeCropCohortCurrent(s,planner),false);animal.exit.x=oldX;
 step();assert.deepEqual(pose(),atExitHold);
 assert.equal(w.nav_animal_route_proposal_revalidate(sid,retained[1]),1);const acquiredExit=tuple();
 assert.notEqual(w.nav_animal_route_proposal_commit_bound(...acquiredExit.slice(0,5),cancelled[1]),1);
 assert.equal(w.nav_animal_route_proposal_commit_bound(...acquiredExit.slice(0,5),retained[1]),1);
 assert.equal(planner.beginNativeRouteExecution().status,'started');planner.commitNativeCausalClock();
 const binding=planner.nativeAnimalRouteBinding(planner.intentChanges().at(-1).routeHandle);
 assert.equal(w.nav_animal_finish_retreat(actor,binding.assignmentSequence),0);
 assert.equal(w.nav_intent_attack_cancel(actor),0);
 assert(s.raid);assert.equal(animal.status,'retreating');
 }finally{session.dispose();}
});

test('an acquired animal route that fails GPU submission publishes no first pose',async()=>{
 const {s,manifest,chunkKeys}=fixture(),ready=[],commits=[];
 const f=await nativeProductionAuthority(s,{qualifyAnimalCrop:true,chunkKeys,getTerrainManifest:()=>manifest,
  onReady:()=>new Promise(resolve=>ready.push(resolve)),onCommit:(_r,data)=>commits.push(data.nativeAnimalCropRouteBinding)});
 try{
  await untilProduction(f,()=>ready.length===1);
  ready.shift()();
  await waitForCropCommitWithoutDraw(()=>commits.length===1);
  const before=f.host.inspect().nativeRouteFrame,submitted=f.gpu.submitted.length;
  f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
  f.gpu.device.queue.submit=()=>{throw Error('first crop submit failed');};
  await f.present();
  assert.equal(f.host.inspect().failed,true);
  assert.equal(f.gpu.submitted.length,submitted);
  assert.deepEqual(f.host.inspect().nativeRouteFrame,before);
  assert(f.errors.some(message=>String(message).includes('first crop submit failed')));
 }finally{for(const release of ready)release();await f.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
import {emit,newGame,observePresentationGameEvents} from '../src/simulation/game.js';
import {createHistoricalEventBoundaryCapture,decodeHistoricalEventBoundaries,historicalEventSemanticsSupported} from '../src/simulation/historical-event-boundaries.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createMainSnapshotEncoder} from '../src/simulation/main-thread-snapshot-transport.js';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
import {createConfirmedHistoricalMotionGroup} from '../src/rendering/confirmed-historical-motion-group.js';
import {createConfirmedTimelinePump} from '../src/rendering/confirmed-timeline-pump.js';
import {syncWebGpuHistoricalBoundary} from '../src/rendering/webgpu-historical-boundary-sync.js';

import {createWebGpuAutoRecovery} from '../src/app/webgpu-auto-recovery.js';
import {isPreparedFrameInvalidation} from '../src/rendering/webgpu-frame-recovery.js';
for(const [mode,name] of [
 ['invalidated','event invalidation reaches automatic recovery after the real stream applies a subboundary'],
 ['expired','an expired event continuation requires a fresh surface after a committed subboundary'],
 ['complete','the historical night transition acknowledges only after the accelerated remainder'],
])test(name,async()=>{
 const expires=mode==='expired',complete=mode==='complete';
 const initial=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString()),worker=initial.workers[0],center=initial.structures.find(item=>item.id===worker.centerId);Object.assign(initial,{raid:null,time:299.98,nightPlan:null,dayPlan:null,initialPreparation:false,workers:[worker],tasks:[]});Object.assign(worker,{x:center.x+4,z:center.z+4,status:'idle',taskId:null,path:null,idleState:{anchorId:'farm-'+center.id,mode:'watch',elapsed:1,rng:123,remaining:10},contractDay:initial.day});for(const crop of initial.plants)crop.alive=false;
 const snapshot=serialize(initial),module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true,captureHistoricalEvents:true,captureHyenaDiagnostics:false}),state=deserialize(snapshot),acks=[],hooks=[],events=[],port={postMessage:m=>acks.push(m),start(){},close(){}},encoder=createMainSnapshotEncoder();let now=0,animalActive=false,workerActive=false;
 const vfx=[],clock=createConfirmedHistoricalClock({initialElapsed:state.elapsed,now:()=>now}),terrain={ready:()=>true,matchesManifest:()=>true,confirm(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain,presentationClock:clock,timeline:{maxPublications:4,maxBytes:50000000,manualBoundaries:true,experimentalHistoricalEvents:true},onHistoricalBoundary:(boundary,changedKeys)=>{assert.equal(state.elapsed,boundary.at);assert.equal(clock.elapsed,boundary.at);hooks.push(...boundary.events.map(e=>e.type));syncWebGpuHistoricalBoundary({boundary,changedKeys,state,clock,lighting(){},agriculture:{sync:events=>vfx.push(events.map(event=>event.type))}});},onConfirmed:message=>assert.deepEqual(message.events,[])}),stop=observePresentationGameEvents(state,event=>events.push([event.type,state.elapsed,clock.elapsed]));
 const roster=(ids,isAnimal)=>({historicalActorIds:()=>ids,prepareHistoricalMotion:()=>({ok:true}),startHistoricalMotion:()=>{if(isAnimal)animalActive=true;else workerActive=true;return true;},historicalMotionCurrent:()=>isAnimal?animalActive:workerActive,finishHistoricalMotion:()=>{if(isAnimal)animalActive=false;else workerActive=false;},cancelHistoricalMotion(){},abortHistoricalMotion(){}}),animals=roster([],true),workers=roster([worker.id],false),supports=new Map(),group=createConfirmedHistoricalMotionGroup({animals,workers,getSupport:preview=>{if(expires&&hooks.length)return null;const key=`${preview.sequence}:${preview.start}:${preview.end}`;if(!supports.has(key))supports.set(key,{sequence:preview.sequence,start:preview.start,end:preview.end,actors:[],valid:()=>true});return supports.get(key);},inputPolicy:'ordered-boundary'}),pump=createConfirmedTimelinePump({stream,historicalPlayback:{...group,clock,now:()=>now}});
 try{
  const message={...authority.execute({kind:'advance',sequence:1,seconds:.1,nightFastForward:true,captureClockSegments:true}),session:'s'};
  assert.deepEqual(message.events.map(event=>event.type),['NightStarted']);
  assert.deepEqual(message.clockSegments.segments.map(segment=>segment.rate),[1,5]);
  assert.ok(message.worldMotionTrace.spatialEvidence&&message.worldMotionTrace.separationEvidence);
  const publicationAcks=()=>acks.filter(entry=>entry.kind==='publicationAck');
  port.onmessage({data:encoder.encode({kind:'publication',session:'s',publication:message})});
  assert.equal(pump.advance(),0);
  assert.equal(stream.status().sequence,0);
  assert.deepEqual(events,[]);
  now=10;
  assert.equal(pump.suspendHistorical('input'),true);
  now=500;
  assert.equal(pump.advance(),0);
  assert.deepEqual(events,[]);
  assert.equal(pump.resumeHistorical(),true);
  now=511;
  assert.equal(pump.advance(),0);
  assert.deepEqual(hooks,['NightStarted']);
  assert.deepEqual(vfx,[['NightStarted'],[]]);
  assert.deepEqual(events,[['NightStarted',message.events[0].simulationTime,message.events[0].simulationTime]]);
  assert.equal(stream.status().sequence,0);
  assert.deepEqual(publicationAcks(),[]);
  if(complete){
   now=550;
   assert.equal(pump.advance(),0);
   assert.deepEqual(publicationAcks(),[]);
   now=601;
   assert.equal(pump.advance(),1);
   assert.equal(stream.status().sequence,message.sequence);
   assert.equal(clock.elapsed,message.elapsed);
   assert.equal(events.length,1);
   assert.deepEqual(publicationAcks().map(ack=>ack.sequence),[message.sequence]);
   return;
  }
  if(expires){
   assert.equal(pump.status().historicalHold,'reconciliation');
   now=5512;
  }else{
   workerActive=false;
   now=601;
  }
  let failure;
  try{pump.advance();}catch(error){failure=error;}
  assert.equal(failure?.code,expires?'historical-event-continuation-lost':'historical-playback-invalidated');
  assert.equal(isPreparedFrameInvalidation(failure),!expires);
  assert.equal(events.length,1);
  assert.deepEqual(publicationAcks(),[]);
  const calls=[],auto=createWebGpuAutoRecovery({historicalRecovery:true,isCurrent:()=>true,markLost:async()=>calls.push('lost'),recover:async()=>calls.push('recover')});
  try{
   assert.equal(auto.trigger(failure),true);
   await new Promise(resolve=>setImmediate(resolve));
   assert.deepEqual(calls,['lost','recover']);
  }finally{auto.dispose();}
 }finally{pump.dispose();stop();stream.dispose();clock.dispose();encoder.dispose();authority.dispose();}
});

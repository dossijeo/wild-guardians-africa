import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Group,PerspectiveCamera} from 'three';
import {nativeFrameReadiness} from '../src/rendering/webgpu-frame-recovery.js';
const surfaceSource=readFileSync(new URL('../src/rendering/webgpu-world-surface.js',import.meta.url),'utf8');
import * as stops from '../src/simulation/terrain-stop-reservation.js';
import * as boundaries from '../src/world/native-world-boundary.js';
import * as shieldCodec from '../src/world/native-shield-world.js';
import {copyNativeGateMotionResources} from '../src/world/native-gate-motion-resources.js';
import {assertNativeTerrainPresentationSupport} from '../src/rendering/native-terrain-presentation-support.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';
import {createWebGpuReplacementSlot} from '../src/rendering/webgpu-replacement-slot.js';
import {spatialStructureBarriers} from '../src/world/wild-engine/spatial-wall-bridge.js';
import * as barrierCodec from '../src/world/native-barrier-addition.js';
import {nativeFarmArrivalStopGraphicsFixture as fixture} from './helpers/native-farm-arrival-stop-graphics.js';
import {createWebGpuAgricultureVfx} from '../src/rendering/webgpu-agriculture-vfx.js';

// Execute the actual nested Surface entry and terrain preparation functions.
// Assets, native source, roster and batch coordinator are real; GPU submission,
// compilation and publication transport are doubles. This is not GPU evidence.
function surface(f,{barrierTemplate,prepareNativeWallAdditions,shield=false}={}){
 const source=surfaceSource;
 const span=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert(start>=0&&end>start);return source.slice(start,end);};
 const code=span('  async function prepareNativeTerrainDependents','  const nativeFrameState=')+span('  function acceptPreparedNativeTerrain','  if(state&&pipelineAdmission)')+span('  async function prepareNativeShieldGeometry','  function prepareNativeFarmArrivalResources');
 let sequence=10,holding=false,present,prepared=0,captures=0,compiled=0;const errors=[];
 const presented=new Promise(resolve=>{present=resolve;});
 const admission={...f.admission,prepareManyAndPublish(){throw Error('Unexpected eager publication');},prepareTicket:async()=>{compiled++;return {valid:()=>true};},completePreparation:async()=>{}};
 const coordinator=createChunkPublicationCoordinator({admission,onError:e=>errors.push(e)});
 const camera=new PerspectiveCamera(),agricultureVfx=shield&&createWebGpuAgricultureVfx({scene:f.scene,state:f.state,residency:f.residency,pipelineAdmission:admission,includeShield:true,onError:error=>errors.push(error)});
 const injected={...stops,...boundaries,...barrierCodec,...shieldCodec,spatialStructureBarriers,copyNativeGateMotionResources,assertNativeTerrainPresentationSupport,camera,agricultureVfx,
  state:f.state,roster:null,workers:f.roster,scene:f.scene,residency:f.residency,terrainSupport:f.terrain,
  settlements:{prepareVillageTerrain:()=>[],prepareNativeGateMotors:()=>[],prepareNativeWallAdditions},crops:null,crates:null,
  chunkCoordinator:coordinator,pipelineAdmission:admission,renderer:{shadowMap:{}},sun:{shadow:{}},
  remoteGpu:{whenFrameSettled:async()=>{},beginFrame(){},cancelFrame(){},async prepareNativeWorldFrame(meta){prepared++;if(shield){assert.deepEqual(meta.coverage,{start:meta.boundary.effectiveTime,end:50});}else if(barrierTemplate){assert.deepEqual(meta.nativeBarrierAdditionTemplate,barrierTemplate);assert.deepEqual(meta.coverage,{start:barrierTemplate.worldBoundary.effectiveTime,end:50});}else assert.deepEqual(meta.nativeFarmArrivalStopTemplate,f.preparedStop.proposal.nativeStop);return {preparedWorldBoundary:meta.boundary,valid:()=>true,abort:()=>true,commit:(boundary,proof)=>{assert(boundaries.sameNativeWorldBoundary(boundary,shield?meta.boundary:proof.reference.worldBoundary));return true;},presented};}},
  remoteClockLease:()=>({elapsed:20,safeUntil:50}),remoteFrameMetadata:(boundary,coverage)=>({boundary,coverage}),renderScene:()=>{captures++;return true;},
  stream:{status:()=>({sequence,holding,closed:false}),holdPresentation(){assert(!holding);holding=true;},releasePresentation(){assert(holding);holding=false;}},
  terrain:{status:()=>({}),admittedBoundary:seq=>({version:1,sequence:seq,epoch:'test',canonicalPropsUnmasked:true,empty:true,changes:[]})},
  onPresentationReady(){},onSelectableChange(){},onError:e=>errors.push(e),
  prepareNativeResources(){throw Error('Motor entry reached');}
 };
 const build=new Function(...Object.keys(injected),`let closed=false,nativeGateProposal=null,nativeRoutePreparations=0,nativeRouteResourceRevision=0,nativeRouteRejected=false,nativePickPresentation=null,nativePickFrame=null,preparedNativeWorldBoundary=null;const temporal=true,recoveringPublication=false;${code}\nreturn {prepareNativeShieldGeometry,prepareNativeGateResources,prepareNativeBarrierAdditionResources,acceptPreparedNativeTerrain,wakeNativePublications,status:()=>({proposal:nativeGateProposal?.descriptor,owner:nativeGateProposal?.descriptor.phase,boundary:preparedNativeWorldBoundary,preparing:nativeRoutePreparations}),close(){closed=true;nativeGateProposal?.cancel();wakeNativePublications(Error('closed'));}};`);
 const api=build(...Object.values(injected));return {...api,errors,agricultureVfx,compiled:()=>compiled,stats:()=>({prepared,captures,holding}),present,
  publish(message){sequence=message.sequence;api.acceptPreparedNativeTerrain(message);api.wakeNativePublications();},
  close(){api.close();coordinator.dispose();agricultureVfx?.dispose?.();}};
}
const flush=()=>new Promise(r=>setImmediate(r));
const dataFor=proof=>{const worldBoundary=proof.reference.worldBoundary;return {worldBoundary,nativeFarmArrivalStopBinding:proof,resources:{version:1,kind:24,nativeSession:worldBoundary.nativeSession,ticket:worldBoundary.ticket,effectiveTime:worldBoundary.effectiveTime,chunks:[],removed:[]}};};
const publication=data=>({sequence:11,elapsed:data.worldBoundary.effectiveTime,nativeWorldResources:[{version:1,kind:24,worldBoundary:data.worldBoundary,chunks:[],removed:[]}]});

test('Surface direct Farm stop prepares original actor and adopts only its acquired empty boundary',async()=>{
 const f=await fixture({peer:false}),s=surface(f);try{
  const actor=f.roster.get(f.actor),owned=f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion');
  const p=await s.prepareNativeGateResources(f.preparedStop.proposal,{minSequence:10});assert(p.valid());assert.deepEqual(s.stats(),{prepared:1,captures:1,holding:true});assert.equal(s.status().boundary,null);
  f.advance(.1);f.sync();assert(p.valid());const data=dataFor(f.commitStop());assert(p.commit(data));f.projectHeld();f.submit();
  assert.equal(s.status().owner,'adopting');assert.notEqual(data.worldBoundary.ticket,f.preparedStop.proposal.worldBoundary.ticket,'test requires a retimed ticket');assert.equal(nativeFrameReadiness({prepared:s.status().boundary,required:data.worldBoundary,proposal:s.status().proposal}),'waiting','effective stop is pending adoption, not an unknown resource delta');assert.equal(s.status().boundary,null);
  const wrong=publication(data);wrong.nativeWorldResources[0].worldBoundary={...data.worldBoundary,ticket:data.worldBoundary.ticket+1};assert.throws(()=>s.acceptPreparedNativeTerrain(wrong),/prepared proposal/);
  const geometry=publication(data);geometry.nativeWorldResources[0].chunks=[{cx:0,cz:0}];assert.throws(()=>s.acceptPreparedNativeTerrain(geometry),/body-only/);
  s.present();await flush();assert.equal(s.stats().holding,false);s.publish(publication(data));await flush();
  assert.equal(s.status().owner,undefined);assert.equal(s.status().preparing,0);assert.deepEqual(s.status().boundary,data.worldBoundary);assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion'),owned);assert.deepEqual([...s.errors,...f.errors],[]);
 }finally{s.close();f.close();}
});

test('Surface direct stop rejects missing projection and foreign family, and cancellation preserves moving owner',async()=>{
 const f=await fixture({peer:false}),s=surface(f);try{
  const actor=f.roster.get(f.actor),proposal=f.preparedStop.proposal;
  await assert.rejects(async()=>s.prepareNativeGateResources({...proposal,kind:25}),/family/);
  await assert.rejects(async()=>s.prepareNativeGateResources({...proposal,chunks:[{cx:0,cz:0}]}));
  assert.equal(s.stats().prepared,0);const controller=new AbortController(),p=await s.prepareNativeGateResources(proposal,{signal:controller.signal,minSequence:10});controller.abort();assert.equal(p.valid(),false);assert.equal(s.stats().holding,false);assert.equal(s.status().owner,undefined);assert.equal(s.status().preparing,0);assert.equal(f.roster.get(f.actor),actor);assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');
  const second=await s.prepareNativeGateResources(proposal,{minSequence:10}),data=dataFor(f.commitStop()),bad={...data,nativeFarmArrivalStopBinding:{...data.nativeFarmArrivalStopBinding}};delete bad.nativeFarmArrivalStopBinding.projection;assert.throws(()=>second.commit(bad));assert.throws(()=>second.commit({...data,nativeIdleStrollStopBinding:data.nativeFarmArrivalStopBinding}),/mixes/);second.abort();assert.equal(s.stats().holding,false);assert.deepEqual([...s.errors,...f.errors],[]);
 }finally{s.close();f.close();}
});

test('Surface solid additions hold the first wall slot and publish only its acquired native receipt',async()=>{
 const f=await fixture({peer:false}),wall={id:'wall-test',kind:'wall',material:'zarzas',gate:false,x:2,z:2,yaw:0,baseScaleX:1,hp:40,maxHp:40,status:'intact'};
 const [shape]=spatialStructureBarriers(wall),addition={entityId:wall.id,passMask:0,...Object.fromEntries(['x','z','halfX','halfZ','yaw'].map(key=>[key,Math.fround(shape[key])]))};
 const boundary=f.preparedStop.proposal.worldBoundary,template=barrierCodec.copyNativeBarrierAdditionReference({kind:'native-barrier-addition-reference',version:1,worldBoundary:boundary,sourceControlSequence:0,additions:[addition]});
 const proposal={kind:'native-barrier-addition-proposal',version:1,worldBoundary:boundary,nativeBarrierAddition:template,authorizedAutonomy:false,authorizedConsequences:false};
 const object=new Group(),slot=createWebGpuReplacementSlot({pipelineAdmission:{prepare:async()=>{}},release:()=>{}});f.scene.add(slot.group);
 let entered,load;
 const waiting=new Promise(resolve=>{entered=resolve;}),assets=new Promise(resolve=>{load=resolve;});
 const s=surface(f,{barrierTemplate:template,async prepareNativeWallAdditions(entities){assert.deepEqual(entities,[wall]);entered();await assets;return [slot.prepareParticipant('wall',()=>object,{initial:true})];}});
 try{
  const actor=f.roster.get(f.actor),options={minSequence:10,nativeBarrierWallEntities:[wall]};
  await assert.rejects(s.prepareNativeBarrierAdditionResources(proposal,{...options,nativeBarrierWallEntities:[{...wall,x:3}]}),/differ/);
  const pending=s.prepareNativeBarrierAdditionResources(proposal,options);
  await waiting;assert.equal(s.stats().prepared,0);assert.equal(slot.active,null);assert.equal(f.roster.get(f.actor),actor);
  load();
  const handle=await pending;assert(handle.valid());assert.equal(slot.active,null);assert.equal(object.visible,false);
  const worldBoundary={...boundary,ticket:boundary.ticket+1,effectiveTime:boundary.effectiveTime+.1};
  const binding={kind:'native-barrier-addition-attestation',version:1,reference:{...template,worldBoundary},preparedReference:template,nativeIds:[75]};
  const resources={version:1,kind:2,phase:'committed',worldBoundary,nativeSession:worldBoundary.nativeSession,ticket:worldBoundary.ticket,effectiveTime:worldBoundary.effectiveTime,chunks:[],removed:[],nativeBarrierAdditionBinding:binding};
  assert(handle.commit({worldBoundary,resources,nativeBarrierAdditionBinding:binding}));assert.equal(slot.active,object);
  const descriptor={version:1,kind:2,worldBoundary,chunks:[],removed:[],nativeBarrierAdditionBinding:binding};
  const message={sequence:11,elapsed:worldBoundary.effectiveTime,nativeWorldResources:[descriptor]};
  assert.throws(()=>s.acceptPreparedNativeTerrain({...message,nativeWorldResources:[{...descriptor,nativeBarrierAdditionBinding:{...binding,nativeIds:[76]}}]}),/prepared proposal/);
  s.present();await flush();s.publish(message);await flush();
  assert.equal(s.status().owner,undefined);assert.deepEqual(s.status().boundary,worldBoundary);assert.equal(f.roster.get(f.actor),actor);assert.deepEqual([...s.errors,...f.errors],[]);
 }finally{s.close();slot.dispose();f.close();}
});

for(const warm of [false,true])test('Surface publishes the Shield with its exact spell and polygon '+(warm?'after private geometry preparation':'at fixed time'),async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap;
 const catalogue=JSON.parse(readFileSync('public/content/vfx.json'));
 globalThis.fetch=async()=>({ok:true,json:async()=>catalogue,blob:async()=>new Blob(['x'])});
 globalThis.createImageBitmap=async()=>({width:4096,height:2048,close(){}});
 const f=await fixture({peer:false}),s=surface(f,{shield:true});
 try{
  const actor=f.roster.get(f.actor),worldBoundary=f.preparedStop.proposal.worldBoundary;
  const spell={id:'spell-88',kind:'shield',x:f.worker.x,z:f.worker.z,radius:1.95,remaining:20};
  const controller=new AbortController();
  const shieldGeometry=warm?await s.prepareNativeShieldGeometry({spell,polygonId:null},{minSequence:10,signal:controller.signal}):null;
  if(warm){
   assert.equal(s.stats().prepared,0);assert.equal(s.stats().holding,false);assert.equal(s.agricultureVfx.status().effects,0);
   assert.equal(shieldGeometry.part.object.visible,false);assert(shieldGeometry.batch.valid());
   f.advance(.1);f.sync();
  }
  const compiled=s.compiled();
  const resources={version:1,kind:3,worldBoundary,nativeSession:worldBoundary.nativeSession,ticket:worldBoundary.ticket,effectiveTime:worldBoundary.effectiveTime,chunks:[],removed:[]};
  const proposal={...resources,phase:'proposal',retainsNativeAssignments:true,nativeShield:{spell,polygonId:null},
   routeEffects:{rows:new Float64Array()},gateEffects:{rows:new Float64Array()}};
  await assert.rejects(s.prepareNativeGateResources({...proposal,retainsNativeAssignments:false}),/unprepared terrain or routes/);
  if(warm)await assert.rejects(s.prepareNativeGateResources({...proposal,nativeShield:{spell:{...spell,x:spell.x+1},polygonId:null}},{minSequence:10,shieldGeometry}),/differs from the FIFO proposal/);
  const handle=await s.prepareNativeGateResources(proposal,{minSequence:10,shieldGeometry});
  if(warm)assert.equal(s.compiled(),compiled,'FIFO capture must use the already admitted dome');
  assert(handle.valid());assert.equal(s.agricultureVfx.status().effects,0);assert.equal(s.stats().holding,true);
  const nativeShield={spell,polygonId:157},committed={...resources,phase:'committed',nativeShield};
  assert.throws(()=>handle.commit({worldBoundary,resources:{...committed,nativeShield:{spell:{...spell,x:spell.x+1},polygonId:157}}}),/prepared spell/);
  assert.equal(s.agricultureVfx.status().effects,0);
  assert(handle.commit({worldBoundary,resources:committed}));assert.equal(s.agricultureVfx.status().effects,1);
  const record={version:1,kind:3,worldBoundary,chunks:[],removed:[],nativeShield};
  const message={sequence:11,elapsed:worldBoundary.effectiveTime,nativeWorldResources:[record]};
  assert.throws(()=>s.acceptPreparedNativeTerrain(message),/prepared proposal/);
  f.state.spells=[spell];
  assert.throws(()=>s.acceptPreparedNativeTerrain({...message,nativeWorldResources:[{...record,nativeShield:{spell,polygonId:158}}]}),/prepared proposal/);
  s.present();await flush();s.publish(message);await flush();
  assert.equal(s.stats().holding,false);assert.deepEqual(s.status().boundary,worldBoundary);
  assert.equal(f.roster.get(f.actor),actor);assert.deepEqual([...s.errors,...f.errors],[]);
 }finally{s.close();f.close();globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});

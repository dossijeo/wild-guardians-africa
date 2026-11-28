import {inflateRawSync} from 'node:zlib';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Matrix4,DoubleSide,Scene} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {uniform} from 'three/tsl';
import {gateMeshPrototype} from '../tests/helpers/gate-mesh-source.js';
import {createWebGpuAdmittedWall} from '../src/rendering/webgpu-wall-admission.js';
import {createNativeGateGpuClock} from '../src/rendering/native-gate-gpu-clock.js';
import {nativeFarmArrivalStopCodec} from '../src/world/native-worker-route-stop-codec.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';
const facts=JSON.parse(readFileSync(new URL('./fixtures/native-farm-stop-gate-retention.json',import.meta.url),'utf8'));
facts.effects.routeEffects.rows=Float64Array.from(facts.effects.routeEffects.rows);
facts.effects.gateEffects.rows=Float64Array.from(facts.effects.gateEffects.rows);
facts.packet.gates[0].rows=Float64Array.from(facts.packet.gates[0].rows);
const hash=a=>createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const decode=(value,Type)=>{const bytes=inflateRawSync(Buffer.from(value,'base64'));return new Type(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));};
const gate=facts.packet.gates[0];gate.positions=decode(gate.positionsDeflate,Float32Array);gate.leafFlags=decode(gate.leafFlagsDeflate,Uint8Array);
assert.equal(hash(gate.positions),gate.positionSha256);assert.equal(hash(gate.leafFlags),gate.leafSha256);
const turn=()=>new Promise(resolve=>setImmediate(resolve));
// Replays Sol's typed ordinary Stop24 evidence against real wall, gate clock,
// binding and replacement slot. Admission and final receipt delivery are doubles;
// this does not certify a GPU draw, native commit or presentation cadence.
async function fixture({routeClock=false}={}){
 const original=facts.packet.gates[0],gate={...original,nativeRoute:undefined,worldBoundary:facts.farmSource.worldBoundary};
 const entity={id:original.entityId,kind:'wall',gate:true,material:'zarzas',hp:60,maxHp:60,status:'intact',gateOpen:0};
 const prototype=gateMeshPrototype('zarzas');prototype.material.dispose();prototype.material=new MeshStandardNodeMaterial({side:DoubleSide});
 const retired=[],errors=[];let preparations=0;
 const admission={prepare:async()=>{preparations++;},deferRelease:(_,release)=>retired.push(release)};
 const view=createWebGpuAdmittedWall({prototypes:{zarzas_puerta:prototype},entity,elapsed:gate.startTime,pipelineAdmission:admission,onError:error=>errors.push(error)});
 await turn();assert.equal(view.upToDate,true);assert.deepEqual(errors,[]);
 const wall=view.group.children[0];new Matrix4().fromArray(gate.rootMatrix).decompose(view.group.position,view.group.quaternion,view.group.scale);view.group.scale.divide(wall.scale);
 const motion=routeClock?{timeNode:uniform(0),status:()=>({installed:{nativeRoute:original.nativeRoute,start:{at:original.startTime},end:{at:original.endTime}}})}:createNativeGateGpuClock(gate);
 const prepared=view.prepareNativeGate({presentation:routeClock?original:gate,motion,getPickTime:()=>facts.boundary.effectiveTime,signal:new AbortController().signal});prepared.activate();prepared.finalize();
 const controller=new AbortController(),args={presentation:original,template:facts.template,stopEffects:facts.effects,boundary:facts.boundary,signal:controller.signal};
 const proof=nativeFarmArrivalStopCodec.copyAttestation({kind:'native-farm-arrival-stop-attestation',version:1,projectionVersion:1,reference:facts.template,preparedReference:facts.template,projection:{version:1,routeEffects:facts.effects.routeEffects,gateEffects:facts.effects.gateEffects}});
 return {view,wall,motion,args,proof,controller,get preparations(){return preparations;},retired,close(){view.dispose();for(const release of retired.splice(0))release();prototype.geometry.dispose();prototype.material.dispose();}};
}
test('ordinary historical gate + empty native Stop24 journal retain the exact independent owner through the transaction',async()=>{
 const f=await fixture();try{
  assert.equal(facts.effects.gateEffects.rows.length,0);assert.equal(facts.template.gates.length,0);assert.equal(facts.packet.gates.length,1);
  const binding=f.wall.nativeGpuGate,mesh=f.wall.parts[0].mesh,geometry=mesh.geometry,material=mesh.material,clock=f.motion.clockNode,preparations=f.preparations;
  const part=f.view.prepareNativeGateRetention(f.args);assert(part.valid());
  part.capturePresentation(()=>assert.equal(mesh.material,material));
  part.acceptNativeStopBinding(f.proof);part.activate();part.attach();part.finalize().retire();
  assert.equal(f.wall.nativeGpuGate,binding);assert(binding.current());assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);assert.equal(f.motion.clockNode,clock);assert.equal(f.preparations,preparations);assert.equal(f.retired.length,0);
  const next=f.view.prepareNativeGateRetention(f.args);next.cancel();assert(binding.current());assert.equal(f.retired.length,0);
 }finally{f.close();}
});
test('a journal that changes the motor cannot enter retention, nor become a final unchanged receipt',async()=>{
 const f=await fixture();try{
  const original=f.args.presentation,template={...facts.template,gates:[{gateId:original.gateId,mechanism:original.mechanism}]},effects={...facts.effects,gateEffects:{version:1,rowWidth:3,rows:Float64Array.of(original.gateId,original.mechanism,.5)}};
  assert.throws(()=>f.view.prepareNativeGateRetention({...f.args,template,stopEffects:effects}),/unchanged Farm stop motor journal/);
  const part=f.view.prepareNativeGateRetention(f.args);
  assert.throws(()=>part.acceptNativeStopBinding({...f.proof,reference:template,projection:{version:1,routeEffects:facts.effects.routeEffects,gateEffects:effects.gateEffects}}));
  part.activate();part.attach();assert.throws(()=>part.finalize(),/final stop receipt/);part.cancel();assert(f.wall.nativeGpuGate.current());
 }finally{f.close();}
});
test('cancel and abort release only the participation, never the live material or clock',async()=>{
 const f=await fixture();try{
  const binding=f.wall.nativeGpuGate;let disposed=0;binding.material.addEventListener('dispose',()=>disposed++);
  const part=f.view.prepareNativeGateRetention(f.args);part.activate();part.attach();part.rollback();part.cancel();assert.equal(part.valid(),false);assert.equal(disposed,0);assert(binding.current());
  const next=f.view.prepareNativeGateRetention(f.args);f.controller.abort();assert.equal(next.valid(),false);assert.throws(()=>next.activate(),/stale/);next.cancel();assert.equal(disposed,0);assert.equal(f.retired.length,0);
 }finally{f.close();}
});
test('a historical actor clock is rejected even when its curve and geometry are identical',async()=>{
 const f=await fixture({routeClock:true});try{assert.throws(()=>f.view.prepareNativeGateRetention(f.args),/independent resident motor/);}finally{f.close();}
});
test('foreign geometry, mechanism, epoch and obsolete boundaries are rejected before capture',async()=>{
 const f=await fixture();try{
  const gate=f.args.presentation,wrongGeometry={...gate,positions:gate.positions.slice()};wrongGeometry.positions[0]+=.01;
  for(const presentation of [wrongGeometry,{...gate,mechanism:gate.mechanism+1},{...gate,positions:Array.from(gate.positions)},{...gate,hinge:null},{...gate,leafFlags:null}])assert.throws(()=>f.view.prepareNativeGateRetention({...f.args,presentation}),/independent resident motor/);
  const binding=f.wall.nativeGpuGate;
  for(const boundary of [{...facts.boundary,authorityEpoch:'foreign'},facts.farmSource.worldBoundary])assert.throws(()=>binding.captureRetention(gate,boundary),/independent resident motor/);
  assert(binding.current());
 }finally{f.close();}
});
test('a captured owner changing placement or material becomes stale, and no final receipt is optional',async()=>{
 const f=await fixture();try{
  const part=f.view.prepareNativeGateRetention(f.args);f.view.group.position.x+=1;assert.equal(part.valid(),false);assert.throws(()=>part.capturePresentation(()=>{}),/stale/);f.view.group.position.x-=1;
  assert(part.valid());part.activate();part.attach();assert.throws(()=>part.finalize(),/final stop receipt/);part.cancel();
  const next=f.view.prepareNativeGateRetention(f.args),mesh=f.wall.parts[0].mesh,material=mesh.material;mesh.material=new MeshStandardNodeMaterial();assert.equal(next.valid(),false);mesh.material.dispose();mesh.material=material;next.cancel();assert(f.wall.nativeGpuGate.current());
 }finally{f.close();}
});
test('the existing chunk transaction captures and commits retention, and rejects a missing final receipt',async()=>{
 const f=await fixture(),scene=new Scene(),errors=[];scene.add(f.view.group);
 const coordinator=createChunkPublicationCoordinator({admission:{prepareManyAndPublish:async()=>{},prepareTicket:async()=>({valid:()=>true,validAfterAttach:()=>true})},onError:e=>errors.push(e)});
 try{
  const binding=f.wall.nativeGpuGate,part=f.view.prepareNativeGateRetention(f.args),batch=await coordinator.prepareBatch([],{scene,signal:f.controller.signal,dependents:[part]});
  assert(batch.valid());batch.capturePresentation(()=>assert(binding.current()));assert.throws(()=>batch.commit(),/final stop receipt/);assert(binding.current());
  const next=f.view.prepareNativeGateRetention(f.args),accepted=await coordinator.prepareBatch([],{scene,signal:f.controller.signal,dependents:[next]});next.acceptNativeStopBinding(f.proof);assert(accepted.commit());assert.equal(f.wall.nativeGpuGate,binding);assert.deepEqual(errors,[]);assert.equal(f.retired.length,0);
 }finally{coordinator.dispose();f.close();}
});

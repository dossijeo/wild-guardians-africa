import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {inflateRawSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {DoubleSide,Matrix4} from 'three';import {MeshStandardNodeMaterial} from 'three/webgpu';
import {gateMeshPrototype} from '../tests/helpers/gate-mesh-source.js';
import {nativeGateCrossingFixture} from '../tests/helpers/native-gate-crossings.js';
import {createWebGpuAdmittedWall} from '../src/rendering/webgpu-wall-admission.js';
import {createNativeGateGpuClock} from '../src/rendering/native-gate-gpu-clock.js';
import {createSpatialIntentBridge} from '../src/world/wild-engine/spatial-intent-bridge.js';
const configs=[
 {name:'settlement',capture:'carry',sha:'027d01682c58586d0fb5dc962514e4b37d91f552320f372f11e63abf174dc753',key:'nativeSettlement',source:'sourceCarry',proof:'nativeTaskSettlementBinding',kind:'native-task-settlement-attestation',counter:'settlementSequence',version:'nav_task_settlement_proposal_version',prepare:'prepareNativeTaskSettlementProposal'},
 {name:'home',capture:'home',sha:'6e1e81830d0ece64d726ede5e7eb4a10ad71196ba0d5008193abed9f12063609',key:'nativeHomeArrival',source:'sourceHome',proof:'nativeHomeArrivalBinding',kind:'native-home-arrival-attestation',counter:'retiredSequence',version:'nav_home_arrival_proposal_version',prepare:'prepareNativeHomeArrivalProposal'}
];
const turn=()=>new Promise(r=>setImmediate(r));
const {captures,shapes}=JSON.parse(readFileSync(new URL('./fixtures/native-terminal-gate-retention.json',import.meta.url),'utf8'));
const decode=(value,Type)=>{const b=inflateRawSync(Buffer.from(value,'base64'));return new Type(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
const hash=a=>createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
function capture(config){const f=structuredClone(captures[config.capture]);assert.equal(f.sourceSha256,config.sha);for(const g of [f.records[0].resources.gates[0],f.commits[0].data.resources.presentation.gates[0]]){const shape=shapes[g.shapeKey];g.positions=decode(shape.positionsDeflate,Float32Array);g.leafFlags=decode(shape.leafFlagsDeflate,Uint8Array);assert.equal(hash(g.positions)+':'+hash(g.leafFlags),g.shapeKey);g.rows=Float64Array.from(g.rows);}return f;}

// Actual captured terminal/source packets and authored gate. Renderer admission
// and receipt delivery remain doubles, not native-v2 or hardware acceptance.
async function fixture(config){
 const facts=capture(config),resources=facts.records.at(-1).resources,gate=facts.records.at(-2).resources.gates[0],reference=resources[config.key],original=facts.commits.at(-1).data.resources.presentation.gates[0];
 const prototype=gateMeshPrototype('zarzas');prototype.material.dispose();prototype.material=new MeshStandardNodeMaterial({side:DoubleSide});const retired=[],errors=[];
 const view=createWebGpuAdmittedWall({prototypes:{zarzas_puerta:prototype},entity:facts.gate,elapsed:gate.startTime,pipelineAdmission:{prepare:async()=>{},deferRelease:(_,fn)=>retired.push(fn)},onError:e=>errors.push(e)});await turn();assert(view.upToDate);assert.deepEqual(errors,[]);
 const wall=view.group.children[0];new Matrix4().fromArray(gate.rootMatrix).decompose(view.group.position,view.group.quaternion,view.group.scale);view.group.scale.divide(wall.scale);
 const motion=createNativeGateGpuClock(gate),signal=new AbortController().signal,p=view.prepareNativeGate({presentation:gate,motion,getPickTime:()=>reference.worldBoundary.effectiveTime,signal});p.activate();p.finalize();
 const args={presentation:original,resources,signal},proof=(prepared=reference,actual=prepared)=>({worldBoundary:actual.worldBoundary,[config.proof]:{kind:config.kind,version:1,projectionVersion:1,[config.counter]:actual.sourceControlSequence+1,reference:actual,preparedReference:prepared}});
 return {view,wall,motion,args,reference,retired,proof,close(){view.dispose();for(const fn of retired.splice(0))fn();prototype.geometry.dispose();prototype.material.dispose();}};
}
for(const config of configs){
 test(`${config.name}: captured historical crossing retains the independent owner through terminal publication`,async()=>{
  const f=await fixture(config);try{const binding=f.wall.nativeGpuGate,geometry=binding.mesh.geometry,material=binding.material,clock=f.motion.clockNode,p=f.view.prepareNativeTerminalGateRetention(f.args);
   assert(p.valid());assert.deepEqual(p.requests,[]);p.activate();p.validateCommit(f.proof());p.finalize(f.proof());assert.equal(f.wall.nativeGpuGate,binding);assert(binding.current());assert.equal(binding.mesh.geometry,geometry);assert.equal(binding.material,material);assert.equal(f.motion.clockNode,clock);assert.equal(f.retired.length,0);
  }finally{f.close();}
 });
 test(`${config.name}: refresh keeps one gate owner; wrong receipt and historical gate list are rejected`,async()=>{
  const f=await fixture(config);try{const p=f.view.prepareNativeTerminalGateRetention(f.args);p.activate();p.rollback();const next=structuredClone(f.args.resources);next.worldBoundary.ticket++;next.worldBoundary.effectiveTime+=.5;next.ticket.ticket++;next[config.key].worldBoundary={...next.worldBoundary};
   const positions=f.args.presentation.positions;Object.defineProperty(f.args.presentation,'positions',{configurable:true,get(){throw Error('Retarget rescanned retained vertices');}});
   assert(p.retarget(next));Object.defineProperty(f.args.presentation,'positions',{configurable:true,writable:true,value:positions});p.activate();assert.throws(()=>p.validateCommit(f.proof()),/final source/);const proof=f.proof(next[config.key]);p.finalize(proof);assert.equal(f.retired.length,0);
   const foreign={...f.args.presentation,gateId:f.args.presentation.gateId+1};assert.throws(()=>f.view.prepareNativeTerminalGateRetention({...f.args,presentation:foreign}),/historical gate/);
  }finally{f.close();}
 });
 test(`${config.name}: owner revocation between READY and commit rejects without disposing a different live owner`,async()=>{
  const f=await fixture(config),other=await fixture(config);try{const p=f.view.prepareNativeTerminalGateRetention(f.args),binding=f.wall.nativeGpuGate;p.activate();assert(p.valid());binding.dispose();assert.equal(p.valid(),false);assert.throws(()=>p.validateCommit(f.proof()),/stale/);p.cancel();assert(other.wall.nativeGpuGate.current());assert.equal(other.retired.length,0);
  }finally{f.close();other.close();}
 });
 test(`${config.name}: bridge refuses a v1 native producer before consulting or staging the terminal`,()=>{
  const facts=capture(config),source=facts.records.at(-1).resources[config.key][config.source],epoch=source.reference.worldBoundary.authorityEpoch;
  const f=nativeGateCrossingFixture();let staged=0;try{
   const wasm={...f.w,[config.version]:()=>1,nav_intent_session:()=>source.reference.worldBoundary.nativeSession,nav_task_settlement_proposal_stage:()=>{staged++;return 1;},nav_home_arrival_proposal_stage:()=>{staged++;return 1;}},bridge=createSpatialIntentBridge({core:{wasm}},{authorityEpoch:epoch.slice(0,epoch.lastIndexOf('/'))});
   assert.throws(()=>bridge[config.prepare](source),/Rebuild native/);assert.equal(staged,0);
  }finally{f.session.dispose();}
 });
}

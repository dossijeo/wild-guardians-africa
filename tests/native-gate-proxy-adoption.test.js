import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createSpatialWallMirror} from '../src/world/wild-engine/spatial-wall-mirror.js';
import {spatialGateBarriers} from '../src/world/wild-engine/spatial-wall-bridge.js';
const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function fixture(){
 const f=createNativeRouteExecutionFixture({core:createSpatialWorld(module)}),w=f.w,center=f.point(0,0);
 f.session.core.setSettlement(center.x,center.z,24,24);f.worker(1,f.point(-6,-8),f.point(6,-8));f.bridge.beginNativeRouteExecution();f.bridge.commitNativeCausalClock();
 const wall={id:'structure-990010',kind:'wall',material:'zarzas',gate:true,status:'intact',hp:60,maxHp:60,x:-11.8,z:8.2,yaw:0};
 assert.equal(w.spatial_world_gate_addition_stage(990010,1,wall.x,wall.z,0,1,1),1);assert.equal(w.nav_intent_barrier_proposal_ticket(),1);
 const tuple=Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6)),worldBoundary={version:1,authorityEpoch:'gate-adoption-test',nativeSession:tuple[0],ticket:tuple[1],effectiveTime:tuple[3]};
 assert.equal(w.nav_gate_addition_proposal_pose(...tuple.slice(0,2)),1);const pose=Array.from(new Float64Array(w.memory.buffer,w.nav_gate_mechanism_pose_ptr(),40)),raw=Array.from(new Float32Array(w.memory.buffer,w.spatial_world_gate_addition_proxies_ptr(...tuple.slice(0,2)),18));
 const gate={entityId:wall.id,modelId:1,x:wall.x,z:wall.z,yaw:0,sx:1,sz:1,mechanismId:pose[2],opening:pose[7],rootMatrix:pose.slice(8,24),leafMatrix:pose.slice(24),proxies:Array.from({length:3},(_,i)=>Object.fromEntries(['x','z','halfX','halfZ','yaw','passMask'].map((key,j)=>[key,raw[i*6+j]])))};
 const reference={kind:'native-barrier-addition-reference',version:2,worldBoundary,sourceControlSequence:tuple[2],gate};
 assert.equal(w.spatial_world_gate_addition_commit_bound(...tuple.slice(0,5),tuple[1]),1);const ids=Array.from(new Int32Array(w.memory.buffer,w.spatial_world_proposal_result_ptr(),3));
 const proof={worldBoundary,ids,nativeBarrierAdditionBinding:{kind:'native-barrier-addition-attestation',version:1,reference,preparedReference:reference,nativeIds:ids}};
 return {...f,wall,gate,proof,mirror:createSpatialWallMirror(f.session.core),close:()=>f.session.dispose()};
}
test('adoption retains the exact native triplet despite a one ULP legacy footprint difference',()=>{
 const f=fixture();try{
  const legacy=spatialGateBarriers(f.wall).map(shape=>({...shape,halfX:Math.fround(shape.halfX)}));
  assert.equal(legacy[0].halfX,0.42091473937034607);assert.equal(f.gate.proxies[0].halfX,0.42091476917266846);
  const before=f.session.core.snapshot(),adopt=f.mirror.prepareNativeAdditionAdoption([f.wall],f.proof);assert.equal(f.mirror.revision(),0);assert(adopt());
  f.mirror.sync([f.wall]);assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.mirror.barrierIds(f.wall.id),f.proof.ids);assert.equal(f.mirror.revision(),1);assert.throws(adopt,/stale/);
 }finally{f.close();}
});
test('native adoption rejects altered proxies, IDs, placement and acquired mechanism without a mirror write',()=>{
 const f=fixture();try{
  const before=f.session.core.snapshot(),changed=change=>{const p=structuredClone(f.proof);change(p);return p;};
  const attempts=[
   ()=>f.mirror.prepareNativeAdditionAdoption([f.wall],changed(p=>{p.nativeBarrierAdditionBinding.reference.gate.proxies[0].halfX=0.42091473937034607;})),
   ()=>f.mirror.prepareNativeAdditionAdoption([f.wall],changed(p=>{p.ids.reverse();})),
   ()=>f.mirror.prepareNativeAdditionAdoption([{...f.wall,yaw:.01}],f.proof),
   ()=>f.mirror.prepareNativeAdditionAdoption([{...f.wall,x:f.wall.x+.1}],f.proof),
   ()=>f.mirror.prepareNativeAdditionAdoption([f.wall],changed(p=>{p.nativeBarrierAdditionBinding.reference.gate.mechanismId++;})),
   ()=>f.mirror.prepareNativeAdditionAdoption([f.wall],changed(p=>{p.nativeBarrierAdditionBinding.reference.gate.leafMatrix[12]+=.01;}))
  ];
  for(const attempt of attempts){assert.throws(attempt);assert.equal(f.mirror.revision(),0);assert.deepEqual(f.mirror.barrierIds(f.wall.id),[]);assert.deepEqual(f.session.core.snapshot(),before);}
  assert(f.mirror.adoptNativeAdditions([f.wall],f.proof));
 }finally{f.close();}
});

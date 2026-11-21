import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createNativeRouteExecutionFixture} from '../tests/helpers/native-route-execution.js';
import {nativeGateCrossingFixture} from '../tests/helpers/native-gate-crossings.js';
import {spatialGateBarriers} from '../src/world/wild-engine/spatial-wall-bridge.js';
import {copyNativeBarrierAdditionAttestation,copyNativeBarrierAdditionReference} from '../src/world/native-barrier-addition.js';
const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function tuple(w){assert.equal(w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));}
function fixture(){
 const f=createNativeRouteExecutionFixture({core:createSpatialWorld(module)}),w=f.w,p=f.point(0,0);assert.equal(w.spatial_world_gate_removal_version?.(),1,'rebuild canonical WASM for prepared removal');
 f.session.core.setSettlement(p.x,p.z,24,24);f.worker(1,f.point(-6,-8),f.point(6,-8));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();
 assert.equal(w.spatial_world_gate_addition_stage(990010,1,p.x,p.z,0,1,1),1);const t=tuple(w);assert.equal(w.spatial_world_gate_addition_commit_bound(...t.slice(0,5),t[1]),1);
 const ids=Array.from(new Int32Array(w.memory.buffer,w.spatial_world_proposal_result_ptr(),3));w.spatial_world_proposal_resource_release(...t.slice(0,2));
 return {...f,ids,close(){f.session.dispose();},stage(){assert.equal(w.spatial_world_gate_removal_stage(990010),1);return tuple(w);},advance(){f.state.elapsed+=.1;assert(w.nav_intent_execution_advance(f.state.elapsed)>=0);assert(w.nav_intent_clock_commit(1,0)>=0);}};
}
test('removal prepares no mutation, commits mechanism and triplet once, and preserves unrelated execution',()=>{
 const f=fixture();try{const w=f.w,before=f.session.core.snapshot(),body=f.body(1);assert.equal(w.nav_gate_removal_inspect_stops(990010),0);const t=f.stage();assert.deepEqual(f.session.core.snapshot(),before);assert.equal(w.nav_gate_state(990010),1);
  assert.deepEqual(Array.from(new Int32Array(w.memory.buffer,w.spatial_world_gate_removal_ids_ptr(...t.slice(0,2)),3)),f.ids);
  assert.equal(w.spatial_world_proposal_commit(...t.slice(0,5)),-1);assert.equal(w.spatial_world_proposal_barriers_commit_bound(...t.slice(0,5),t[1]),-1);assert.equal(w.spatial_world_gate_addition_commit_bound(...t.slice(0,5),t[1]),-1);assert.equal(w.spatial_world_gate_addition_revalidate(...t.slice(0,2)),-1);assert.deepEqual(tuple(w),t);
  assert.equal(w.spatial_world_gate_removal_commit_bound(...t.slice(0,5),t[1]+20),-9);assert.deepEqual(f.session.core.snapshot(),before);
  assert.equal(w.spatial_world_gate_removal_commit_bound(...t.slice(0,5),t[1]),1);assert.equal(w.nav_gate_state(990010),0);assert.equal(w.spatial_world_proposal_result_count(),3);assert.deepEqual(Array.from(new Int32Array(w.memory.buffer,w.spatial_world_proposal_result_ptr(),3)),f.ids);
  const after=f.session.core.snapshot();assert.equal(after.barriers.length,before.barriers.length-3);assert(after.barriers.every(b=>!f.ids.includes(b.id)));assert.deepEqual(f.body(1),body);assert.notEqual(w.spatial_world_gate_removal_commit_bound(...t.slice(0,5),t[1]),1);assert.deepEqual(f.session.core.snapshot(),after);
  f.advance();assert.notDeepEqual(f.body(1),body);
 }finally{f.close();}
});
test('removal cancellation and stale native world keep original ownership',()=>{
 const f=fixture();try{const w=f.w,before=f.session.core.snapshot(),first=f.stage();assert.equal(w.nav_intent_barrier_proposal_cancel(...first.slice(0,2)),1);w.spatial_world_proposal_resource_release(...first.slice(0,2));assert.deepEqual(f.session.core.snapshot(),before);assert.equal(w.nav_gate_state(990010),1);
  const next=f.stage();f.session.core.applyBarrierChanges([],[{...f.point(45,45),halfX:1,halfZ:.3,yaw:0}]);const changed=f.session.core.snapshot();assert.equal(w.spatial_world_gate_removal_revalidate(...next.slice(0,2)),-2);assert.equal(w.nav_gate_state(990010),1);assert.deepEqual(f.session.core.snapshot(),changed);for(const id of f.ids)assert.equal(w.spatial_remove_barrier(id),0);
 }finally{f.close();}
});
test('removal revalidates elapsed execution against its original prepared receipt',()=>{
 const f=fixture();try{const t=f.stage();f.advance();assert.equal(f.w.spatial_world_gate_removal_revalidate(...t.slice(0,2)),1);const next=tuple(f.w);assert(next[1]>t[1]);assert.equal(f.w.spatial_world_gate_removal_commit_bound(...next.slice(0,5),t[1]),1);f.advance();}finally{f.close();}
});
test('crossing inventory does not remove or suspend a route during inspection',()=>{
 const f=nativeGateCrossingFixture({install:false,core:createSpatialWorld(module)});try{
  const gate=f.gates[0],id=Number(gate.id.slice(10)),ids=f.session.core.addBarriersBatch(spatialGateBarriers({...gate,kind:'wall'}));assert.equal(f.service.installMechanism(gate.id,gate.material,{navigationBarriers:ids}).status,'installed');
  assert.equal(f.w.spatial_world_gate_removal_version?.(),1);const route=f.route(),admitted=f.admit(route);assert.equal(admitted.status,'admitted');assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();
  const before=f.session.core.snapshot(),body=f.body(1);assert.equal(f.w.nav_gate_removal_inspect_stops(id),1);assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_addition_stop_actors_ptr(),1)),[900011]);assert.equal(f.w.spatial_world_gate_removal_stage(id),0);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.body(1),body);for(const proxy of ids)assert.equal(f.w.spatial_remove_barrier(proxy),0);
 }finally{f.session.dispose();}
});

test('removal attests the same mechanism and exact ordered proxy IDs', () => {
 const template = {
  kind:'native-barrier-addition-reference',
  version:3,
  sourceControlSequence:5,
  worldBoundary:{version:1,authorityEpoch:'removal-test',nativeSession:1,ticket:8,effectiveTime:10},
  removal:{entityId:'structure-12',mechanismId:2,nativeIds:[11,12,13]},
 };
 const preparedReference = copyNativeBarrierAdditionReference(template);
 const reference = structuredClone(preparedReference);
 reference.worldBoundary.ticket++;
 reference.worldBoundary.effectiveTime++;
 const proof = {kind:'native-barrier-addition-attestation',version:1,reference,preparedReference,nativeIds:[11,12,13]};
 assert.deepEqual(copyNativeBarrierAdditionAttestation(proof).reference.removal,preparedReference.removal);
 template.removal.nativeIds[0] = 99;
 assert.deepEqual(preparedReference.removal.nativeIds,[11,12,13]);
 assert.throws(()=>copyNativeBarrierAdditionAttestation({...proof,nativeIds:[13,12,11]}));
 assert.throws(()=>copyNativeBarrierAdditionAttestation({...proof,reference:{...reference,removal:{...reference.removal,mechanismId:3}}}));
 assert.throws(()=>copyNativeBarrierAdditionReference({...reference,removal:{...reference.removal,nativeIds:[11,12,11]}}));
});

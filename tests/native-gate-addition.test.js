import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function fixture(){
 const f=createNativeRouteExecutionFixture({core:createSpatialWorld(module)}),w=f.w,center=f.point(0,0);
 f.session.core.setSettlement(center.x,center.z,24,24);
 f.worker(1,f.point(-6,-8),f.point(6,-8));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();
 const tuple=()=>{assert.equal(w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));};
 const stage=(model=1,yaw=0)=>{assert.equal(w.spatial_world_gate_addition_stage(990010,model,center.x,center.z,yaw,model===3?1.6:1,model===3?1.6:1),1);return tuple();};
 const pose=t=>{assert.equal(w.nav_gate_addition_proposal_pose(...t.slice(0,2)),1);return Array.from(new Float64Array(w.memory.buffer,w.nav_gate_mechanism_pose_ptr(),40));};
 const advance=()=>{f.state.elapsed+=.1;assert(w.nav_intent_execution_advance(f.state.elapsed)>=0);assert(w.nav_intent_clock_commit(1,0)>=0);};
 return {...f,w,center,tuple,stage,pose,advance,close:()=>f.session.dispose()};
}
for(const [model,yaw]of [[1,0],[2,.73],[3,0]])test(`kind2 gate ${model} owns one mechanism and its canonical triplet (${yaw})`,()=>{
 const f=fixture();try{
  assert.equal(f.w.spatial_world_gate_addition_version(),1);const before=f.session.core.snapshot(),original=f.stage(model,yaw),pose=f.pose(original),ptr=f.w.spatial_world_gate_addition_proxies_ptr(...original.slice(0,2)),proxies=Array.from(new Float32Array(f.w.memory.buffer,ptr,18));
  assert.equal(f.w.nav_gate_state(990010),0,'preparation cannot publish a gate');assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual([proxies[5],proxies[11],proxies[17]],[0,0,1]);
  assert.equal(f.w.spatial_world_proposal_commit(...original.slice(0,5)),-1,'generic commit cannot omit gate acquisition');assert.equal(f.w.spatial_world_proposal_barriers_commit_bound(...original.slice(0,5),original[1]),-1);
  assert.equal(f.w.spatial_world_gate_addition_commit_bound(...original.slice(0,5),original[1]),1);
  assert.equal(f.w.spatial_world_proposal_result_count(),3);const ids=Array.from(new Int32Array(f.w.memory.buffer,f.w.spatial_world_proposal_result_ptr(),3));assert.equal(new Set(ids).size,3);
  const after=f.session.core.snapshot();assert.equal(after.barriers.length,before.barriers.length+3);
  for(let i=0;i<3;i++){const barrier=after.barriers.find(b=>b.id===ids[i]);assert.deepEqual(['x','z','halfX','halfZ','yaw','passMask'].map(k=>barrier[k]),proxies.slice(i*6,i*6+6));assert.equal(f.w.spatial_remove_barrier(ids[i]),0);}
  assert.equal(f.w.nav_gate_mechanism_pose(990010),1);assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_mechanism_pose_ptr(),40)),pose);
  assert.equal(f.w.spatial_world_gate_addition_commit_bound(...original.slice(0,5),original[1]),-2,'consumed proposal cannot pass resource snapshot validation');assert.deepEqual(f.session.core.snapshot(),after);
  const body=f.body(1);f.advance();assert.notDeepEqual(f.body(1),body,'the original unrelated route still advances after gate acquisition');
 }finally{f.close();}
});
test('a gate revalidates elapsed movement and rejects a foreign original receipt',()=>{
 const f=fixture();try{
  const before=f.session.core.snapshot(),body=f.body(1),original=f.stage(),pose=f.pose(original);f.advance();
  assert.equal(f.w.spatial_world_proposal_revalidate_barriers(...original.slice(0,2)),-1);
  assert.equal(f.w.spatial_world_gate_addition_revalidate(...original.slice(0,2)),1);const current=f.tuple(),updated=f.pose(current);assert.equal(updated[2],pose[2]);assert.deepEqual(updated.slice(8),pose.slice(8));assert.notDeepEqual(f.body(1),body);
  assert.equal(f.w.spatial_world_gate_addition_commit_bound(...current.slice(0,5),original[1]+500),-9);assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_gate_state(990010),0);
  assert.equal(f.w.spatial_world_gate_addition_commit_bound(...current.slice(0,5),original[1]),1);
 }finally{f.close();}
});
test('cancelling prepared gate leaves no mechanism, proxies or lent receipt',()=>{
 const f=fixture();try{const before=f.session.core.snapshot(),first=f.stage();assert.equal(f.w.nav_intent_barrier_proposal_cancel(...first.slice(0,2)),1);assert.equal(f.w.spatial_world_proposal_resource_release(...first.slice(0,2)),1);assert.equal(f.w.nav_gate_state(990010),0);assert.deepEqual(f.session.core.snapshot(),before);
  const second=f.stage();assert.equal(f.w.spatial_world_gate_addition_commit_bound(...second.slice(0,5),first[1]),-9);assert.deepEqual(f.session.core.snapshot(),before);
 }finally{f.close();}
});
test('a foreign barrier still blocks the gate before a proposal is published',()=>{
 const f=fixture();try{f.session.core.applyBarrierChanges([],[{x:f.center.x,z:f.center.z,halfX:.3,halfZ:.3,yaw:0}]);const before=f.session.core.snapshot();assert.notEqual(f.w.spatial_world_gate_addition_stage(990010,1,f.center.x,f.center.z,0,1,1),1);assert.equal(f.w.nav_gate_state(990010),0);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(f.session.core.snapshot(),before);}finally{f.close();}
});
test('a changed native world invalidates the entire gate candidate',()=>{
 const f=fixture();try{const original=f.stage(),far=f.point(45,45);f.session.core.applyBarrierChanges([],[{...far,halfX:1,halfZ:.3,yaw:0}]);const before=f.session.core.snapshot();assert.equal(f.w.spatial_world_gate_addition_revalidate(...original.slice(0,2)),-2);assert.equal(f.w.nav_gate_state(990010),0);assert.deepEqual(f.session.core.snapshot(),before);}finally{f.close();}
});

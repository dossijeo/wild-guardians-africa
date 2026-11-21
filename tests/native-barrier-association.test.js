import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function fixture(){const f=createNativeRouteExecutionFixture({core:createSpatialWorld(module)}),w=f.w;f.worker(1,f.point(-6,0),f.point(6,0));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();
 const read=(name,n,...args)=>{const p=w[name](...args);assert(p,name);return Array.from(new Float64Array(w.memory.buffer,p,n));};
 const tuple=()=>{assert.equal(w.nav_intent_barrier_proposal_ticket(),1);return read('nav_intent_barrier_proposal_ticket_ptr',6);};
 const stage=(offset=35)=>{const p=f.point(offset,35),values=[p.x,p.z,1,.3,.2,0],pointer=w.spatial_world_proposal_float_ptr(6);new Float32Array(w.memory.buffer,pointer,6).set(values);w.spatial_world_proposal_int_ptr(0);assert.equal(w.spatial_world_proposal_stage_resources(2,0,6,0),1);return {tuple:tuple(),values:values.map(Math.fround)};};
 const advance=()=>{f.state.elapsed+=.1;assert(w.nav_intent_execution_advance(f.state.elapsed)>=0);assert(w.nav_intent_clock_commit(1,0)>=0);};
 return {...f,w,read,tuple,stage,advance,close:()=>f.session.dispose()};}
test('native solid addition revalidates time without freezing a moving actor and binds the original preparation',()=>{
 const f=fixture();try{const before=f.session.core.snapshot(),body=f.body(1),original=f.stage();assert.equal(f.w.spatial_world_barrier_addition_version(),1);let current=original.tuple;
  for(let i=0;i<2;i++){f.advance();assert.equal(f.w.spatial_world_proposal_revalidate_barriers(...current.slice(0,2)),1);current=f.tuple();const translation=f.read('nav_barrier_addition_proposal_translation_ptr',8,...current.slice(0,2));assert.deepEqual(translation,[1,original.tuple[1],current[1],original.tuple[3],current[3],1,1,0]);assert(current[1]>original.tuple[1]);assert(current[3]>original.tuple[3]);assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_world_proposal_retains_routes(...current.slice(0,2)),1);}
  assert.notDeepEqual(f.body(1),body);assert.equal(f.w.spatial_world_proposal_barriers_commit_bound(...current.slice(0,5),original.tuple[1]),1);assert.deepEqual(f.read('spatial_world_barrier_binding_ptr',5),[1,original.tuple[1],original.tuple[3],current[1],current[3]]);assert.equal(f.w.spatial_world_resource_snapshot(),1);assert.equal(f.w.spatial_world_proposal_result_count(),1);assert.equal(f.session.core.snapshot().barriers.length,before.barriers.length+1);assert.equal(f.w.spatial_world_stop_binding_ptr(),0,'barrier receipt cannot impersonate stop24');
 }finally{f.close();}
});
test('native solid addition rejects foreign prepared identity before any physical mutation',()=>{
 const f=fixture();try{const before=f.session.core.snapshot(),original=f.stage();f.advance();assert.equal(f.w.spatial_world_proposal_revalidate_barriers(...original.tuple.slice(0,2)),1);const current=f.tuple();assert.equal(f.w.spatial_world_proposal_barriers_commit_bound(...current.slice(0,5),current[1]+500),-9);assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.spatial_world_barrier_binding_ptr(),0);assert.equal(f.w.spatial_world_proposal_barriers_commit_bound(...current.slice(0,5),original.tuple[1]),1);}finally{f.close();}
});
test('native solid addition still rejects an unvalidated later clock at commit',()=>{
 const f=fixture();try{const original=f.stage(),before=f.session.core.snapshot();f.advance();assert.equal(f.w.spatial_world_proposal_barriers_commit_bound(...original.tuple.slice(0,5),original.tuple[1]),-2);assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.spatial_world_barrier_binding_ptr(),0);}finally{f.close();}
});
test('native solid addition revalidation rejects changed world geometry and cannot revive its ticket',()=>{
 const f=fixture();try{const original=f.stage(),p=f.point(45,45);f.session.core.applyBarrierChanges([],[{x:p.x,z:p.z,halfX:1,halfZ:.3,yaw:0}]);const changed=f.session.core.snapshot();assert.equal(f.w.spatial_world_proposal_revalidate_barriers(...original.tuple.slice(0,2)),-2);assert.deepEqual(f.session.core.snapshot(),changed);assert.equal(f.w.spatial_world_proposal_revalidate_barriers(...original.tuple.slice(0,2)),-1);assert.equal(f.w.spatial_world_barrier_binding_ptr(),0);}finally{f.close();}
});
test('native solid addition cancellation cannot lend its origin to another proposal',()=>{
 const f=fixture();try{const first=f.stage();assert.equal(f.w.nav_intent_barrier_proposal_cancel(...first.tuple.slice(0,2)),1);assert.equal(f.w.spatial_world_proposal_resource_release(...first.tuple.slice(0,2)),1);const second=f.stage(40),before=f.session.core.snapshot();assert.equal(f.w.spatial_world_proposal_barriers_commit_bound(...second.tuple.slice(0,5),first.tuple[1]),-9);assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.spatial_world_proposal_barriers_commit_bound(...second.tuple.slice(0,5),second.tuple[1]),1);}finally{f.close();}
});
test('native solid addition retains its owned geometry when temporary input buffers are overwritten',()=>{
 const f=fixture();try{const original=f.stage(),pointer=f.w.spatial_world_proposal_float_ptr(6);new Float32Array(f.w.memory.buffer,pointer,6).set([100,100,3,3,0,0]);f.advance();assert.equal(f.w.spatial_world_proposal_revalidate_barriers(...original.tuple.slice(0,2)),1);const current=f.tuple();assert.equal(f.w.spatial_world_proposal_barriers_commit_bound(...current.slice(0,5),original.tuple[1]),1);const id=new Int32Array(f.w.memory.buffer,f.w.spatial_world_proposal_result_ptr(),1)[0],barrier=f.session.core.snapshot().barriers.find(b=>b.id===id);assert.deepEqual(['x','z','halfX','halfZ','yaw','passMask'].map(key=>barrier[key]),original.values);}finally{f.close();}
});

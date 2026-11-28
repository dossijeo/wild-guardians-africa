import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeHomeRouteFixture} from './helpers/native-home-route.js';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {copyNativeHomeRouteProposal,copyNativeHomeRouteAttestation} from '../src/world/native-home-route.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {pair,fixture as gpuFixture,flush} from './helpers/remote-webgpu-fixture.js';

test('a genuine Home draft keeps its stationary body and original Game state until admitted',()=>{
 const f=nativeHomeRouteFixture();try{const before=JSON.stringify(f.state),body=f.body(1),sequence=f.w.nav_intent_transition_sequence(),p=f.prepareHome();assert.equal(p.status,'proposed',JSON.stringify(p));const proposal=copyNativeHomeRouteProposal(p.proposal),r=proposal.nativeHome,source=f.held.reference;assert.equal(proposal.authorizedAutonomy,false);assert.equal(proposal.nativeStart,undefined);assert.equal(proposal.nativeResume,undefined);assert.equal(proposal.taskId,undefined);assert.deepEqual(r.sourceSettlement,f.held);assert.equal(proposal.points.at(-2),Math.fround(source.home.x));assert.equal(proposal.points.at(-1),Math.fround(source.home.z));assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(JSON.stringify(f.state),before);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),f.held);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(f.prepareHome().status,'busy');assert(f.planner.cancelNativeHomeRouteProposal(p.proposal.ticket));assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),f.held);
 }finally{f.close();}
});

test('Home source admission transfers the same body to a task-free route and holds its actual endpoint',()=>{
 const f=nativeHomeRouteFixture();try{const body=f.body(1),before=JSON.stringify(f.state),p=f.prepareHome();assert.equal(p.status,'proposed',JSON.stringify(p));assert.equal(f.commitHome(p.proposal),1);const binding=copyNativeHomeRouteAttestation(f.planner.nativeHomeRouteBinding(f.actor));assert.deepEqual(binding.preparedReference,p.proposal.nativeHome);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.equal(f.planner.nativeDeliveryExecution(f.actor),null);assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert.equal(f.w.nav_intent_game_execution_state(),1);assert.deepEqual(f.body(1),body);assert.equal(JSON.stringify(f.state),before);assert.equal(f.w.nav_intent_finish(binding.reference.actorId),0);assert.equal(f.w.nav_intent_cancel_home(binding.reference.actorId),0);assert.equal(f.w.nav_intent_plan_home(binding.reference.actorId,body[1],body[2],60,0),-2);assert.equal(f.w.spatial_body_upsert(1,body[1]+1,body[2],body[3],0,1),0);f.advance(.2);assert.notDeepEqual(f.body(1),body);let execution=f.planner.nativeHomeRouteExecution(f.actor);assert(execution&&!execution.arrived);assert.equal(execution.nativeRoute.assignmentSequence,binding.assignmentSequence);assert.equal(execution.executedThrough,f.state.elapsed);f.advance(binding.reference.endTime+.1-f.state.elapsed);execution=f.planner.nativeHomeRouteExecution(f.actor);assert(execution.arrived);assert.equal(execution.x,Math.fround(f.held.reference.home.x));assert.equal(execution.z,Math.fround(f.held.reference.home.z));const arrived=f.body(1);f.advance(.3);assert.deepEqual(f.body(1),arrived);assert.equal(f.planner.nativeHomeRouteBinding(f.actor).assignmentSequence,binding.assignmentSequence);
 }finally{f.close();}
});

test('a delayed Home result retains exact source, phases and compatible prepared resources',()=>{
 const f=nativeHomeRouteFixture();try{const p=f.prepareHome();assert.equal(p.status,'proposed');const body=f.body(1);f.advance(.4);const next=f.planner.revalidateNativeHomeRouteProposal(p.proposal.ticket);assert.equal(next.status,'revalidated',JSON.stringify(next));assert(next.timeTranslation.sameFloat32Motion);assert(next.timeTranslation.sameFloat32Gates);assert(next.proposal.startTime>p.proposal.startTime);assert.deepEqual(f.body(1),body);assert.equal(f.commitHome(next.proposal,p.proposal),1);const b=f.planner.nativeHomeRouteBinding(f.actor);assert.deepEqual(b.preparedReference,p.proposal.nativeHome);assert.deepEqual(b.reference,next.proposal.nativeHome);const wrong=structuredClone(b);wrong.reference.sourceSettlement.reference.home.x++;assert.throws(()=>copyNativeHomeRouteAttestation(wrong),/prepared/);
 }finally{f.close();}
});

test('an availability body and a retired or changed Home source cannot authorize the Home draft',()=>{
 const idle=nativeTaskSettlementFixture();try{const p=idle.prepareSettlement();assert.equal(idle.commitSettlement(p.proposal),1);assert.equal(idle.planner.prepareNativeHomeRouteProposal(idle.planner.nativeTaskSettlementBinding(idle.actor)).status,'unsupported');}finally{idle.close();}
 const f=nativeHomeRouteFixture();try{const p=f.prepareHome();assert.equal(p.status,'proposed');const body=f.body(1);assert.equal(f.w.spatial_body_upsert(7,body[1]+30,body[2]+30,.28,0,1),1);assert.equal(f.commitHome(p.proposal),-2);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),f.held);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(f.w.nav_intent_retire_actor(f.held.reference.actorId),1);assert.equal(f.planner.prepareNativeHomeRouteProposal(f.held).status,'stale');
 }finally{f.close();}
});

test('Home presentation rejects partial endpoints, altered physical phases and task/resume aliases',()=>{
 const f=nativeHomeRouteFixture();try{const p=f.prepareHome().proposal;assert(p);for(const change of [p=>{p.points[p.points.length-2]+=1;},p=>{p.rows[9]+=1;},p=>{p.origin.x+=1;},p=>{p.motionFlags=8;},p=>{p.taskId=1;},p=>{p.nativeResume={};}]){const bad=structuredClone(p);change(bad);assert.throws(()=>copyNativeHomeRouteProposal(bad),/Home/);}
 }finally{f.close();}
});

test('both native artifacts expose the complete Home proposal, association and execution ABI',async()=>{
 const names=['nav_home_route_proposal_version','nav_home_route_proposal_stage','nav_home_route_proposal_snapshot','nav_home_route_proposal_header_ptr','nav_home_route_proposal_points','nav_home_route_proposal_points_ptr','nav_home_route_proposal_rows','nav_home_route_proposal_rows_ptr','nav_home_route_proposal_gates','nav_home_route_proposal_gate','nav_home_route_proposal_cancel','nav_home_route_proposal_revalidate','nav_home_route_proposal_time_translation_ptr','nav_home_route_proposal_commit_bound','nav_home_route_binding_snapshot','nav_home_route_binding_ptr','nav_home_route_binding_actors','nav_home_route_binding_gates','nav_home_route_source_snapshot','nav_intent_home_execution','nav_intent_home_execution_ptr'];const exports=new Set(WebAssembly.Module.exports(new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'))).map(e=>e.name));for(const name of names)assert(exports.has(name),name);const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);try{for(const name of names)assert.equal(typeof runtime.core.wasm[name],'function',name);}finally{await runtime.dispose();}
});

test('the graphical consumer rejects actual Home source bootstrap until its prepared consumer is implemented',async()=>{
 const f=nativeHomeRouteFixture();let gpu;try{const p=f.prepareHome();assert.equal(p.status,'proposed');assert.equal(f.commitHome(p.proposal),1);f.planner.commitNativeCausalClock();let baseline;const stop=f.planner.observeNativeIntentControl({onBaseline:b=>{baseline=b;},onChanges(){}});stop();assert.equal(baseline.nativeHomes.length,1);const [authorityPort,drawPort]=pair();gpu=await gpuFixture({}, {intentControl:{port:drawPort,session:'home-baseline'}});authorityPort.postMessage({...baseline,session:'home-baseline'});await flush();await gpu.host.idle();assert(gpu.host.inspect().failed);assert.match(gpu.errors[0]?.message??'',/Home routes require prepared graphical admission/);
 }finally{gpu?.client.dispose();await gpu?.host.dispose();f.close();}
});

test('Home admission checks the complete candidate against an otherwise unowned body at its genuine destination',()=>{
 const f=nativeHomeRouteFixture();try{const p=f.prepareHome();assert.equal(p.status,'proposed');assert(f.planner.cancelNativeHomeRouteProposal(p.proposal.ticket));const home=f.held.reference.home,body=f.body(1),sequence=f.w.nav_intent_transition_sequence();assert.equal(f.w.spatial_body_upsert(77,home.x,home.z,.28,0,1),1);const rejected=f.prepareHome();assert.equal(rejected.status,'conflict',JSON.stringify(rejected));const witness=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_route_reservation_result_ptr(),6));assert.equal(witness[1],77);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),f.held);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
 }finally{f.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {copyNativeTaskSettlementProposal,copyNativeTaskSettlementAttestation,copyNativeTaskSettlementResources,nativeTaskSettlementPresentationMatches} from '../src/world/native-task-settlement.js';
import {readFileSync} from 'node:fs';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {pair,fixture as gpuFixture,flush} from './helpers/remote-webgpu-fixture.js';

test('stationary committed resources require the exact issued association, world and prepared source',()=>{
 const f=nativeTaskSettlementFixture();try{const proposal=f.prepareSettlement().proposal;assert.equal(f.commitSettlement(proposal),1);const proof=f.planner.nativeTaskSettlementBinding(f.actor),resources={version:1,kind:17,phase:'committed',worldBoundary:proof.reference.worldBoundary,nativeTaskSettlementBinding:proof};assert.deepEqual(copyNativeTaskSettlementResources(resources),resources);assert(nativeTaskSettlementPresentationMatches(proposal,resources,proof));const foreign=structuredClone(proof);foreign.reference.pose.yaw+=.1;foreign.preparedReference.pose.yaw+=.1;assert.equal(nativeTaskSettlementPresentationMatches(proposal,resources,foreign),false);for(const changed of [{kind:15},{phase:'proposal'},{extra:1},{worldBoundary:{...resources.worldBoundary,ticket:resources.worldBoundary.ticket+1}}])assert.throws(()=>copyNativeTaskSettlementResources({...resources,...changed}),/resources|boundary mismatch/);}finally{f.close();}
});

test('settlement requires a real completed Carry and keeps its resources, body and semantic state during preparation',()=>{
 const early=nativeTaskSettlementFixture({arrived:false});try{assert.equal(early.prepareSettlement().status,'unsupported');assert.equal(early.planner.nativeTaskSettlementBinding(early.actor),null);assert(early.planner.nativeTaskConsequenceBinding(early.actor));}finally{early.close();}
 const f=nativeTaskSettlementFixture();try{const before=JSON.stringify(f.state),body=f.body(1),sequence=f.w.nav_intent_transition_sequence(),p=f.prepareSettlement();assert.equal(p.status,'proposed');const proposal=copyNativeTaskSettlementProposal(p.proposal);assert.equal(proposal.authorizedConsequences,false);assert.equal(proposal.nativeRoute,undefined);assert.equal(proposal.nativeStart,undefined);assert.equal(proposal.nativeResume,undefined);assert.equal(proposal.nativeSettlement.pose.x,body[1]);assert.equal(proposal.nativeSettlement.pose.z,body[2]);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(JSON.stringify(f.state),before);assert.deepEqual(f.body(1),body);assert(f.planner.cancelNativeTaskSettlementProposal(proposal.ticket));assert(f.planner.nativeTaskConsequenceBinding(f.actor));}finally{f.close();}
});

test('the conditioned source commit keeps a native stationary body after retiring the arrived Carry',()=>{
 const f=nativeTaskSettlementFixture();try{const p=f.prepareSettlement();assert.equal(p.status,'proposed');const body=f.body(1),peer=f.body(3),before=JSON.stringify(f.state),sequence=f.w.nav_intent_transition_sequence();assert.equal(f.commitSettlement(p.proposal),1);const proof=copyNativeTaskSettlementAttestation(f.planner.nativeTaskSettlementBinding(f.actor));assert.equal(proof.settlementSequence,sequence+1);assert.equal(proof.reference.sourceCarry.assignmentSequence,f.carry.assignmentSequence);assert.equal(f.planner.nativeTaskConsequenceBinding(f.actor),null);assert.equal(f.planner.nativeDeliveryExecution(f.actor),null);assert.equal(f.w.nav_intent_game_execution_state(),1);assert.equal(f.w.nav_intent_finish(Number(f.actor.split('-').at(-1))),0);assert.equal(JSON.stringify(f.state),before);assert.deepEqual(f.body(1),body);
  assert.equal(f.w.spatial_body_upsert(1,body[1]+1,body[2],body[3],0,1),0);f.advance(.2);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.planner.nativeSettledWorkerExecution(f.actor).executedThrough,f.state.elapsed);assert.equal(f.planner.nativeRouteTiming(f.carry.reference.expectedRouteHandle),null);
 }finally{f.close();}
});

test('settlement revalidation binds the exact prepared body to its later actual native origin',()=>{
 const f=nativeTaskSettlementFixture();try{const p=f.prepareSettlement();assert.equal(p.status,'proposed');const body=f.body(1);f.advance(.5);const r=f.planner.revalidateNativeTaskSettlementProposal(p.proposal.ticket);assert.equal(r.status,'revalidated');assert.equal(r.timeTranslation.sameSourceState,true);assert(r.proposal.worldBoundary.effectiveTime>p.proposal.worldBoundary.effectiveTime);assert.equal(f.commitSettlement(r.proposal,p.proposal),1);const b=f.planner.nativeTaskSettlementBinding(f.actor);assert.deepEqual(b.preparedReference,p.proposal.nativeSettlement);assert.deepEqual(b.reference,r.proposal.nativeSettlement);assert.deepEqual(f.body(1),body);const wrong=structuredClone(b);wrong.reference.pose.runPhase++;assert.throws(()=>copyNativeTaskSettlementAttestation(wrong),/prepared source/);
 }finally{f.close();}
});

test('a retained settlement ticket is busy to other mutations and a changed body binding cannot commit it',()=>{
 const f=nativeTaskSettlementFixture();try{const p=f.prepareSettlement();assert.equal(p.status,'proposed');assert.equal(f.prepareSettlement().status,'busy');const before=JSON.stringify(f.state),body=f.body(1);assert.equal(f.w.nav_gate_bind_worker(Number(f.actor.split('-').at(-1)),3),0);assert.equal(f.w.spatial_body_upsert(7,body[1]+20,body[2]+20,.28,0,1),1);assert.equal(f.commitSettlement(p.proposal),-2);assert.equal(JSON.stringify(f.state),before);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);
 }finally{f.close();}
});

test('both canonical native artifacts expose the same complete settlement ABI',async()=>{
 const names=['nav_task_settlement_proposal_version','nav_task_settlement_proposal_stage','nav_task_settlement_proposal_snapshot','nav_task_settlement_proposal_header_ptr','nav_task_settlement_proposal_cancel','nav_task_settlement_proposal_revalidate','nav_task_settlement_proposal_time_translation_ptr','nav_task_settlement_proposal_commit_bound','nav_task_settlement_binding_snapshot','nav_task_settlement_binding_ptr','nav_task_settlement_binding_actors','nav_task_settlement_source_snapshot','nav_task_settlement_action_source_snapshot','nav_task_settlement_action_source_restore'];
 const exports=new Set(WebAssembly.Module.exports(new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'))).map(e=>e.name));for(const name of names)assert(exports.has(name),name);
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);try{for(const name of names)assert.equal(typeof runtime.core.wasm[name],'function',name);}finally{await runtime.dispose();}
});

test('the graphical consumer rejects a stationary source baseline until its own prepared successor is implemented',async()=>{
 const f=nativeTaskSettlementFixture();let gpu;try{const p=f.prepareSettlement();assert.equal(p.status,'proposed');assert.equal(f.commitSettlement(p.proposal),1);f.planner.commitNativeCausalClock();let baseline;const stop=f.planner.observeNativeIntentControl({onBaseline:b=>{baseline=b;},onChanges(){}});stop();assert.equal(baseline.nativeSettlements.length,1);const [authorityPort,drawPort]=pair();gpu=await gpuFixture({}, {intentControl:{port:drawPort,session:'settlement-baseline'}});authorityPort.postMessage({...baseline,session:'settlement-baseline'});await flush();await gpu.host.idle();assert(gpu.host.inspect().failed);assert.match(gpu.errors[0]?.message??'',/require prepared graphical admission/);
 }finally{gpu?.client.dispose();await gpu?.host.dispose();f.close();}
});

test('a settled worker cannot be rebound to another otherwise unowned native body',()=>{
 const f=nativeTaskSettlementFixture();try{const p=f.prepareSettlement();assert.equal(p.status,'proposed');assert.equal(f.commitSettlement(p.proposal),1);const binding=f.planner.nativeTaskSettlementBinding(f.actor),body=f.body(1);assert.equal(f.w.spatial_body_upsert(7,body[1]+20,body[2]+20,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(Number(f.actor.split('-').at(-1)),7),0);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),binding);
 }finally{f.close();}
});

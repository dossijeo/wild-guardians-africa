import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {prepareCrateDeliveryConsequence,projectNativeCrateDeliveryConsequence,emit} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {enqueue} from '../src/simulation/tasks.js';

function clock(control,value,baseline=false){const prior=control.status().clock,reanchor=baseline||value.reanchor;control.acceptClock({...value,anchorLogicalTime:reanchor?value.committedThrough:prior.anchorLogicalTime,anchorAbsoluteMs:reanchor?1000:prior.anchorAbsoluteMs},{baseline});}
function controlFor(b){const c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingActionRequests:b.pendingActionRequests??[]});clock(c,b.clock,true);c.installStartedRoutes(b.worldBoundary,b.nativeStartedRoutes??[],{bootstrap:true});c.installActions(b.worldBoundary,b.nativeActions??[],{bootstrap:true});c.installConsequences(b.worldBoundary,b.nativeConsequences??[],{bootstrap:true});c.installSettlements(b.worldBoundary,b.nativeSettlements??[],{bootstrap:true});return c;}
function fixture(){const f=nativeTaskSettlementFixture();f.planner.intentChanges();const control=controlFor(f.planner.nativeIntentControlBaseline());return {...f,control,sync(){f.planner.commitNativeCausalClock();for(const event of f.planner.intentChanges())control.accept(event);const next=f.planner.nativeCausalClock();if(control.status().clock.clockSequence!==next.clockSequence)clock(control,next);},close(){control.dispose();f.close();}};}
function claim(f){const target=createPlant(`plant-${f.state.nextId++}`,'mijo',f.target.x,f.target.z,f.worker.centerId);target.growth=cropSpec('mijo').growth_seconds;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,f.worker.centerId,'harvest',target.id);f.planner.flushTaskEvents();const plan=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,plan,{navVersion:1,pendingResources:true}),1);return f.planner.pendingTaskRoute(f.actor);}

test('a stationary template is preparation only until its exact direct transition and native settlement proof arrive',()=>{
 const f=fixture();try{const p=f.prepareSettlement().proposal,r=p.nativeSettlement,carry=f.control.admitConsequence(f.carry.reference),lease=f.control.admitSettlement(r,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.settlementRecord,null);assert.throws(()=>f.control.admitSettlement(r),/obsolete/);
  assert.equal(f.commitSettlement(p),1);const actual=f.planner.nativeTaskSettlementBinding(f.actor);assert.throws(()=>f.control.installSettlements(actual.reference.worldBoundary,[actual]),/issued/);f.sync();assert.equal(carry.isCurrent(),false);assert.equal(lease.isPrepared(),false);assert.equal(f.control.installSettlements(actual.reference.worldBoundary,[actual]),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,actual.reference.worldBoundary.effectiveTime);assert.equal(lease.settlementRecord.bodyId,r.bodyId);f.advance(.2);f.sync();assert.equal(f.control.clockLease(r.worldBoundary.effectiveTime).safeUntil,f.state.elapsed);assert(lease.isCurrent());const record=lease.settlementRecord;assert.equal(f.w.nav_intent_retire_actor(r.actorId),1);f.sync();assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);assert.equal(record.safeUntil,f.state.elapsed);
 }finally{f.close();}
});

test('a rejected settlement batch installs nothing and a foreign Carry provenance cannot replace the actual one',()=>{
 const f=fixture();try{const p=f.prepareSettlement().proposal;assert.equal(f.commitSettlement(p),1);f.sync();const actual=f.planner.nativeTaskSettlementBinding(f.actor),foreign=structuredClone(actual);for(const r of [foreign.reference,foreign.preparedReference])for(const a of [r.sourceCarry.reference.sourceAction.reference,r.sourceCarry.reference.sourceAction.preparedReference,r.sourceCarry.preparedReference.sourceAction.reference,r.sourceCarry.preparedReference.sourceAction.preparedReference])a.request.heading+=.1;
  assert.throws(()=>f.control.installSettlements(actual.reference.worldBoundary,[actual,foreign]),/issued/);assert.throws(()=>f.control.admitSettlement(p.nativeSettlement),/obsolete/);assert.equal(f.control.installSettlements(actual.reference.worldBoundary,[actual]),1);assert(f.control.admitSettlement(p.nativeSettlement).isCurrent());
 }finally{f.close();}
});

test('stationary ownership survives a real pending task even when its request precedes installation of the graphical settlement proof',()=>{
 const f=fixture();try{const crate=f.state.crates[0],center=f.state.structures.find(c=>c.id===f.worker.centerId),preview=prepareCrateDeliveryConsequence(f.state,f.worker,crate,center),p=f.prepareSettlement().proposal;assert.equal(f.commitSettlement(p),1);projectNativeCrateDeliveryConsequence(f.state,f.worker,preview,f.planner);f.sync();const actual=f.planner.nativeTaskSettlementBinding(f.actor),request=claim(f);f.sync();assert.equal(f.control.installSettlements(actual.reference.worldBoundary,[actual]),1);const lease=f.control.admitSettlement(p.nativeSettlement);assert(lease.isCurrent());f.advance(.2);f.sync();assert(lease.isCurrent());
  const pose=actual.reference.pose,next=f.planner.prepareNativeTaskStartProposal(request,{bodyId:pose&&actual.reference.bodyId,radius:pose.radius,runRemaining:pose.runRemaining,runPhase:pose.runPhase,walkPhase:pose.walkPhase,carryPhase:pose.carryPhase});assert.equal(next.status,'proposed');assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),next.proposal.ticket.ticket),1);f.sync();assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);
 }finally{f.close();}
});

test('source baselines reconstruct current Idle and pending-task stationary associations from actual native facts',()=>{
 const f=fixture();let idle,pending;try{const crate=f.state.crates[0],center=f.state.structures.find(c=>c.id===f.worker.centerId),preview=prepareCrateDeliveryConsequence(f.state,f.worker,crate,center),p=f.prepareSettlement().proposal;assert.equal(f.commitSettlement(p),1);projectNativeCrateDeliveryConsequence(f.state,f.worker,preview,f.planner);f.sync();idle=controlFor(f.planner.nativeIntentControlBaseline());assert(idle.admitSettlement(p.nativeSettlement).isCurrent());claim(f);f.sync();pending=controlFor(f.planner.nativeIntentControlBaseline());assert(pending.admitSettlement(p.nativeSettlement).isCurrent());
 }finally{idle?.dispose();pending?.dispose();f.close();}
});

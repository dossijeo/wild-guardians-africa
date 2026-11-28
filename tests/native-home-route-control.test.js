import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHomeRouteFixture} from './helpers/native-home-route.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

function clock(control,value,baseline=false){const prior=control.status().clock,reanchor=baseline||value.reanchor;control.acceptClock({...value,anchorLogicalTime:reanchor?value.committedThrough:prior.anchorLogicalTime,anchorAbsoluteMs:reanchor?1000:prior.anchorAbsoluteMs},{baseline});}
function controlFor(b){const c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingActionRequests:b.pendingActionRequests??[]});clock(c,b.clock,true);c.installStartedRoutes(b.worldBoundary,b.nativeStartedRoutes??[],{bootstrap:true});c.installActions(b.worldBoundary,b.nativeActions??[],{bootstrap:true});c.installConsequences(b.worldBoundary,b.nativeConsequences??[],{bootstrap:true});c.installSettlements(b.worldBoundary,b.nativeSettlements??[],{bootstrap:true});c.installHomes(b.worldBoundary,b.nativeHomes??[],{bootstrap:true});return c;}
function fixture(){const f=nativeHomeRouteFixture();f.planner.intentChanges();const control=controlFor(f.planner.nativeIntentControlBaseline());return {...f,control,sync(){f.planner.commitNativeCausalClock();for(const e of f.planner.intentChanges())control.accept(e);const next=f.planner.nativeCausalClock();if(control.status().clock.clockSequence!==next.clockSequence)clock(control,next);},close(){control.dispose();f.close();}};}

test('Home requires its actual direct assignment and exact source before a prepared identity becomes current',()=>{
 const f=fixture();try{const p=f.prepareHome().proposal,r=p.nativeHome,held=f.control.admitSettlement(f.held.reference),old=held.settlementRecord,lease=f.control.admitHome(r,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.throws(()=>f.control.admitHome(r),/obsolete/);assert.equal(f.commitHome(p),1);const actual=f.planner.nativeHomeRouteBinding(f.actor);assert.throws(()=>f.control.installHomes(actual.reference.worldBoundary,[actual]),/issued/);f.sync();assert.equal(held.isCurrent(),false);assert.equal(old.safeUntil,f.state.elapsed);assert.equal(lease.isCurrent(),false);assert.equal(f.control.installHomes(actual.reference.worldBoundary,[actual]),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,actual.reference.worldBoundary.effectiveTime);assert.equal(lease.executionEnd,actual.reference.endTime);f.advance(.2);f.sync();assert(lease.isCurrent());assert.equal(f.w.nav_intent_retire_actor(r.actorId),1);f.sync();assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);
 }finally{f.close();}
});

test('foreign Home provenance cannot install a route or partially install a mixed association batch',()=>{
 const f=fixture();try{const p=f.prepareHome().proposal;assert.equal(f.commitHome(p),1);f.sync();const b=f.planner.nativeHomeRouteBinding(f.actor),foreign=structuredClone(b);for(const r of [foreign.reference,foreign.preparedReference])for(const s of [r.sourceSettlement.reference,r.sourceSettlement.preparedReference])s.home.x++;
  assert.throws(()=>f.control.installHomes(b.reference.worldBoundary,[b,foreign]),/issued/);assert.throws(()=>f.control.admitHome(p.nativeHome),/obsolete/);assert.throws(()=>f.control.installHomes(b.reference.worldBoundary,[foreign]),/issued/);assert.equal(f.control.installHomes(b.reference.worldBoundary,[b]),1);assert(f.control.admitHome(p.nativeHome).isCurrent());
 }finally{f.close();}
});

test('a late compatible Home origin and actual source baseline preserve only the issued route identity',()=>{
 const f=fixture();let restored;try{const p=f.prepareHome().proposal,lease=f.control.admitHome(p.nativeHome,{preparingWorldBoundary:p.worldBoundary});f.advance(.3);f.sync();const next=f.planner.revalidateNativeHomeRouteProposal(p.ticket);assert.equal(next.status,'revalidated');assert.equal(f.commitHome(next.proposal,p),1);f.sync();const b=f.planner.nativeHomeRouteBinding(f.actor);f.control.installHomes(b.reference.worldBoundary,[b]);assert(lease.isCurrent());assert(lease.executionEpoch>p.startTime);restored=controlFor(f.planner.nativeIntentControlBaseline());assert(restored.admitHome(b.reference).isCurrent());assert.throws(()=>restored.admitSettlement(f.held.reference),/obsolete/);
 }finally{restored?.dispose();f.close();}
});

test('admitted stationary and Home leases read stable ownership without serializing provenance during replay',()=>{
 const f=fixture();try{const held=f.control.admitSettlement(f.held.reference);assert(held.isCurrent());const original=JSON.stringify;let calls=0;try{JSON.stringify=(...args)=>{calls++;return original(...args);};for(let i=0;i<50;i++)assert(held.isCurrent());}finally{JSON.stringify=original;}assert.equal(calls,0,'stationary replay must not serialize the immutable association again');const p=f.prepareHome().proposal,home=f.control.admitHome(p.nativeHome,{preparingWorldBoundary:p.worldBoundary});assert.equal(f.commitHome(p),1);f.sync();const b=f.planner.nativeHomeRouteBinding(f.actor);f.control.installHomes(b.reference.worldBoundary,[b]);assert(home.isCurrent());calls=0;try{JSON.stringify=(...args)=>{calls++;return original(...args);};for(let i=0;i<50;i++){assert(home.isCurrent());assert.equal(held.isCurrent(),false);}}finally{JSON.stringify=original;}assert.equal(calls,0,'Home replay must not serialize the immutable association again');assert.equal(f.w.nav_intent_retire_actor(b.reference.actorId),1);f.sync();assert.equal(home.isCurrent(),false);
 }finally{f.close();}
});

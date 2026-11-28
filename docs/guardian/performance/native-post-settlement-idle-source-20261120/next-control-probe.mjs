import fs from 'node:fs';import assert from 'node:assert/strict';
import {nativeSettledIdleFixture} from '../tests/helpers/native-settled-idle.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
const rows=[];
for(const inside of [true,false]){
 const f=nativeSettledIdleFixture({inside});let c;try{
  f.planner.intentChanges();const b=f.planner.nativeIntentControlBaseline();
  c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingActionRequests:b.pendingActionRequests??[]});
  c.acceptClock({...b.clock,anchorLogicalTime:b.clock.committedThrough,anchorAbsoluteMs:1000},{baseline:true});
  c.installStartedRoutes(b.worldBoundary,b.nativeStartedRoutes??[],{bootstrap:true});c.installActions(b.worldBoundary,b.nativeActions??[],{bootstrap:true});c.installConsequences(b.worldBoundary,b.nativeConsequences??[],{bootstrap:true});c.installSettlements(b.worldBoundary,b.nativeSettlements??[],{bootstrap:true});
  const settlement=c.admitSettlement(f.settlement.reference);assert(settlement.isCurrent());const p=inside?f.planner.prepareNativeIdleCycleProposal(f.actor):f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed');
  let prepared=false,error=null;try{const lease=inside?c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary}):c.admitStroll(p.proposal.nativeIdleStroll,{preparingWorldBoundary:p.proposal.worldBoundary});prepared=lease.isPrepared();}catch(e){error=String(e.message);}
  assert(!prepared);assert(error);assert(!error.includes('is not a function'));assert(settlement.isCurrent());rows.push({kind:inside?21:22,source:'actual acquired17 in original native control baseline',native:p.status,prepared,error,settlementStillCurrent:settlement.isCurrent(),scope:'Diagnostic of pending consumer admission only. No renderer, hardware fence or production change.'});
 }finally{c?.dispose();f.close();}
}
fs.writeFileSync('.cache/native-settled-idle-next-control-probe.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));

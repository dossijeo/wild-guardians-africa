import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {copyNativeTaskActionReference as action,nativeTaskActionReferenceFromProposal} from '../src/world/native-task-action-presentation.js';
import {copyNativeTaskConsequenceReference as consequence} from '../src/world/native-task-consequence.js';
import {copyNativeTaskSettlementReference as settlement,sameNativeTaskSettlementReference} from '../src/world/native-task-settlement.js';

function frozenTree(value){if(value&&typeof value==='object'){assert(Object.isFrozen(value));for(const child of Object.values(value))frozenTree(child);}}
function freezeTree(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freezeTree(child);Object.freeze(value);}return value;}
function references(){const f=nativeTaskSettlementFixture();try{const p=f.prepareSettlement();assert.equal(p.status,'proposed');const r=p.proposal.nativeSettlement;return {settlement:r,consequence:r.sourceCarry.reference,action:r.sourceCarry.reference.sourceAction.reference};}finally{f.close();}}

for(const [kind,copy,mutate]of [['action',action,r=>r.radius=0],['consequence',consequence,r=>r.expectedRouteHandle.generation=0],['settlement',settlement,r=>r.pose.radius=0]]){
 test(kind+' reuses only its own deeply immutable validated output',()=>{
  const r=copy(references()[kind]);frozenTree(r);assert.equal(copy(r),r);
  const wire=structuredClone(r),a=copy(wire),b=copy(wire);assert.notEqual(a,wire);assert.notEqual(a,b);assert.deepEqual(a,r);frozenTree(a);
  mutate(wire);assert.throws(()=>copy(wire));assert.equal(copy(a),a);
  const foreign=freezeTree(structuredClone(r));assert.notEqual(copy(foreign),foreign);
  const bad=structuredClone(r);mutate(bad);assert.throws(()=>copy(freezeTree(bad)));
  const shallow=Object.freeze(structuredClone(r));copy(shallow);
  if(kind==='action')shallow.origin.x=Infinity;else if(kind==='consequence')shallow.destination.x=Infinity;else shallow.pose.x=Infinity;
  assert.throws(()=>copy(shallow));
 });
}
test('settlement canonical equality still validates clones and compares the complete source',()=>{
 const r=settlement(references().settlement),wire=Object.fromEntries(Object.entries(structuredClone(r)).reverse());assert(sameNativeTaskSettlementReference(r,wire));
 const changed=structuredClone(r);changed.pose.yaw+=.1;assert(!sameNativeTaskSettlementReference(r,settlement(changed)));
 changed.pose.radius=0;assert(!sameNativeTaskSettlementReference(changed,changed));assert(!sameNativeTaskSettlementReference(r,freezeTree(changed)));
});
test('action proposal intermediate cannot bypass float32 representability validation',()=>{
 const r=action(references().action),w=r.worldBoundary;
 const proposal={...r,kind:'native-task-action-proposal',ticket:{kind:'native-task-action-proposal-ticket',authorityEpoch:w.authorityEpoch,session:w.nativeSession,ticket:w.ticket},origin:{x:1e100,z:r.origin.z},authorizedAutonomy:false,authorizedConsequences:false};
 assert.throws(()=>nativeTaskActionReferenceFromProposal(proposal),/representable/);
});

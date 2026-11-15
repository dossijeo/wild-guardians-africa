import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';

// Actual native source and MessagePorts; GPU ACKs are explicit doubles. Only
// the hardware consumer may certify its retained packet and submitted drain.
function fixture({ack=value=>value}={}){
 const native=nativeTaskSettlementFixture(),{port1,port2}=new MessageChannel(),errors=[],messages=[];let quiesce=null;
 port2.onmessage=({data:m})=>{messages.push(m);if(m.type==='IntentControlClosed'||m.type==='IntentMutationRelease')return;
  if(m.type==='IntentMutationQuiesce'){quiesce=m;port2.postMessage(ack({...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:1,nativeTaskSettlementVersion:1}));return;}
  if(m.type==='IntentClock'){port2.postMessage({...m,type:'intent-clock-applied',accepted:true});return;}
  port2.postMessage({type:'intent-control-applied',session:m.session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,...(m.clock?{clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough}:{})});
 };
 const publication=createNativeIntentControlPublication({port:port1,session:'settlement-publication',observe:callbacks=>native.planner.observeNativeIntentControl(callbacks),onError:e=>errors.push(e)});
 return {...native,publication,messages,errors,get quiesce(){return quiesce;},close(){publication.dispose();port2.close();native.close();}};
}

test('only the exact stationary consumer ACK can yield a receipt and release the actual native association',async()=>{
 const f=fixture();try{await f.publication.ready;const p=f.prepareSettlement().proposal,r=p.nativeSettlement;assert.throws(()=>f.publication.quiesceGpuForMutation({preparedWorldBoundary:p.worldBoundary,preparedTaskSettlementTemplate:r,preparedTaskConsequenceTemplate:r.sourceCarry.reference}),/Conflicting/);const receipt=await f.publication.quiesceGpuForMutation({preparedWorldBoundary:p.worldBoundary,preparedTaskSettlementTemplate:r});assert.equal(receipt.nativeTaskSettlementVersion,1);assert.deepEqual(receipt.preparedTaskSettlementTemplate,r);assert.equal(f.quiesce.preparedTaskConsequenceTemplate,undefined);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);
  assert.equal(f.commitSettlement(p),1);f.planner.commitNativeCausalClock();const proof=f.planner.nativeTaskSettlementBinding(f.actor),foreign=structuredClone(proof);foreign.reference.pose.yaw+=.1;foreign.preparedReference.pose.yaw+=.1;const release={committed:true,worldBoundary:proof.reference.worldBoundary,nativeSettlements:[proof]};assert.throws(()=>f.publication.releaseGpuAfterMutation(receipt,{...release,nativeSettlements:[foreign]}),/retained template/);assert.throws(()=>f.publication.releaseGpuAfterMutation(receipt,{...release,nativeSettlements:[proof,proof]}),/authority boundary/);assert(f.publication.releaseGpuAfterMutation(receipt,release));await new Promise(resolve=>setTimeout(resolve,5));const message=f.messages.findLast(m=>m.type==='IntentMutationRelease');assert.deepEqual(message.nativeSettlements,[proof]);assert.equal(message.nativeConsequences,undefined);assert.equal(f.publication.status().closed,false);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

for(const wrong of ['version','template','frame'])test(`a consumer ACK with an incorrect stationary ${wrong} cannot mint source admission`,async()=>{
 const f=fixture({ack:value=>{if(wrong==='version')delete value.nativeTaskSettlementVersion;else if(wrong==='frame')value.preparedFrameSequence=0;else{value.preparedTaskSettlementTemplate=structuredClone(value.preparedTaskSettlementTemplate);value.preparedTaskSettlementTemplate.pose.yaw+=.1;}return value;}});
 try{await f.publication.ready;const p=f.prepareSettlement().proposal;await assert.rejects(f.publication.quiesceGpuForMutation({preparedWorldBoundary:p.worldBoundary,preparedTaskSettlementTemplate:p.nativeSettlement}),/Invalid native mutation fence acknowledgement/);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert(f.planner.nativeTaskConsequenceBinding(f.actor));assert.equal(f.state.crates[0].delivered,false);assert.equal(f.errors.length,1);assert.equal(f.publication.status().closed,true);}finally{f.close();}
});

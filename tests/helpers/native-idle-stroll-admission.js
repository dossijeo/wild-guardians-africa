import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';
import {createNativeResourcePreparationConnection} from '../../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../../src/rendering/native-resource-preparation-receiver.js';

const flush=()=>new Promise(r=>setImmediate(r));
// Actual source, direct control and two transports. Retained resource and
// queue-drain receipts are deterministic doubles, not graphical22 evidence.
export async function strollAdmissionProtocol(f,{onPrepare=()=>{},prepareStopResources=null,onDrain=()=>{},onCommit=()=>{},receipt=m=>m,template=r=>r.nativeIdleStroll}={}){
 const session='idle-stroll-admission',{port1,port2}=new MessageChannel(),resourcePorts=new MessageChannel(),requests=[],errors=[];
 let preparations=0,commits=0,aborts=0,refreshes=0,resolveReleased,source;
 const released=new Promise(resolve=>{resolveReleased=resolve;});
 port2.onmessage=async({data:m})=>{try{
  if(m.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
  else if(m.type==='IntentClock')port2.postMessage({type:'intent-clock-applied',session,authorityEpoch:m.authorityEpoch,clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
  else if(m.type==='IntentMutationQuiesce'){requests.push(m);await onDrain(m);port2.postMessage(receipt({...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:1,nativeIdleStrollVersion:1}));}
  else if(m.type==='IntentMutationRelease'){requests.push(m);if(m.committed&&m.nativeStrolls?.length)f.c.installStrolls(m.worldBoundary,m.nativeStrolls);if(m.committed&&m.nativeSuspendedBodies?.length)f.c.installSuspendedBodies(m.worldBoundary,m.nativeSuspendedBodies);resolveReleased(m);}
  else if(m.type!=='IntentControlClosed')port2.postMessage({type:'intent-control-applied',session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
 }catch(error){errors.push(error.message);source?.dispose('test-consumer-error');resolveReleased(m);}};
 source=createNativeIntentControlPublication({port:port1,session,observe:f.planner.observeNativeIntentControl,onError:e=>errors.push(e.message),timeoutMs:2000});
 const endpoint=attachNativeResourcePreparationEndpoint({port:resourcePorts.port2,session:'stroll-resources',isRunning:()=>true,async prepare(kind,initial,options){
  assert.equal(kind,'prepareNativeIdleStrollResources');let resources=initial,ready=true,committed=false;const lease=f.c.admitStroll(resources.nativeIdleStroll,{preparingWorldBoundary:resources.worldBoundary});preparations++;await onPrepare(resources,options);
  return {get preparedWorldBoundary(){return resources.worldBoundary;},get preparedIdleStrollTemplate(){return template(resources);},valid:()=>ready&&lease.isPrepared(),invalidate(){ready=false;return true;},refresh(next){refreshes++;resources=next;ready=true;return true;},commit(value){commits++;committed=true;onCommit(value);return true;},abort(){if(!committed)aborts++;}};
 }});
 const connection=createNativeResourcePreparationConnection({port:resourcePorts.port1,session:'stroll-resources',timeoutMs:2000});await Promise.all([source.ready,connection.ready]);
 return {source,connection,requests,errors,released,endpointStatus:()=>endpoint.status(),sendResource:message=>resourcePorts.port1.postMessage({...message,session:'stroll-resources'}),counters:()=>({preparations,commits,aborts,refreshes}),run(signal){return f.planner.startNativeIdleStrollAfterGpuQuiescence({actorId:f.actor,getPublication:()=>source,prepareResources:({resources,signal})=>connection.prepareNativeIdleStrollResources(resources,{signal}),signal});},stop(signal){return f.planner.stopNativeIdleStrollAfterGpuQuiescence({actorId:f.actor,getPublication:()=>source,prepareResources:prepareStopResources,signal});},async close(){connection.dispose();endpoint.dispose();source.dispose();port2.close();await flush();}};
}

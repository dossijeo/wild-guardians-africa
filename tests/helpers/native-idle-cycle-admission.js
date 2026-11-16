import {nativeResourceAdmissionProfile} from '../../src/world/native-resource-admission-profiles.js';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';
import {createNativeResourcePreparationConnection} from '../../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../../src/rendering/native-resource-preparation-receiver.js';

const flush=()=>new Promise(r=>setImmediate(r));
// Actual source/publication and both transports; retained GPU and drain receipts
// are deterministic doubles. This helper does not render a graphical21 frame.
export async function idleCycleAdmissionProtocol(f,{onPrepare=()=>{},onDrain=()=>{},onCommit=()=>{},receipt=m=>m,release=m=>m,admit=null,onRelease=()=>{},kind='idle-cycle'}={}){
 const task=kind==='task-start',home=kind==='home-route',profile=nativeResourceAdmissionProfile(kind),prepareMethod=task?'prepareNativeTaskStartResources':home?'prepareNativeHomeRouteResources':'prepareNativeIdleCycleResources',invoke=task?'startNativeTaskRouteAfterGpuQuiescence':home?'startNativeHomeRouteAfterGpuQuiescence':'startNativeIdleCycleAfterGpuQuiescence';
 const session='idle-cycle-admission',{port1,port2}=new MessageChannel(),resourcePorts=new MessageChannel(),requests=[],errors=[];
 let preparations=0,commits=0,aborts=0,refreshes=0,resolveReleased;
 const released=new Promise(resolve=>{resolveReleased=resolve;});
 port2.onmessage=async({data:m})=>{
  if(m.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
  else if(m.type==='IntentClock')port2.postMessage({type:'intent-clock-applied',session,authorityEpoch:m.authorityEpoch,clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
  else if(m.type==='IntentMutationQuiesce'){
   requests.push(m);await onDrain(m);
   port2.postMessage(receipt({...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:1,[task?'nativeTaskStartVersion':home?'nativeHomeRouteVersion':'nativeIdleCycleVersion']:1}));
  }else if(m.type==='IntentMutationRelease'){requests.push(release(m));onRelease(m);resolveReleased(m);}
  else if(m.type!=='IntentControlClosed')port2.postMessage({type:'intent-control-applied',session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
 };
 const source=createNativeIntentControlPublication({port:port1,session,observe:f.planner.observeNativeIntentControl,onError:e=>errors.push(e.message),timeoutMs:2000});
 const endpoint=attachNativeResourcePreparationEndpoint({port:resourcePorts.port2,session:'cycle-resources',isRunning:()=>true,
  async prepare(kind,resources,options){
   assert.equal(kind,prepareMethod);const lease=admit?.(resources);preparations++;await onPrepare(resources,options);
   return {get preparedWorldBoundary(){return resources.worldBoundary;},get [profile.templateField](){return profile.reference(resources);},valid:()=>!lease||lease.isPrepared(),
    invalidate(){return true;},refresh(next){refreshes++;resources=next;return true;},
    commit(value){commits++;onCommit(value);return true;},abort(){aborts++;}};
  }
 });
 const connection=createNativeResourcePreparationConnection({port:resourcePorts.port1,session:'cycle-resources',timeoutMs:2000});
 await Promise.all([source.ready,connection.ready]);
 return {source,connection,requests,errors,released,counters:()=>({preparations,commits,aborts,refreshes}),
  run(signal){return f.planner[invoke]({actorId:f.actor,...(task?{request:f.planner.pendingTaskRoute(f.actor),policy:{bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase}}:{}),getPublication:()=>source,prepareResources:({resources,signal,deferredStart})=>connection[prepareMethod](resources,{signal,deferredStart}),signal});},
  async close(){connection.dispose();endpoint.dispose();source.dispose();port2.close();await flush();}
 };
}

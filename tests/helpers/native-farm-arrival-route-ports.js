import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {nativeFarmArrivalRouteFixture} from './native-farm-arrival-route.js';
import {createNativeRouteControl} from '../../src/rendering/native-route-control.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';
import {createNativeResourcePreparationConnection} from '../../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../../src/rendering/native-resource-preparation-receiver.js';

const flush=()=>new Promise(r=>setImmediate(r));
export function controlledNativeFarmArrival(options={}){
 const f=nativeFarmArrivalRouteFixture(options);let c,detach;try{
  detach=f.planner.observeNativeIntentControl({onBaseline(b){c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingFarmArrivalRequests:b.pendingFarmArrivalRequests??[]});c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});},onChanges(events){for(const e of events)c.accept(e);},onClock(r){const old=c.status().clock;c.acceptClock({...r,anchorAbsoluteMs:r.reanchor?1000:old.anchorAbsoluteMs,anchorLogicalTime:r.reanchor?r.committedThrough:old.anchorLogicalTime});}});
  return {...f,c,advance(dt){f.move(dt);f.planner.flushNativeIntentControl();},close(){detach?.();c?.dispose();f.close();}};
 }catch(error){detach?.();c?.dispose();f.close();throw error;}
}

// Actual native owner, direct control, publication and two MessageChannels.
// Resource handle and GPU-drain ACK are explicit doubles, not GPU acceptance.
export async function farmArrivalAdmissionProtocol(f,{onPrepare=()=>{},onDrain=()=>{},receipt=m=>m,template=r=>r.nativeFarmArrival}={}){
 const session='farm23-admission',{port1,port2}=new MessageChannel(),resources=new MessageChannel(),requests=[],responses=[],errors=[];let source,preparations=0,commits=0,aborts=0,refreshes=0,resolveReleased;
 const post=resources.port2.postMessage.bind(resources.port2);resources.port2.postMessage=m=>{responses.push(structuredClone(m));post(m);};
 const released=new Promise(resolve=>resolveReleased=resolve);
 port2.onmessage=async({data:m})=>{try{
  if(m.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
  else if(m.type==='IntentClock')port2.postMessage({type:'intent-clock-applied',session,authorityEpoch:m.authorityEpoch,clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
  else if(m.type==='IntentMutationQuiesce'){requests.push(m);await onDrain(m);port2.postMessage(receipt({...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:1,nativeFarmArrivalVersion:1}));}
  else if(m.type==='IntentMutationRelease'){requests.push(m);if(m.committed&&m.nativeFarmArrivals?.length)f.c.installFarmArrivals(m.worldBoundary,m.nativeFarmArrivals);resolveReleased(m);}
  else if(m.type!=='IntentControlClosed')port2.postMessage({type:'intent-control-applied',session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
 }catch(error){errors.push(error.message);source?.dispose('test-consumer-error');resolveReleased(m);}};
 source=createNativeIntentControlPublication({port:port1,session,observe:f.planner.observeNativeIntentControl,onError:e=>errors.push(e.message),timeoutMs:1000});
 const endpoint=attachNativeResourcePreparationEndpoint({port:resources.port2,session:'farm23-resources',isRunning:()=>true,async prepare(kind,initial,options){
  assert.equal(kind,'prepareNativeFarmArrivalResources');assert.equal(options.deferredStart,true);let current=initial,ready=true,committed=false;const lease=f.c.admitFarmArrival(current.nativeFarmArrival,{preparingWorldBoundary:current.worldBoundary});preparations++;await onPrepare(current,options);
  return {get preparedWorldBoundary(){return current.worldBoundary;},get preparedFarmArrivalTemplate(){return template(current);},valid:()=>ready&&lease.isPrepared(),invalidate(){ready=false;return true;},refresh(next){refreshes++;current=next;ready=true;return true;},commit(){commits++;committed=true;return true;},abort(){if(!committed)aborts++;}};
 }});
 const connection=createNativeResourcePreparationConnection({port:resources.port1,session:'farm23-resources',timeoutMs:1000});await Promise.all([source.ready,connection.ready]);
 return {source,connection,requests,responses,errors,released,endpointStatus:()=>endpoint.status(),sendResource:m=>resources.port1.postMessage({...m,session:'farm23-resources'}),counters:()=>({preparations,commits,aborts,refreshes}),run({signal,urgent=false}={}){return f.planner.startNativeFarmArrivalAfterGpuQuiescence({actorId:f.actor,urgent,getPublication:()=>source,prepareResources:({resources,signal})=>connection.prepareNativeFarmArrivalResources(resources,{signal}),signal});},async close(){connection.dispose();endpoint.dispose();source.dispose();port2.close();await flush();}};
}

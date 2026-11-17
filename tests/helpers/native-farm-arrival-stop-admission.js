import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {controlledNativeFarmArrival} from './native-farm-arrival-control.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
// Genuine native source, direct controller and publication/MessagePort. Resource
// handles and queue completion are doubles; no graphical24 receipt is claimed.
export async function farmStopAdmission({onPrepare=()=>{},onDrain=()=>{},receipt=m=>m,handle=h=>h,release=m=>m,releaseInput=v=>v,...options}={}){
 const f=controlledNativeFarmArrival({peer:true,...options}),{port1,port2}=new MessageChannel(),messages=[],errors=[];let source,prepared=null,committed=null,preparations=0,commits=0,aborts=0;
 try{
  port2.onmessage=async({data:m})=>{try{
   messages.push(m);
   if(m.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session:'farm24-admission',authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
   else if(m.type==='IntentClock')port2.postMessage({type:'intent-clock-applied',session:'farm24-admission',authorityEpoch:m.authorityEpoch,clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
   else if(m.type==='IntentMutationQuiesce'){await onDrain(f,m);port2.postMessage(receipt({...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:1,nativeFarmArrivalStopVersion:1}));}
   else if(m.type==='IntentMutationRelease'){const value=release(m);if(value.committed&&value.nativeFarmArrivalStops?.length)f.c.installFarmArrivalStops(value.worldBoundary,value.nativeFarmArrivalStops);}
   else if(m.type!=='IntentControlClosed')port2.postMessage({type:'intent-control-applied',session:'farm24-admission',authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
  }catch(error){errors.push(error.message);source?.dispose('test-consumer-error');}};
  source=createNativeIntentControlPublication({port:port1,session:'farm24-admission',observe:f.planner.observeNativeIntentControl,onError:e=>errors.push(e.message),timeoutMs:1000});await source.ready;
  const originalRelease=source.releaseGpuAfterMutation;source.releaseGpuAfterMutation=(receipt,value)=>originalRelease(receipt,releaseInput(value,f));
  const route=f.prepare(true),binding=f.commit(route);f.c.installFarmArrivals(binding.reference.worldBoundary,[binding]);f.advance(.12);f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);for(let i=0;i<12;i++)await flush();
  const prepareResources=async request=>{preparations++;prepared=request.resources;assert.equal(prepared.kind,24);assert.equal(prepared.chunks.length,0);const lease=f.c.admitFarmArrivalStop(prepared.nativeStop,{preparingWorldBoundary:prepared.worldBoundary});let done=false;await onPrepare(f,request);
   return handle({preparedWorldBoundary:prepared.worldBoundary,preparedFarmArrivalStopTemplate:prepared.nativeStop,valid:()=>!done&&lease.isPrepared(),commit(value){commits++;committed=value;done=true;return true;},abort(){if(!done){aborts++;done=true;}}});};
  return {...f,source,binding,messages,errors,get prepared(){return prepared;},get committed(){return committed;},counters:()=>({preparations,commits,aborts}),run({signal=null,generic=false}={}){return generic?f.planner.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation:{type:'stopFarmArrival',binding},prepareResources,signal}):f.planner.stopNativeFarmArrivalAfterGpuQuiescence({actorId:f.actor,getPublication:()=>source,prepareResources,signal});},async waitRelease(){for(let i=0;i<80;i++){await flush();const m=messages.findLast(m=>m.type==='IntentMutationRelease');if(m)return m;}return null;},async close(){source.dispose();port2.close();await flush();f.close();}};
 }catch(error){source?.dispose();port2.close();f.close();throw error;}
}

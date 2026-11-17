import {nativeFarmArrivalRouteFixture as fixture} from './native-farm-arrival-route.js';
import {pair,fixture as graphicsFixture,preparedWorldDraw,flush} from './remote-webgpu-fixture.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';
import {captureNativeRoutePickFrame} from '../../src/rendering/native-route-pick-frame.js';

// Original native source/control/client/Host; deterministic GPU double only.
export async function setup({capability=true,stopCapabilities=false,...options}={}){
 const f=fixture({peer:true,...options}),[sourcePort,drawPort]=pair(),errors=[];let g,source;
 try{g=await graphicsFixture({capabilities:{width:20,height:10,format:'rgba8unorm',...(capability?{nativeFarmArrivalVersion:1}:{}),...(stopCapabilities?{nativeFarmArrivalStopVersion:1,nativeFarmArrivalStopClockVersion:1}:{})}},{intentControl:{port:drawPort,session:'farm23-remote'},absoluteNow:()=>Number.MAX_SAFE_INTEGER});source=createNativeIntentControlPublication({port:sourcePort,session:'farm23-remote',observe:f.planner.observeNativeIntentControl,timeoutMs:1000,onError:e=>errors.push(e.message)});await source.ready;
  return {...f,...g,source,sourcePort,drawPort,sourceErrors:errors,clock:{version:1,epoch:0,elapsed:f.state.elapsed,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:true,segments:[]},advance(dt){f.move(dt);f.planner.flushNativeIntentControl();},async close(){source?.dispose();g?.client.dispose();await g?.host.dispose();f.close();}};
 }catch(error){source?.dispose();g?.client.dispose();await g?.host.dispose();f.close();throw error;}
}
export function admit(f,{mode='exact',urgent=false,afterReady=()=>{},signal=null}={}){
 let prepared=null,reference=null;const quiesce=f.source.quiesceGpuForMutation;
 f.source.quiesceGpuForMutation=async options=>{const r=await quiesce(options);if(mode==='late')f.advance(.02);return r;};
 if(mode==='missing-release'){const release=f.source.releaseGpuAfterMutation;f.source.releaseGpuAfterMutation=(r,data)=>release(r,{...data,nativeFarmArrivals:[]});}
 const promise=f.planner.startNativeFarmArrivalAfterGpuQuiescence({actorId:f.actor,urgent,signal,getPublication:()=>f.source,prepareResources:async({resources,proposedWorldBoundary,signal})=>{
  reference=resources.nativeFarmArrival;if(mode==='foreign-source'){reference=structuredClone(reference);reference.sourceRequest.pose.yaw+=.1;}
  if(mode!=='missing-relative')f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:reference.worldBoundary.effectiveTime+(mode==='wrong-epoch'?.1:0),nativeFarmArrival:reference});
  f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'origin-modulo',period:2.5,epoch:reference.worldBoundary.effectiveTime,nativeFarmArrival:reference});
  prepared=await preparedWorldDraw({...f,...(mode==='missing-template'?{}:{farmArrivalTemplate:reference})},proposedWorldBoundary,77,signal);if(mode==='late')f.advance(.3);await afterReady();return {preparedWorldBoundary:prepared.preparedWorldBoundary,preparedFarmArrivalTemplate:reference,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary,data.nativeFarmArrivalBinding),abort:prepared.abort};
 }});
 return {promise,get prepared(){return prepared;},get reference(){return reference;}};
}
export async function present(f,preparation){await flush();await f.host.idle();f.host.present();await preparation.prepared.presented;return captureNativeRoutePickFrame(f.host.inspect());}

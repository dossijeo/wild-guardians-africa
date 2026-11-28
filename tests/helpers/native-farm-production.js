import assert from 'node:assert/strict';import {MessageChannel} from 'node:worker_threads';
import {controlledNativeFarmArrival} from './native-farm-arrival-route-ports.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';
import {createNativeResourcePreparationConnection} from '../../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../../src/rendering/native-resource-preparation-receiver.js';
import {createNativeIntentProduction} from '../../src/simulation/native-intent-production.js';
import {createPlant} from '../../src/simulation/crops.js';import {tick} from '../../src/simulation/game.js';

const flush=()=>new Promise(r=>setImmediate(r));
export async function untilFarmProduction(predicate){for(let i=0;i<400&&!predicate();i++)await flush();assert(predicate(),'Expected native Farm production boundary');}

// Real source, Game, controller, producer and two ports from pending13 through
// 23 and21/22. Retained resources, prepared frame and GPU drain ACK are doubles.
export async function nativeFarmProduction({approach=false,onPrepare=()=>{},...options}={}){
 const f=controlledNativeFarmArrival({...options,configureState(state,c){const crop=createPlant('plant-900098','mijo',c.target.x-(approach?5:0),c.target.z,state.workers[0].centerId);crop.water[0].status='manual';state.plants.push(crop);options.configureState?.(state,c);}}),{port1,port2}=new MessageChannel(),resources=new MessageChannel(),records=[],releases=[],errors=[];let source,connection,endpoint,producer,closed=false;
 try{
  const session='farm-production';port2.onmessage=({data:m})=>{try{
   if(m.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
   else if(m.type==='IntentClock')port2.postMessage({type:'intent-clock-applied',session,authorityEpoch:m.authorityEpoch,clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
   else if(m.type==='IntentMutationQuiesce')port2.postMessage({...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:records.length,nativeFarmArrivalVersion:1,nativeIdleCycleVersion:1,nativeIdleStrollVersion:1});
   else if(m.type==='IntentMutationRelease'){
    if(m.committed){if(m.nativeFarmArrivals?.length)f.c.installFarmArrivals(m.worldBoundary,m.nativeFarmArrivals);if(m.nativeIdleCycles?.length)f.c.installIdleCycles(m.worldBoundary,m.nativeIdleCycles);if(m.nativeStrolls?.length)f.c.installStrolls(m.worldBoundary,m.nativeStrolls);}releases.push(m);
   }else if(m.type!=='IntentControlClosed')port2.postMessage({type:'intent-control-applied',session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
  }catch(e){errors.push(e.message);source?.dispose('fixture-consumer-error');}};
  source=createNativeIntentControlPublication({port:port1,session,observe:f.planner.observeNativeIntentControl,onError:e=>errors.push(e.message),timeoutMs:2000});
  const status=source.status;source.status=()=>{const s=status();return {...s,coherent:s.sentSequence===s.appliedSequence&&s.clockSequence===s.appliedClockSequence};};
  endpoint=attachNativeResourcePreparationEndpoint({port:resources.port2,session:'farm-production-resources',isRunning:()=>true,async prepare(method,initial,options){
   const config={prepareNativeFarmArrivalResources:['nativeFarmArrival','preparedFarmArrivalTemplate','admitFarmArrival'],prepareNativeIdleCycleResources:['nativeIdleCycle','preparedIdleCycleTemplate','admitIdleCycle'],prepareNativeIdleStrollResources:['nativeIdleStroll','preparedIdleStrollTemplate','admitStroll']}[method];assert(config,method);assert.equal(options.deferredStart,true);
   const [field,getter,admit]=config,record={method,initial,options,committed:false,aborted:false};records.push(record);let current=initial,valid=true;const lease=f.c[admit](current[field],{preparingWorldBoundary:current.worldBoundary});await onPrepare(record,f);
   return {get preparedWorldBoundary(){return current.worldBoundary;},get [getter](){return current[field];},valid:()=>valid&&lease.isPrepared(),invalidate(){valid=false;return true;},refresh(next){current=next;valid=true;return true;},commit(){record.committed=true;return true;},abort(){record.aborted=true;}};
  }});
  connection=createNativeResourcePreparationConnection({port:resources.port1,session:'farm-production-resources',timeoutMs:2000});await Promise.all([source.ready,connection.ready]);await untilFarmProduction(()=>source.status().coherent);
  producer=createNativeIntentProduction({state:f.state,planner:f.planner,bodyId:()=>1,getPublication:()=>source,getResources:()=>connection,publicationSequence:()=>1+releases.length,terrainManifest:()=>({epoch:'explicit-cpu-fixture',chunks:[]}),onError:e=>errors.push(e.message)});
  return {...f,source,connection,records,releases,errors,producer,async produce(){await untilFarmProduction(()=>source.status().coherent);const before=releases.length,r=await producer.wake();await untilFarmProduction(()=>!source.status().pendingMutationHold&&(r?.status!=='committed'||releases.length>before)&&!connection.status().pending&&!connection.status().retained);await flush();return r;},step(dt=.01){tick(f.state,dt,f.nav);f.planner.flushNativeIntentControl();},async close(){if(closed)return;closed=true;producer?.dispose();connection?.dispose();endpoint?.dispose();source?.dispose();port2.close();await flush();f.close();}};
 }catch(e){producer?.dispose();connection?.dispose();endpoint?.dispose();source?.dispose();port2.close();f.close();throw e;}
}

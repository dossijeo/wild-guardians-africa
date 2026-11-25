import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeWorkerGraphicsFixture} from './helpers/native-task-consequence-graphics.js';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';
import {centerServicePoint} from '../src/world/centers.js';
import {nativeFarmArrivalRouteAttestationCovers} from '../src/world/native-farm-arrival-route.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {floorFloat32} from '../src/rendering/float32-time.js';

test('a Farm recovered route requires its original rig and exact first submitted clock',async t=>{
 const origin=nativeFarmArrivalRouteFixture({peer:false}),state=structuredClone(origin.state);
 const worker=state.workers[0],center=state.structures.find(row=>row.id===worker.centerId);
 const service=centerServicePoint(center,state,.8),start={x:-14,z:11.8};
 center.x+=-14-service.x;center.z+=3.2-service.z;
 Object.assign(worker,start);state.villages.find(row=>row.id===worker.villageId).entry=start;
 origin.close();
 const chunkKeys=[...Array.from({length:9},(_,i)=>[i%3-1,Math.floor(i/3)-1].join(',')),'2,-1','2,0','2,1'];
 const f=await nativeProductionAuthority(state,{chunkKeys});
 const ports=new MessageChannel();
 let draw, rig;
 try{
   await untilProduction(f,()=>f.records.some(row=>row.kind==='farm-arrival'&&row.committed));
   f.advance();await f.present();
   const view=f.snapshot(),body=f.host.inspect().nativeRouteFrame.bindings.find(b=>b.nativeFarmArrival);
   assert(body.relativeTime>0);
   f.gpu.device.destroy();f.retireResourceEndpoint();
   const receipt=await f.authority.quiesceNativeIntentProduction();
   assert((await f.authority.flushNativeResourcePreparation({allowRetired:true})).terminal);
   const route=await f.authority.terminalWorkerRoute();
   assert.deepEqual(route,{kind:23,actorId:body.nativeFarmArrival.actorId});
   draw=await fixture({capabilities:{nativeFarmArrivalVersion:1}},{intentControl:{
      port:ports.port2,session:'production-control',recoveryHold:30
   }});
   const {recoveredWorkerRoute:q}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,receipt,route);
   const {execution,resources}=q,ref=resources.nativeFarmArrivalBinding.reference,epoch=ref.worldBoundary.effectiveTime;
   assert.equal(execution.executedThrough,view.elapsed);
   assert(nativeFarmArrivalRouteAttestationCovers(resources.nativeFarmArrivalBinding,body.nativeFarmArrival));
   await assert.rejects(f.authority.checkHeldDraw(30,receipt,route),/Missing submitted/);
   const payloads=new Map();f.authority.publishResidentTerrainForQa(p=>payloads.set(p.cx+','+p.cz,p));
   let selected;
   const actor=view.workers[0].id;
   rig=await nativeWorkerGraphicsFixture({state:view,worker:view.workers[0],actor,session:{core:{
     selectChunk(x,z){selected=payloads.get(x+','+z);assert(selected);},chunkPayload:()=>selected}},close(){}},
     {clips:['Walk_Skip','Idle'],idle:true});
   const source={...q,terrain:rig.terrain,terrainManifest:rig.manifest};
   const options={signal:new AbortController().signal,isCurrent:()=>true,getPickTime:()=>view.elapsed,getPickIdleOffset:()=>0};
   await assert.rejects(async()=>rig.roster.prepareRecoveredWorkerRoute({...source,execution:{...execution,x:execution.x+.01}},options),/Recovery pose/);
   await rig.roster.prepareRecoveredWorkerRoute(source,options);
   assert(rig.roster.nativeRouteCurrent(actor,resources.nativeRoute));
   draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',
     nativeFarmArrival:ref,resourceEnd:nativeClockResourceEnd(epoch,ref.endTime)});
   const frame=draw.frame(77,{nativeWorldBoundary:ref.worldBoundary,
     clock:{version:1,epoch:1,elapsed:view.elapsed,safeUntil:view.elapsed,anchorAbsoluteMs:0,paused:true,segments:[]}});
   await flush();await draw.host.idle();draw.host.present();await frame;
   const checked=await f.authority.checkHeldDraw(30,receipt,route);
   assert.equal(checked.relativeTime,floorFloat32(view.elapsed-epoch));
   assert.equal(checked.kind,23);
   assert.deepEqual(checked.nativeFarmArrival,ref);
   t.diagnostic(JSON.stringify({at:view.elapsed,age:checked.relativeTime,route:resources.nativeRoute,body:ref.bodyId}));
 }finally{rig?.close();draw?.client.dispose();await draw?.host.dispose();ports.port1.close();ports.port2.close();await f.close();}
});

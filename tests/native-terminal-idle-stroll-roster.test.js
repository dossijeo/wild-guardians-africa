import assert from 'node:assert/strict';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {nativeWorkerGraphicsFixture} from './helpers/native-task-consequence-graphics.js';
import {fixture} from './helpers/remote-webgpu-fixture.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';

for(const cancel of [false,true])test(cancel?'replayed Idle22 rechecks cancellation after historical admission':'fresh recovered Idle22 adopts its original Walk rig after an in-flight historical preparation', async()=>{
 const state=nativeIdleStrollGameSave().state;
 const f=await nativeProductionAuthority(state);
 let replacement,rig,openAdmission;
 const ports=new MessageChannel();
 try{
   await untilProduction(f,()=>f.records.some(r=>r.committed));
   f.command({kind:'resume',reason:'menu'});f.advance();
   const view=f.snapshot(),worker=view.workers[0],actor=worker.id;
   f.gpu.device.destroy();f.retireResourceEndpoint();
   const receipt=await f.authority.quiesceNativeIntentProduction();
   await f.authority.flushNativeResourcePreparation({allowRetired:true});
   const actorNum=await f.authority.terminalIdleStrollActor();
   replacement=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeIdleStrollVersion:1}},
     {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
   const {recoveredStroll}=await f.authority.attachHeldStroll(ports.port1,'production-control',30,receipt,actorNum);
   const payloads=new Map();f.authority.publishResidentTerrainForQa(p=>payloads.set(p.cx+','+p.cz,p));
   let selected;
   const clock=createConfirmedPresentationClock(view.elapsed);
   rig=await nativeWorkerGraphicsFixture({state:view,worker,actor,session:{core:{
     selectChunk(x,z){selected=payloads.get(x+','+z);assert(selected);},chunkPayload:()=>selected}},close(){}},
     {clips:['Walk_Skip','Idle'],idle:true,historicalMotion:{actorIds:[],clock}});
   const root=rig.roster.get(actor).root;
   const controller=new AbortController();
   const options={signal:controller.signal,isCurrent:()=>true,getPickTime:()=>view.elapsed,getPickIdleOffset:()=>0};
   const source={...recoveredStroll,terrain:rig.terrain,terrainManifest:rig.manifest};
   const original=rig.admission.prepareAndPublish.bind(rig.admission);
   let entered,settled=false;
   const order=[];
   const started=new Promise(r=>{entered=r;});
   const held=new Promise(r=>{openAdmission=r;});
   rig.admission.prepareAndPublish=async(object,params,publish)=>{
     rig.admission.prepareAndPublish=(obj,p,pub)=>original(obj,p,()=>{order.push('native');pub();});
     entered();await held;
     return original(object,params,()=>{order.push('historical');publish();});
   };
   rig.roster.setHistoricalActors([actor]);await started;
   assert.equal(rig.roster.get(actor).hasBakedWalking(),true);
   assert.equal(rig.roster.get(actor).isBakedWalking(),true);
   const pending=rig.roster.prepareRecoveredStroll(source,options);
   const settlement=pending.then(value=>({value}),error=>({error})).finally(()=>{settled=true;});
   await new Promise(r=>setImmediate(r));
   if(settled){const early=await settlement;throw early.error??Error('Replayed rig became current ahead of its historical admission');}
   assert.deepEqual(order,[]);
   if(cancel)controller.abort();
   openAdmission();
   const result=await settlement;
   if(cancel){
     assert.equal(result.error?.name,'AbortError');assert.deepEqual(order,['historical']);
     assert.equal(rig.roster.status().native,0);
     await rig.roster.prepareRecoveredStroll(source,{...options,signal:new AbortController().signal});
   }else if(result.error)throw result.error;
   assert.deepEqual(order,['historical','native']);
   assert.equal(rig.roster.get(actor).root,root);
   assert(rig.roster.nativeRouteCurrent(actor,source.resources.nativeRoute));
 }finally{
   openAdmission?.();rig?.close();replacement?.client.dispose();await replacement?.host.dispose();
   ports.port1.close();ports.port2.close();await f.close();
 }
});

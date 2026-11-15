import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHomeArrivalRemoteFixture,prepareHomeAbsenceDraw} from './helpers/native-home-arrival-remote.js';
import {flush} from './helpers/remote-webgpu-fixture.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';

async function admit(f,{mode='exact',afterReady=()=>{}}={}){
 let prepared=null,reference=null;const quiesce=f.source.quiesceGpuForMutation;
 if(mode==='late')f.source.quiesceGpuForMutation=async options=>{const r=await quiesce(options);f.native.advance(.02);f.native.planner.projectNativeHomeExecution(f.native.state,f.native.worker);return r;};
 if(mode==='missing-attestation'){const release=f.source.releaseGpuAfterMutation;f.source.releaseGpuAfterMutation=(r,d)=>release(r,{...d,nativeHomeArrivals:[]});}
 const result=await f.native.planner.startNativeHomeArrivalAfterGpuQuiescence({actorId:f.native.actor,getPublication:()=>f.source,prepareResources:async({resources})=>{reference=resources.nativeHomeArrival;prepared=await prepareHomeAbsenceDraw(f,resources,{missingTemplate:mode==='missing-template',stillVisible:mode==='still-visible',optionsGated:mode==='gated-template'});if(mode==='late'){f.native.advance(.3);f.native.planner.projectNativeHomeExecution(f.native.state,f.native.worker);}await afterReady();return {preparedWorldBoundary:prepared.preparedWorldBoundary,preparedHomeArrivalTemplate:reference,valid:prepared.valid,commit:d=>prepared.commit(d.worldBoundary,d.nativeHomeArrivalBinding),abort:prepared.abort};}});
 return {result,prepared,reference};
}

for(const mode of ['exact','late','missing-template','still-visible','missing-attestation','unsupported','gated-template'])test(`Home absence needs its retained template, retired source and no old actor clock (${mode})`,async()=>{
 const f=await nativeHomeArrivalRemoteFixture({supported:mode!=='unsupported'});try{const body=f.native.body(1),{result:r,prepared,reference}=await admit(f,{mode});if(['exact','late'].includes(mode)){assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert.equal(r.receipt.nativeHomeArrivalVersion,1);assert.equal(f.native.body(1),null);assert.equal(f.native.worker.status,'home');assert.equal(f.source.status().closed,false);await flush();f.host.present();await prepared.presented;assert.deepEqual(f.client.requiredNativeWorldBoundary(),r.worldBoundary);const pick=captureNativeRoutePickFrame(f.host.inspect());assert.throws(()=>pick.getHomeTime(reference.sourceHome.reference),/frame|Home|clock/);assert.deepEqual(f.errors,[]);if(mode==='late')assert(r.nativeHomeArrivalBinding.reference.worldBoundary.effectiveTime>reference.worldBoundary.effectiveTime);}else if(mode==='missing-attestation'){assert.equal(r.status,'committed-control-failed');assert.equal(f.native.body(1),null);assert.equal(f.source.status().closed,true);}else{assert.equal(r.status,'control-failed',JSON.stringify({status:r.status,error:r.error}));assert.deepEqual(f.native.body(1),body);assert.equal(f.native.worker.status,'returning');assert(f.native.planner.nativeHomeRouteBinding(f.native.actor));if(mode==='gated-template')assert.match(r.error,/gate graphics are not prepared/);}
 }finally{await f.close();}
});

test('the actual absence ACK waits for the submitted queue drain while the Home endpoint stays owned',async()=>{
 const f=await nativeHomeArrivalRemoteFixture();let release,signal;const ready=new Promise(resolve=>{signal=resolve;});try{const body=f.native.body(1),running=admit(f,{afterReady:()=>{f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{release=resolve;});signal();}});await ready;await flush();assert(release);assert.deepEqual(f.native.body(1),body);assert(f.native.planner.nativeHomeRouteBinding(f.native.actor));f.gpu.device.queue.onSubmittedWorkDone=async()=>{};release();const {result:r,prepared}=await running;assert.equal(r.status,'committed',JSON.stringify(r));assert.equal(f.native.body(1),null);await flush();f.host.present();await prepared.presented;assert.deepEqual(f.errors,[]);
 }finally{release?.();await f.close();}
});


for(const wrong of ['version','template','frame'])test(`a tampered actual Home absence ACK cannot mint admission (${wrong})`,async()=>{
 const f=await nativeHomeArrivalRemoteFixture({ack:m=>{if(m.type!=='intent-mutation-quiesced'||!m.nativeHomeArrivalVersion)return m;m=structuredClone(m);if(wrong==='version')delete m.nativeHomeArrivalVersion;else if(wrong==='frame')m.preparedFrameSequence=0;else m.preparedHomeArrivalTemplate.pose.yaw+=.2;return m;}});try{const body=f.native.body(1),{result:r}=await admit(f);assert.equal(r.status,'control-failed');assert.match(r.error,/acknowledgement/);assert.deepEqual(f.native.body(1),body);assert.equal(f.native.worker.status,'returning');assert.equal(f.source.status().closed,true);}finally{await f.close();}
});

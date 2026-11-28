import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createTemporalRecoveryReceiver} from '../src/rendering/temporal-recovery-receiver.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';
import {nativeRecoveryHost,untilNativeRecovery,recoveryEffects} from './helpers/native-recovery-host.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
function begin(f,kind='markVisualLost',id=30){const n=f.controls.filter(c=>c.kind==='quiesce').length,p=f.send({kind,id,nativeResumeId:id+1});p.catch(()=>{});assert.equal(f.controls.filter(c=>c.kind==='quiesce').length,n+1);return p;}
async function drive(f,p){let done=false;p.finally(()=>{done=true;}).catch(()=>{});for(let i=0;i<15&&!done;i++){await f.pump();await f.tick();}await p;}

test('native commit and an acknowledged later normal checkpoint precede loss detachment',async()=>{
 const f=await nativeRecoveryHost({holdPreparation:true});try{
  await untilNativeRecovery(()=>f.native.records[0]?.packet,()=>f.pump());f.holdAcks();const losing=begin(f);assert.equal(typeof f.initial.onmessage,'function');assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'quiescing');
  f.releasePreparation();await untilNativeRecovery(()=>f.native.records[0].committed,()=>f.pump());await f.pump();await f.tick();await untilNativeRecovery(()=>f.heldAcks.length>0,()=>f.pump());
  assert.equal(f.messages.some(m=>m.kind==='visualRecoveryLost'),false);assert.equal(typeof f.initial.onmessage,'function');assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');
  f.releaseAcks();await losing;await f.send({kind:'prepareVisualRecovery',id:32,nativeResumeId:33});const cp=f.messages.find(m=>m.kind==='visualRecoveryPrepared'&&m.id===32).checkpoint;
  assert(cp.sequence>3);assert.equal(JSON.parse(cp.snapshot).workers[0].nativeRouteAdmission,'native-idle-stroll');assert.deepEqual(cp.terrainCheckpoint.nativeWorldBoundary,f.native.authority.nativeIntentControlStatus().current.worldBoundary);assert.equal(f.commands.filter(c=>c.kind==='snapshot').length,1);assert.equal(f.commands.find(c=>c.sequence===cp.sequence).kind,'advance');assert.equal(f.native.records.length,1);assert.equal(f.controls.filter(c=>c.kind==='quiesce').length,1);
 }finally{await f.dispose();}
});

test('native hold survives retained replay and releases with the reserved identity only at activation',async()=>{
 const f=await nativeRecoveryHost(),channel=new MessageChannel();let receiver;
 try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());await drive(f,begin(f));await f.send({kind:'prepareVisualRecovery',id:32,nativeResumeId:33});const cp=f.messages.find(m=>m.kind==='visualRecoveryPrepared'&&m.id===32).checkpoint,next=f.presentation();
  receiver=createTemporalRecoveryReceiver({port:channel.port2,session:'s',restoreCheckpoint:async value=>{assert.equal(value.sequence,cp.sequence);assert.equal(JSON.parse(value.snapshot).workers[0].nativeRouteAdmission,'native-idle-stroll');return true;},applyBoundary:async()=>true,onError:e=>{throw e;}});
  await f.send({kind:'attachVisualRecovery',id:34,terrainPort:{},presentationPort:next,recoveryPort:channel.port1,retainedCheckpoint:recoveryEffects(cp.sequence,cp.elapsed)});await untilNativeRecovery(()=>f.messages.some(m=>m.kind==='visualRecoveryAttached'&&m.id===34));assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');f.hello(next);
  await f.send({kind:'finishVisualRecoveryConfirmed',id:35});await f.send({kind:'stageRecoveryVisibility',id:36,hidden:false});await f.send({kind:'activateVisualRecovery',id:37});assert(f.messages.some(m=>m.kind==='visualRecoveryActivated'&&m.id===37));assert.deepEqual(f.controls.map(c=>[c.kind,c.id]),[['quiesce',30],['resume',31]]);assert.notEqual(f.native.authority.nativeIntentProductionStatus().phase,'suspended');assert.deepEqual(f.native.faults,[]);
 }finally{receiver?.dispose();channel.port1.close();channel.port2.close();await f.dispose();}
});

test('cancellation while native preparation is pending waits for the real hold then releases it',async()=>{
 const f=await nativeRecoveryHost({holdPreparation:true});try{await untilNativeRecovery(()=>f.native.records[0]?.packet,()=>f.pump());const losing=begin(f),cancelling=f.send({kind:'cancelVisualRecovery',id:32});await turn();assert.equal(f.messages.some(m=>m.kind==='visualRecoveryCancelled'),false);f.releasePreparation();await untilNativeRecovery(()=>f.controls.some(c=>c.kind==='resume'),()=>f.pump());await losing;await cancelling;assert(f.messages.some(m=>m.kind==='visualRecoveryCancelled'&&m.id===32));assert.equal(f.messages.some(m=>m.kind==='visualRecoveryLost'),false);assert.equal(typeof f.initial.onmessage,'function');assert.notEqual(f.native.authority.nativeIntentProductionStatus().phase,'suspended');assert.equal(f.commands.filter(c=>c.kind==='snapshot').length,1);}finally{await f.dispose();}
});

test('missing checkpoint ACK fails explicitly and releases the producer before reporting failure',async()=>{
 const f=await nativeRecoveryHost({timeoutMs:80});try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());f.holdAcks();const losing=begin(f);await f.pump();await f.tick();await losing;assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===30&&/timeout/i.test(m.message)));assert.equal(f.messages.some(m=>m.kind==='visualRecoveryLost'),false);assert.deepEqual(f.controls.map(c=>[c.kind,c.id]),[['quiesce',30],['resume',31]]);assert.notEqual(f.native.authority.nativeIntentProductionStatus().phase,'suspended');assert.equal(typeof f.initial.onmessage,'function');}finally{await f.dispose();}
});

test('an inactive source releases its null hold and keeps the existing loss boundary',async()=>{
 const f=await nativeRecoveryHost({inactive:true});try{const before=f.commands.length;await begin(f);assert.equal(f.commands.length,before);assert.deepEqual(f.controls.map(c=>[c.kind,c.id]),[['quiesce',30],['resume',31]]);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'inactive');assert.equal(f.native.records.length,0);assert(f.messages.some(m=>m.kind==='visualRecoveryLost'));}finally{await f.dispose();}
});

test('direct recovery preparation renews the native checkpoint and cancellation releases its hold',async()=>{
 const f=await nativeRecoveryHost();try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());await drive(f,begin(f,'prepareVisualRecovery'));const cp=f.messages.find(m=>m.kind==='visualRecoveryPrepared'&&m.id===30).checkpoint;assert(cp.sequence>3);assert.equal(typeof f.initial.onmessage,'function');await f.send({kind:'cancelVisualRecovery',id:32});assert(f.messages.some(m=>m.kind==='visualRecoveryCancelled'));assert.deepEqual(f.controls.map(c=>[c.kind,c.id]),[['quiesce',30],['resume',31]]);}finally{await f.dispose();}
});

test('hosted recovery reserves unique rollback IDs from its existing generic allocator',async()=>{
 const sent=[],worker={postMessage:m=>sent.push(m),terminate(){}},runtime=createWorkerHostedRuntime({world:{createConfirmedReceiver:()=>({accept:()=>({accepted:true}),status:()=>({sequence:1,lastElapsed:0})})},session:'s',clientOptions:{snapshot:'{}',chunkKeys:[]},runtimeOptions:{visualRecovery:{enabled:true,work:true}},workerFactory:()=>worker}),receive=data=>worker.onmessage({data:{session:'s',...data}});
 try{const starting=runtime.start({terrainPort:{},presentationPort:{}});receive({kind:'publication',publication:{sequence:1,elapsed:0,events:[]}});receive({kind:'started',sequence:1,status:{}});await starting;const lost=runtime.markVisualLost();lost.catch(()=>{});let m=sent.at(-1);assert.equal(m.nativeResumeId,m.id+1);const firstResume=m.nativeResumeId;receive({kind:'visualRecoveryLost',id:m.id,sequence:1});await lost;const preparing=runtime.prepareVisualRecovery();preparing.catch(()=>{});m=sent.at(-1);assert(m.id>firstResume);assert.equal(m.nativeResumeId,m.id+1);receive({kind:'visualRecoveryPrepared',id:m.id,checkpoint:{sequence:1}});await preparing;}finally{runtime.dispose();}
});

test('a second recovery and external native controls cannot steal the pending recovery hold',async()=>{
 const f=await nativeRecoveryHost({holdPreparation:true});try{await untilNativeRecovery(()=>f.native.records[0]?.packet,()=>f.pump());const losing=begin(f);await f.send({kind:'markVisualLost',id:40,nativeResumeId:41});await f.send({kind:'prepareVisualRecovery',id:42,nativeResumeId:43});await f.send({kind:'quiesceNativeIntentProduction',id:44});let closed=0;const port={postMessage(){},close(){closed++;}};await f.send({kind:'attachNativeResourcePreparation',id:45,port});assert.equal(closed,1);await f.send({kind:'attachNativeIntentControl',id:46,port});assert.equal(closed,2);
  assert.equal(f.controls.length,1);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'quiescing');assert.equal(typeof f.initial.onmessage,'function');assert(f.messages.some(m=>m.kind==='nativeIntentProductionControlError'&&m.id===44));f.releasePreparation();await drive(f,losing);assert(f.messages.some(m=>m.kind==='visualRecoveryLost'&&m.id===30));
 }finally{await f.dispose();}
});

test('invalid rollback identity is rejected before acquiring a real native hold',async()=>{
 const f=await nativeRecoveryHost();try{await f.send({kind:'markVisualLost',id:30,nativeResumeId:30});assert.equal(f.controls.length,0);assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&/identity/.test(m.message)));assert.equal(typeof f.initial.onmessage,'function');}finally{await f.dispose();}
});

test('disposal while acquiring the hold emits no late loss or preparation success',async()=>{
 const f=await nativeRecoveryHost({holdPreparation:true});let disposed=false;try{await untilNativeRecovery(()=>f.native.records[0]?.packet,()=>f.pump());const losing=begin(f),before=f.messages.length;await f.dispose();disposed=true;await losing;await turn();assert.equal(f.messages.slice(before).some(m=>['visualRecoveryLost','visualRecoveryPrepared'].includes(m.kind)),false);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'closed');}finally{if(!disposed)await f.dispose();}
});

test('a release failure is reported once and keeps the existing clock and recovery gate frozen',async()=>{
 const f=await nativeRecoveryHost({timeoutMs:80});try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());f.holdAcks();f.rejectRelease(Error('release fixture refused'));const losing=begin(f);await f.pump();await f.tick();await losing;assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&/release failed/.test(m.message)));assert.equal(f.controls.filter(c=>c.kind==='resume').length,1);assert.equal(f.runtime.status().clockCaptureSuspended,true);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');await f.send({kind:'prepareVisualRecovery',id:40,nativeResumeId:41});assert.equal(f.controls.filter(c=>c.kind==='resume').length,1);assert.equal(f.messages.some(m=>m.kind==='visualRecoveryLost'),false);}finally{await f.dispose();}
});

test('a late release ACK after its progress deadline cannot report successful loss or reactivate the clock',async()=>{
 const f=await nativeRecoveryHost({timeoutMs:80});try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());f.holdAcks();f.holdReleaseAck();const losing=begin(f);await f.pump();await f.tick();await losing;assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&/release failed/.test(m.message)));assert.equal(f.runtime.status().clockCaptureSuspended,true);f.releaseAck();await turn();await turn();assert.equal(f.controls.filter(c=>c.kind==='resume').length,1);assert.equal(f.runtime.status().clockCaptureSuspended,true);assert.equal(f.messages.some(m=>['visualRecoveryLost','visualRecoveryActivated'].includes(m.kind)),false);}finally{await f.dispose();}
});

test('a late checkpoint ACK does not detach the old stream and a new explicit recovery can renew again',async()=>{
 const f=await nativeRecoveryHost({timeoutMs:100});try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());f.holdAcks();const first=begin(f);await f.pump();await f.tick();await first;assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===30));f.holdAcks(false);f.releaseAcks();await turn();await turn();assert.equal(typeof f.initial.onmessage,'function');assert.equal(f.messages.some(m=>m.kind==='visualRecoveryLost'),false);await drive(f,begin(f,'markVisualLost',40));assert(f.messages.some(m=>m.kind==='visualRecoveryLost'&&m.id===40));await f.send({kind:'cancelVisualRecovery',id:42});assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===42&&/Detached/.test(m.message)));assert.deepEqual(f.controls.map(c=>[c.kind,c.id]),[['quiesce',30],['resume',31],['quiesce',40]]);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');}finally{await f.dispose();}
});

test('the existing legacy finish operation also releases a recovery-owned native hold',async()=>{
 const f=await nativeRecoveryHost();try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());await drive(f,begin(f,'prepareVisualRecovery'));await f.send({kind:'finishVisualRecovery'});assert.deepEqual(f.controls.map(c=>[c.kind,c.id]),[['quiesce',30],['resume',31]]);assert.equal(f.runtime.status().clockCaptureSuspended,undefined);}finally{await f.dispose();}
});

test('an actual native preparation failure cannot produce a checkpoint/loss witness or clear its fault',async()=>{
 const f=await nativeRecoveryHost({failPreparation:true});try{await untilNativeRecovery(()=>f.native.authority.nativeIntentProductionStatus().phase==='failed',()=>f.pump());await begin(f);assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===30));assert.equal(f.messages.some(m=>m.kind==='visualRecoveryLost'),false);assert.equal(f.controls.some(c=>c.kind==='resume'),false);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'failed');assert.throws(()=>f.native.command({kind:'snapshot'}),/production failed/i);}finally{await f.dispose();}
});

test('an expired parent request cancels only its own pending native preparation',async()=>{
 const f=await nativeRecoveryHost({holdPreparation:true});try{await untilNativeRecovery(()=>f.native.records[0]?.packet,()=>f.pump());const losing=begin(f);await f.send({kind:'cancelNativeRecoveryPreparation',id:29});assert.equal(f.controls.length,1);const cancelling=f.send({kind:'cancelNativeRecoveryPreparation',id:30});f.releasePreparation();await untilNativeRecovery(()=>f.controls.some(c=>c.kind==='resume'),()=>f.pump());await cancelling;await losing;assert.equal(f.messages.some(m=>m.kind==='visualRecoveryLost'),false);assert.deepEqual(f.controls.map(c=>[c.kind,c.id]),[['quiesce',30],['resume',31]]);assert.equal(typeof f.initial.onmessage,'function');}finally{await f.dispose();}
});

test('hosted request cancellation sends a bounded one-way cancellation with its original identity',async()=>{
 const sent=[],worker={postMessage:m=>sent.push(m),terminate(){}},runtime=createWorkerHostedRuntime({world:{createConfirmedReceiver:()=>({accept:()=>({accepted:true}),status:()=>({sequence:1,lastElapsed:0})})},session:'s',clientOptions:{snapshot:'{}',chunkKeys:[]},runtimeOptions:{visualRecovery:{enabled:true,work:true}},workerFactory:()=>worker}),receive=data=>worker.onmessage({data:{session:'s',...data}});
 try{const starting=runtime.start({terrainPort:{},presentationPort:{}});receive({kind:'publication',publication:{sequence:1,elapsed:0,events:[]}});receive({kind:'started',sequence:1,status:{}});await starting;const controller=new AbortController(),waiting=runtime.markVisualLost({signal:controller.signal,timeoutMs:1000}),id=sent.at(-1).id;waiting.catch(()=>{});controller.abort();await assert.rejects(waiting,{name:'AbortError'});assert.deepEqual(sent.at(-1),{kind:'cancelNativeRecoveryPreparation',session:'s',id});receive({kind:'visualRecoveryLost',id,sequence:1});assert.equal(runtime.status().running,true);}finally{runtime.dispose();}
});

test('a deferred checkpoint rejects this capture and a later explicit attempt can renew the existing deferred base',async()=>{
 const f=await nativeRecoveryHost();try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());f.deferCheckpoint();const first=begin(f);await drive(f,first);assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===30&&/checkpoint unavailable/i.test(m.message)));assert.equal(f.controls.filter(c=>c.kind==='resume').length,1);assert.equal(typeof f.initial.onmessage,'function');f.deferCheckpoint(false);await drive(f,begin(f,'markVisualLost',40));assert(f.messages.some(m=>m.kind==='visualRecoveryLost'&&m.id===40));assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');}finally{await f.dispose();}
});

test('an actual presentation-channel failure rejects the pending capture without waiting for its deadline',async()=>{
 const f=await nativeRecoveryHost();try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());f.holdAcks();const losing=begin(f);await f.pump();await f.tick();await untilNativeRecovery(()=>f.heldAcks.length>0,()=>f.pump());f.initial.onmessage({data:{kind:'invalid-checkpoint-message',session:'s'}});await losing;assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===30&&/checkpoint unavailable/i.test(m.message)));assert.equal(f.messages.some(m=>m.kind==='visualRecoveryLost'),false);assert.equal(f.controls.filter(c=>c.kind==='resume').length,1);}finally{await f.dispose();}
});

test('expiry after irreversible detachment retains the producer until explicit recovery completes',async()=>{
 const f=await nativeRecoveryHost();try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());await drive(f,begin(f));await f.send({kind:'cancelNativeRecoveryPreparation',id:30});assert.equal(f.controls.length,1);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');assert.equal(f.runtime.status().clockCaptureSuspended,true);await f.send({kind:'prepareVisualRecovery',id:32,nativeResumeId:33});assert(f.messages.some(m=>m.kind==='visualRecoveryPrepared'&&m.id===32));assert.equal(f.controls.length,1);}finally{await f.dispose();}
});

test('a failed transport attachment and its explicit retry preserve the same native hold',async()=>{
 const f=await nativeRecoveryHost(),channel=new MessageChannel();let receiver;
 try{await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());await drive(f,begin(f));await f.send({kind:'prepareVisualRecovery',id:32,nativeResumeId:33});const cp=f.messages.find(m=>m.kind==='visualRecoveryPrepared'&&m.id===32).checkpoint;
  f.terrainGate(Promise.reject(Error('native checkpoint terrain switch refused')));await f.send({kind:'attachVisualRecovery',id:34,terrainPort:{},presentationPort:f.presentation(),recoveryPort:{postMessage(){},start(){},close(){}},retainedCheckpoint:recoveryEffects(cp.sequence,cp.elapsed)});assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===34&&m.retryable));assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');await f.send({kind:'prepareVisualRecovery',id:35,nativeResumeId:36});assert(f.messages.some(m=>m.kind==='visualRecoveryPrepared'&&m.id===35));assert.deepEqual(f.controls.map(c=>c.kind),['quiesce']);
  f.terrainGate(null);receiver=createTemporalRecoveryReceiver({port:channel.port2,session:'s',restoreCheckpoint:async()=>true,applyBoundary:async()=>true,onError:e=>{throw e;}});const next=f.presentation();await f.send({kind:'attachVisualRecovery',id:37,terrainPort:{},presentationPort:next,recoveryPort:channel.port1,retainedCheckpoint:recoveryEffects(cp.sequence,cp.elapsed)});await untilNativeRecovery(()=>f.messages.some(m=>m.kind==='visualRecoveryAttached'&&m.id===37));f.hello(next);await f.send({kind:'finishVisualRecoveryConfirmed',id:38});await f.send({kind:'stageRecoveryVisibility',id:39,hidden:false});await f.send({kind:'activateVisualRecovery',id:40});assert(f.messages.some(m=>m.kind==='visualRecoveryActivated'&&m.id===40));assert.deepEqual(f.controls.map(c=>[c.kind,c.id]),[['quiesce',30],['resume',31]]);assert.equal(f.native.authority.nativeIntentControlStatus().cohort.consumers,1);assert.deepEqual(f.native.faults,[]);
 }finally{receiver?.dispose();channel.port1.close();channel.port2.close();await f.dispose();}
});

test('a real queued harvest invalidation drains its cancelled resource callback before checkpoint renewal',async()=>{
 const f=await nativeRecoveryHost({holdPreparation:true,withHarvestTarget:true});try{await untilNativeRecovery(()=>f.native.records[0]?.packet,()=>f.pump());const losing=begin(f);await f.send({kind:'command',id:24,command:{kind:'harvest',id:'native-recovery-harvest',targetId:f.targetId}});await f.send({kind:'command',id:25,command:{kind:'resume',reason:'menu'}});await f.tick();await f.pump();await turn();assert.equal(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===30),false);assert.equal(f.native.authority.nativeResourcePreparationStatus().phase,'running');assert.equal(f.messages.some(m=>m.kind==='visualRecoveryLost'),false);f.releasePreparation();await drive(f,losing);assert(f.messages.some(m=>m.kind==='visualRecoveryLost'&&m.id===30));assert.equal(f.native.authority.nativeResourcePreparationStatus().phase,'running');assert.equal(f.native.records[0].committed,false);assert.equal(f.native.records[0].aborted,true);assert.deepEqual(f.native.faults,[]);}finally{await f.dispose();}
});

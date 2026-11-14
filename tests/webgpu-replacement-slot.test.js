import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Scene,PerspectiveCamera} from 'three';
import {createWebGpuReplacementSlot} from '../src/rendering/webgpu-replacement-slot.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';

async function preparedFixture(){
 const scene=new Scene(),camera=new PerspectiveCamera(),compiled=[],released=[],registry=createWebGpuResourceRegistry(),admission=createWebGpuPipelineAdmission({renderer:{backend:{isWebGPUBackend:true},compileAsync(object){assert.equal(object.visible,true);compiled.push(object);return Promise.resolve();}},scene,camera}),slot=createWebGpuReplacementSlot({pipelineAdmission:admission,resourceRegistry:registry,release:object=>released.push(object)}),old=new Group();scene.add(slot.group);slot.request('old',()=>old);await new Promise(resolve=>setImmediate(resolve));
 return {scene,slot,old,admission,compiled,released,registry,close(){slot.dispose();admission.dispose();registry.dispose();}};
}

test('prepared replacement stays hidden in its existing owner until the common batch phases commit',async()=>{
 const f=await preparedFixture();try{const next=new Group(),part=f.slot.prepareParticipant('next',()=>next);assert.equal(f.slot.active,f.old);assert.equal(next.visible,false);assert.equal(f.slot.upToDate,true);f.slot.request('old',()=>{throw Error('unchanged world must not rebuild');});assert.equal(part.valid(),true);assert.equal(f.compiled.length,1);
  const ticket=await f.admission.prepareTicket(part.object,{include:part.include});assert.equal(ticket.valid(),true);part.activate();part.attach();assert.equal(ticket.validAfterAttach(),true);const result=part.finalize();assert.equal(part.valid(),true);assert.equal(f.slot.active,next);assert.equal(f.old.parent,f.slot.group);assert.equal(f.registry.status().owned.length,2);assert.equal(f.registry.status().owned.filter(item=>item.state==='prepared').length,1);assert.deepEqual(f.released,[]);
  result.retire();result.notify();assert.equal(f.old.parent,null);assert.equal(f.slot.active,next);assert.equal(f.slot.activeKey,'next');assert.equal(f.slot.upToDate,true);assert.deepEqual(f.released,[f.old]);assert.equal(f.registry.status().owned.length,1);assert.equal(f.registry.status().owned[0].state,'committed');
 }finally{f.close();}
});

test('late batch rollback restores the old replacement and releases only its candidate',async()=>{
 const f=await preparedFixture();try{const next=new Group(),part=f.slot.prepareParticipant('next',()=>next);await f.admission.prepareTicket(part.object,{include:part.include});part.activate();part.attach();part.finalize();part.rollbackFinalized();part.rollback();assert.equal(f.slot.active,f.old);assert.equal(f.slot.activeKey,'old');assert.equal(next.visible,false);part.cancel();assert.equal(part.valid(),false);assert.equal(next.parent,null);assert.equal(f.slot.upToDate,true);assert.equal(f.old.visible,true);assert.deepEqual(f.released,[next]);assert.equal(f.registry.status().owned.length,1);
 }finally{f.close();}
});

test('an ordinary changed request cancels only the staged proposal before replacing its visible owner',async()=>{
 const f=await preparedFixture();try{const next=new Group(),part=f.slot.prepareParticipant('next',()=>next),ordinary=new Group();f.slot.request('ordinary',()=>ordinary);assert.equal(part.signal.aborted,true);assert.equal(part.valid(),false);assert.equal(f.slot.active,f.old);assert.equal(next.parent,null);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.slot.active,ordinary);assert.deepEqual(f.released,[next,f.old]);
 }finally{f.close();}
});

test('a staged replacement rejects stealing an already attached object',async()=>{
 const f=await preparedFixture();try{assert.throws(()=>f.slot.prepareParticipant('next',()=>f.old),/detached/);assert.equal(f.slot.active,f.old);assert.equal(f.old.visible,true);assert.deepEqual(f.released,[]);}finally{f.close();}
});

test('disposing a staged replacement waits for its real outstanding compilation before releasing it',async()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(),old=new Group(),next=new Group(),released=[];let finish;const renderer={backend:{isWebGPUBackend:true},compileAsync(object){return object===next?new Promise(resolve=>{finish=resolve;}):Promise.resolve();}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),slot=createWebGpuReplacementSlot({pipelineAdmission:admission,release:object=>released.push(object)}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{slot.request('old',()=>old);await turn();const part=slot.prepareParticipant('next',()=>next),pending=admission.prepareTicket(next,{include:part.include,signal:part.signal});pending.catch(()=>{});await turn();slot.dispose();await assert.rejects(pending,/cancel/i);assert.equal(next.parent,null);assert.deepEqual(released,[old]);finish();await turn();assert.deepEqual(released,[old,next]);}finally{finish?.();slot.dispose();admission.dispose();}
});

test('a synchronous staging failure releases the new candidate without reserving or releasing the old owner',async()=>{
 const f=await preparedFixture();try{const next=new Group(),fail=()=>{throw Error('observer failed');};f.slot.group.addEventListener('childadded',fail);assert.throws(()=>f.slot.prepareParticipant('next',()=>next),/observer failed/);assert.equal(f.slot.active,f.old);assert.equal(next.parent,null);assert.equal(f.registry.status().owned.length,1);assert.deepEqual(f.released,[next]);f.slot.group.removeEventListener('childadded',fail);const retry=f.slot.prepareParticipant('retry',()=>new Group());assert.equal(retry.valid(),true);retry.cancel();}finally{f.close();}
});

test('batch cancellation reentering through the participant signal releases a candidate once',async()=>{
 const f=await preparedFixture();try{const next=new Group(),part=f.slot.prepareParticipant('next',()=>next);part.signal.addEventListener('abort',()=>part.cancel());part.cancel();assert.deepEqual(f.released,[next]);assert.equal(f.registry.status().owned.length,1);assert.equal(f.slot.active,f.old);}finally{f.close();}
});

test('disposal during reversible finalization releases both owners once and cannot publish later',async()=>{
 const f=await preparedFixture();try{const next=new Group(),part=f.slot.prepareParticipant('next',()=>next);await f.admission.prepareTicket(next,{include:part.include});part.activate();part.attach();const result=part.finalize();f.slot.dispose();assert.equal(part.valid(),false);assert.equal(f.slot.active,null);assert.deepEqual(f.released,[next,f.old]);assert.equal(f.registry.status().owned.length,0);part.rollbackFinalized();part.rollback();part.cancel();assert.deepEqual(f.released,[next,f.old]);assert.throws(()=>result.retire(),/stale/);}finally{f.close();}
});

test('publication callback failure is reported without silently discarding the admitted object',async()=>{
 const errors=[],released=[],slot=createWebGpuReplacementSlot({pipelineAdmission:{prepare:async()=>{}},release:object=>released.push(object),onReady:()=>{throw Error('consumer failed');},onError:error=>errors.push(error.message)}),object=new Group();
 slot.request('v1',()=>object);await new Promise(resolve=>setImmediate(resolve));assert.equal(slot.active,object);assert.deepEqual(errors,['consumer failed']);slot.dispose();assert.deepEqual(released,[object]);
});

test('replacement removes a cancelled object immediately but releases it only after compilation',async()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(),first=new Group(),second=new Group(),released=[],calls=[];let finish;
 const admission=createWebGpuPipelineAdmission({renderer:{backend:{isWebGPUBackend:true},compileAsync(object){calls.push(object);return object===first?new Promise(resolve=>{finish=resolve;}):Promise.resolve();}},scene,camera}),slot=createWebGpuReplacementSlot({pipelineAdmission:admission,release:object=>released.push(object)});
 slot.request('first',()=>first);await new Promise(resolve=>setImmediate(resolve));slot.request('second',()=>second);assert.equal(first.parent,null);assert.deepEqual(released,[]);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[first]);finish();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(released,[first]);assert.deepEqual(calls,[first,second]);assert.equal(slot.active,second);slot.dispose();assert.deepEqual(released,[first,second]);admission.dispose();
});

test('disposing a replacement during compilation retains its resources until completion',async()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(),object=new Group(),released=[];let finish;
 const admission=createWebGpuPipelineAdmission({renderer:{backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},scene,camera}),slot=createWebGpuReplacementSlot({pipelineAdmission:admission,release:value=>released.push(value)});
 slot.request('first',()=>object);await new Promise(resolve=>setImmediate(resolve));slot.dispose();admission.dispose();assert.equal(object.parent,null);assert.deepEqual(released,[]);finish();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(released,[object]);
});
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';

test('structure candidates retain resource ownership until cancellation or deferred replacement completes',async()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(),first=new Group(),second=new Group(),released=[],registry=createWebGpuResourceRegistry();let finish;const admission=createWebGpuPipelineAdmission({renderer:{backend:{isWebGPUBackend:true},compileAsync(object){return object===first?new Promise(resolve=>{finish=resolve;}):Promise.resolve();}},scene,camera}),slot=createWebGpuReplacementSlot({pipelineAdmission:admission,resourceRegistry:registry,release:object=>released.push(object)}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{slot.request('first',()=>first);await turn();assert.equal(registry.status().owned[0].state,'prepared');slot.request('second',()=>second);assert.equal(registry.status().owned.length,2);finish();await turn();await turn();assert.equal(slot.active,second);assert.deepEqual(released,[first]);assert.equal(registry.status().owned.length,1);assert.equal(registry.status().owned[0].state,'committed');registry.dispose();slot.dispose();assert.deepEqual(released,[first,second]);assert.equal(registry.status().owned.length,0);}finally{slot.dispose();admission.dispose();registry.dispose();}
});

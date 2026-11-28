import test from 'node:test';
import assert from 'node:assert/strict';
import {remoteDrawPipelineEntries,prepareRemoteFirstUse} from '../src/rendering/remote-prepared-first-use.js';
import {fixture as remoteFixture,pair,flush,preparedWorldDraw} from './helpers/remote-webgpu-fixture.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createRemoteWebGpuClient} from '../src/rendering/remote-webgpu-client.js';

const ref=id=>({__remoteGpuId:id}),command=(method,...args)=>({method,args});
function fixture(){
 const textures=[],encoded=[],writes=[],snapshot=new Map(),pipeline={kind:'createRenderPipelineAsync',value:{pipeline:'original'}},bank={kind:'createBuffer',value:{buffer:'canonical-bank'},descriptor:{usage:128}},group={kind:'createBindGroup',value:{group:'original'},descriptor:{entries:[]},dependencyEntries:new Map()};
 const uniform={kind:'createBuffer',value:{buffer:'isolated-uniform'},descriptor:{usage:72}};snapshot.set('uniform',uniform);
 snapshot.set('pipeline',pipeline);snapshot.set('bank',bank);snapshot.set('group',group);snapshot.set('canvas-view',{currentView:true,descriptor:{}});
 const originalTexture={published:true},target={kind:'createTexture',descriptor:{size:[640,360,1],format:'bgra8unorm',usage:20,sampleCount:4},value:originalTexture};snapshot.set('target',target);snapshot.set('target-view',{kind:'view',descriptor:{baseMipLevel:0},dependencyEntries:new Map([['target',target]])});
 const device={queue:{writeBuffer:(...args)=>writes.push(args)},createTexture(descriptor){const texture={descriptor,destroyed:false,createView:descriptor=>({texture,descriptor}),destroy(){texture.destroyed=true;}};textures.push(texture);return texture;},createCommandEncoder(){const record={passes:[],copies:[]};encoded.push(record);return {beginRenderPass(descriptor){const pass={descriptor,commands:[]};record.passes.push(pass);return Object.fromEntries(['setPipeline','setBindGroup','setVertexBuffer','setIndexBuffer','draw','drawIndexed','drawIndirect','drawIndexedIndirect','executeBundles','setViewport','setScissorRect','end'].map(method=>[method,(...args)=>pass.commands.push({method,args})]));},copyTextureToTexture:(...args)=>record.copies.push(args),finish:()=>record};}};
 const descriptor={colorAttachments:[{view:ref('target-view'),resolveTarget:ref('canvas-view'),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]},commands=[command('setPipeline',ref('pipeline')),command('setBindGroup',0,ref('group')),command('setVertexBuffer',0,ref('bank')),command('draw',3)],buffer={__remoteCommands:[{method:'beginRenderPass',args:[descriptor],commands}]},packet={width:640,height:360,resourceSnapshot:snapshot,unsafeForkBuffers:new Set(),preparedBaselines:new Map(),operations:[{method:'submit',args:[[buffer]]}]};
 const resolve=value=>!value||typeof value!=='object'?value:value.__remoteGpuId?snapshot.get(value.__remoteGpuId).value:Array.isArray(value)?value.map(resolve):Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolve(v)]));
 const prepare=()=>{packet.drawnPipelines=remoteDrawPipelineEntries(packet.operations,snapshot);return prepareRemoteFirstUse({device,packet,canvasConfiguration:{format:'bgra8unorm'},resolve});};
 return {device,snapshot,pipeline,bank,uniform,group,target,originalTexture,textures,encoded,writes,descriptor,commands,buffer,packet,prepare};
}

test('first use executes the original native pipeline and banks on compatible private MSAA/resolve attachments',()=>{
 const f=fixture(),source=structuredClone(f.descriptor),r=f.prepare(),pass=r.buffers[0].passes[0];assert.equal(r.pipelines.size,1);assert(r.pipelines.has(f.pipeline));assert.equal(r.passes,1);assert.equal(r.draws,1);assert.equal(f.textures.length,2);
 assert.equal(pass.descriptor.colorAttachments[0].view.texture.descriptor.format,'bgra8unorm');assert.equal(pass.descriptor.colorAttachments[0].view.texture.descriptor.sampleCount,4);assert.equal(pass.descriptor.colorAttachments[0].resolveTarget.texture.descriptor.format,'bgra8unorm');assert.deepEqual(pass.descriptor.colorAttachments[0].resolveTarget.texture.descriptor.size,[640,360,1]);
 assert.notEqual(pass.descriptor.colorAttachments[0].view.texture,f.originalTexture);assert.equal(pass.commands.find(c=>c.method==='setPipeline').args[0],f.pipeline.value);assert.equal(pass.commands.find(c=>c.method==='setBindGroup').args[1],f.group.value);assert.equal(pass.commands.find(c=>c.method==='setVertexBuffer').args[1],f.bank.value);assert.deepEqual(f.descriptor,source);assert.equal(f.pipeline.firstUseSubmitted,undefined);
});

test('an already used native generation creates no targets, writes, commands or additional first-use work',()=>{
 const f=fixture();f.pipeline.firstUseSubmitted=true;const r=f.prepare();assert.equal(r.pipelines.size,0);assert.deepEqual(r.buffers,[]);assert.deepEqual(f.textures,[]);assert.deepEqual(f.writes,[]);assert.deepEqual(f.encoded,[]);
});

test('a new pipeline generation is exercised even when its producer identity matches a used predecessor',()=>{
 const f=fixture(),old=f.pipeline;old.firstUseSubmitted=true;const replacement={...old,value:{pipeline:'new-generation'},firstUseSubmitted:false};f.snapshot.set('pipeline',replacement);const r=f.prepare();assert.deepEqual([...r.pipelines],[replacement]);assert.equal(r.buffers[0].passes[0].commands.find(c=>c.method==='setPipeline').args[0],replacement.value);
});

test('in-flight first use is shared by its exact resource entry without duplicating any GPU work',()=>{
 const f=fixture(),pending=new Promise(()=>{});f.pipeline.firstUseCompletion=pending;const r=f.prepare();assert.equal(r.pipelines.size,0);assert.deepEqual(r.waiting,[pending]);assert.equal(r.buffers.length,0);assert.equal(f.textures.length,0);
});

test('only cold draws execute when the same pass also contains an already used pipeline',()=>{
 const f=fixture(),hot={kind:'createRenderPipeline',value:{pipeline:'hot'},firstUseSubmitted:true};f.snapshot.set('hot',hot);f.commands.unshift(command('setPipeline',ref('hot')),command('draw',6));const r=f.prepare();assert.equal(r.draws,1);assert.equal(r.buffers[0].passes[0].commands.filter(c=>c.method==='draw').length,1);assert(r.pipelines.has(f.pipeline));assert(!r.pipelines.has(hot));
});

for(const commands of [[command('setPipeline',ref('pipeline'))],[command('setPipeline',ref('pipeline')),command('draw',0)],[command('setPipeline',ref('pipeline')),command('drawIndexed',3,0)]])test('binding a pipeline or drawing zero vertices/instances is not first use '+JSON.stringify(commands.at(-1).args),()=>{
 const f=fixture();f.buffer.__remoteCommands[0].commands=commands;const r=f.prepare();assert.equal(r.pipelines.size,0);assert.equal(r.buffers.length,0);assert.equal(f.textures.length,0);
});

test('private depth/stencil attachments retain format and view generation without modifying published targets',()=>{
 const f=fixture(),depth={kind:'createTexture',descriptor:{size:[640,360,1],format:'depth24plus-stencil8',usage:16,sampleCount:4},value:{publishedDepth:true}};f.snapshot.set('depth',depth);f.snapshot.set('depth-view',{kind:'view',descriptor:{aspect:'all'},dependencyEntries:new Map([['depth',depth]])});f.descriptor.depthStencilAttachment={view:ref('depth-view'),depthLoadOp:'clear',depthStoreOp:'store',depthClearValue:1,stencilLoadOp:'clear',stencilStoreOp:'store',stencilClearValue:0};const r=f.prepare(),view=r.buffers[0].passes[0].descriptor.depthStencilAttachment.view;assert.equal(view.texture.descriptor.format,depth.descriptor.format);assert.equal(view.texture.descriptor.sampleCount,4);assert.notEqual(view.texture,depth.value);assert.equal(f.descriptor.depthStencilAttachment.view.__remoteGpuId,'depth-view');
});

test('query writes and readbacks are not duplicated by a warm-up',()=>{
 const f=fixture();f.descriptor.timestampWrites={querySet:ref('query')};f.descriptor.occlusionQuerySet=ref('query');f.commands.unshift(command('beginOcclusionQuery',0));f.commands.push(command('endOcclusionQuery'));f.buffer.__remoteCommands.push(command('resolveQuerySet',ref('query'),0,1,ref('bank'),0),command('copyTextureToBuffer',{texture:ref('target')},{buffer:ref('bank')},[1,1,1]));const r=f.prepare(),pass=r.buffers[0].passes[0];assert(!pass.descriptor.timestampWrites);assert(!pass.descriptor.occlusionQuerySet);assert(!pass.commands.some(c=>c.method.includes('Occlusion')));assert.equal(f.descriptor.occlusionQuerySet.__remoteGpuId,'query');
});

test('render-target copies remain one-shot image work and are not duplicated for pipeline first use',()=>{
 const f=fixture();f.target.descriptor.usage|=3;f.target.descriptor.sampleCount=1;delete f.descriptor.colorAttachments[0].resolveTarget;f.buffer.__remoteCommands.push(command('copyTextureToTexture',{texture:ref('target')},{texture:ref('target')},[32,32,1]));const r=f.prepare(),copy=r.buffers[0].copies[0];assert.equal(copy,undefined);assert.equal(r.buffers[0].copies.length,0);assert.equal(f.target.value,f.originalTexture);assert.equal(f.buffer.__remoteCommands.at(-1).method,'copyTextureToTexture');
});

test('per-pass uniforms are restored in order using the already isolated native buffers',()=>{
 const f=fixture();f.packet.preparedBaselines.set('uniform',new Uint8Array([9,0,0,0]));f.packet.operations.unshift({method:'writeBuffer',args:[ref('uniform'),0,new Uint8Array([1,0,0,0])]});f.packet.operations.push({method:'writeBuffer',args:[ref('uniform'),0,new Uint8Array([2,0,0,0])]});f.prepare();assert.deepEqual(f.writes.map(v=>v[0]),[f.uniform.value,f.uniform.value,f.uniform.value]);assert.deepEqual(f.writes.map(v=>v[2][0]),[9,1,2]);
});

for(const kind of ['writable-buffer','writable-texture','unknown-storage-texture'])test('first use rejects unsandboxed '+kind+' before allocating GPU targets',()=>{
 const f=fixture();if(kind==='writable-buffer'){f.packet.unsafeForkBuffers.add('bank');f.group.descriptor={layout:ref('storage-layout'),entries:[{binding:0,resource:{buffer:ref('bank')}}]};f.group.dependencyEntries.set('storage-layout',{descriptor:{entries:[{binding:0,buffer:{type:'storage'}}]}});}else{const layout={descriptor:{entries:[{binding:0,...(kind==='writable-texture'?{storageTexture:{access:'write-only'}}:{})}]}},texture={kind:'createTexture',descriptor:{usage:8}},view={kind:'view',dependencyEntries:new Map([['storage',texture]])};f.snapshot.set('storage-view',view);f.group.descriptor={layout:ref('layout'),entries:[{binding:0,resource:ref('storage-view')}]};f.group.dependencyEntries.set('layout',layout);}
 assert.throws(()=>f.prepare(),/storage/);assert.equal(f.textures.length,0);
});

test('encoding failure disposes all private targets without touching native shared resources',()=>{
 const f=fixture();f.device.createCommandEncoder=()=>({beginRenderPass(){throw Error('encoding failed');}});assert.throws(()=>f.prepare(),/encoding failed/);assert.equal(f.textures.length,2);assert(f.textures.every(t=>t.destroyed));assert.equal(f.target.value,f.originalTexture);assert.equal(f.pipeline.firstUseSubmitted,undefined);
});

test('cold bundle draws reuse their exact native resources while preserving the original bundle',()=>{
 const f=fixture(),bundle={kind:'bundle',commands:f.commands.slice(),value:{bundle:'original'}};f.snapshot.set('bundle',bundle);f.buffer.__remoteCommands[0].commands=[command('executeBundles',[ref('bundle')])];const r=f.prepare(),pass=r.buffers[0].passes[0];assert.equal(r.draws,1);assert(!pass.commands.some(c=>c.method==='executeBundles'));assert.equal(pass.commands.find(c=>c.method==='setPipeline').args[0],f.pipeline.value);assert.equal(bundle.value.bundle,'original');assert.deepEqual([...r.pipelines],[f.pipeline]);
});

// Same real native source fixture as the retained-frame tests. Only GPU work
// and transport completion are deterministic doubles here, not a body/ACK.
async function nativeFixture(){
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair(),f=await remoteFixture({}, {intentControl:{port:drawPort,session:'pipeline-first-use'}});
 native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
 const source=createNativeIntentControlPublication({port:sourcePort,session:'pipeline-first-use',observe:native.bridge.observeNativeIntentControl});await source.ready;
 const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
 return {...f,native,source,clock,async close(){source.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();}};
}

test('READY waits for actual private first use, preserves the old image/body and retires targets before adoption',async()=>{
 const f=await nativeFixture(),prefix=f.gpu.device.queue.onSubmittedWorkDone;let releases=[],prepared;try{
  const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await shown;
  const oldBuffer=f.gpu.buffers[0],before=f.native.session.core.snapshot(),textures=[],create=f.gpu.device.createTexture;
  f.gpu.device.createTexture=descriptor=>{const texture=create(descriptor),destroy=texture.destroy;texture.destroy=()=>{texture.wasDestroyed=true;destroy.call(texture);};textures.push(texture);return texture;};
  const pipeline=f.client.device.createRenderPipeline({label:'cold'});await flush();await f.host.idle();let entered;const blocked=new Promise(resolve=>{entered=resolve;});
  f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{releases.push(resolve);entered();});
  const pending=f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources:async({proposedWorldBoundary})=>{
   prepared=await preparedWorldDraw({...f,pipeline},proposedWorldBoundary);assert(textures.every(t=>t.wasDestroyed));return {preparedWorldBoundary:prepared.preparedWorldBoundary,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary),abort:prepared.abort};
  }});
  await blocked;assert.equal(prepared,undefined);assert.deepEqual(f.native.session.core.snapshot(),before);assert.equal(f.gpu.canvasSubmissions.length,1);assert.equal(f.gpu.submitted.length,2);assert.equal(f.host.inspect().firstUseSubmissions,1);assert.equal(f.host.inspect().firstUsePipelines,0);assert(textures.length&&textures.every(t=>!t.wasDestroyed));assert.equal(new Float32Array(oldBuffer.data.buffer)[0],1);
  f.host.present();assert.equal(f.host.inspect().activeSequence,1);assert.equal(f.gpu.canvasSubmissions.length,2);assert.equal(new Float32Array(oldBuffer.data.buffer)[0],1);
  f.gpu.device.queue.onSubmittedWorkDone=prefix;for(const release of releases)release();releases=[];const result=await pending;assert.equal(result.status,'committed',JSON.stringify(result));assert(textures.every(t=>t.wasDestroyed));assert.equal(f.host.inspect().firstUsePipelines,1);f.host.present();await prepared.presented;assert.equal(f.host.inspect().activeSequence,2);assert.equal(new Float32Array(oldBuffer.data.buffer)[0],1);assert.deepEqual(f.errors,[]);
 }finally{f.gpu.device.queue.onSubmittedWorkDone=prefix;for(const release of releases)release();await f.close();}
});

test('native first-use validation failure cannot credit a prepared result or authorize the future world',async()=>{
 const f=await nativeFixture();try{
  const before=f.native.session.core.snapshot();f.gpu.device.popErrorScope=async()=>({message:'first-use validation rejected'});
  const result=await f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources:async({proposedWorldBoundary})=>{
   const prepared=await preparedWorldDraw(f,proposedWorldBoundary);return {preparedWorldBoundary:prepared.preparedWorldBoundary,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary),abort:prepared.abort};
  }});
  assert.notEqual(result.status,'committed',JSON.stringify(result));assert.deepEqual(f.native.session.core.snapshot(),before);assert.equal(f.gpu.canvasSubmissions.length,0);assert.equal(f.host.inspect().activeSequence,null);assert.equal(f.host.inspect().firstUsePipelines,0);assert(f.errors.some(e=>e.message.includes('first-use validation rejected')));
 }finally{await f.close();}
});

for(const flag of [undefined,false,1])test('an upload-only or malformed receipt cannot certify first use: '+String(flag),async()=>{
 const boundary={version:1,authorityEpoch:'first-use-receipt',nativeSession:1,ticket:1,effectiveTime:0},port={postMessage(message){if(message.type==='prepare-world-frame')queueMicrotask(()=>port.onmessage({data:{type:'reply',requestId:message.requestId,result:{version:1,sequence:message.packet.sequence,worldBoundary:boundary,uploadsSubmitted:true,...(flag===undefined?{}:{pipelineFirstUseComplete:flag})}}}));}};
 const client=createRemoteWebGpuClient({port,capabilities:{width:20,height:10,format:'rgba8unorm'}});try{client.beginFrame({nativeWorldBoundary:boundary});await assert.rejects(client.prepareNativeWorldFrame({nativeWorldBoundary:boundary}),/Prepared world frame unavailable/);}finally{client.dispose();}
});

for(const bundle of [false,true])test('unchanged writable draws do not block or execute in cold first use ('+(bundle?'bundle':'pass')+')',()=>{
 const f=fixture(),hot={kind:'createRenderPipeline',value:{pipeline:'hot-writable'},firstUseSubmitted:true},rw={kind:'createBuffer',descriptor:{usage:128},value:{buffer:'live-storage'}},layout={descriptor:{entries:[{binding:0,buffer:{type:'storage'}}]}},group={kind:'createBindGroup',value:{group:'live-writable'},descriptor:{layout:ref('rw-layout'),entries:[{binding:0,resource:{buffer:ref('rw')}}]},dependencyEntries:new Map([['rw-layout',layout]])};f.snapshot.set('hot-rw',hot);f.snapshot.set('rw',rw);f.snapshot.set('rw-group',group);f.packet.unsafeForkBuffers.add('rw');
 f.commands.unshift(command('setPipeline',ref('hot-rw')),command('setBindGroup',0,ref('rw-group')),command('draw',9));if(bundle){const commands=f.commands.slice();f.snapshot.set('mixed-bundle',{kind:'bundle',value:{bundle:'original'},commands});f.buffer.__remoteCommands[0].commands=[command('executeBundles',[ref('mixed-bundle')])];}
 const r=f.prepare(),draws=r.buffers[0].passes[0].commands.filter(c=>c.method==='draw');assert.deepEqual(draws.map(c=>c.args),[[3]]);assert.equal(r.draws,1);assert.deepEqual([...r.pipelines],[f.pipeline]);assert(!f.writes.some(w=>w[0]===rw.value));assert.equal(hot.firstUseSubmitted,true);
});

for(const field of ['preparedWorldBoundary','preparedUploadsComplete','initializedPreparation','drawnPipelines','firstUseTracked'])test('producer cannot supply host-owned '+field,async()=>{
 const f=await remoteFixture();try{await assert.rejects(f.host.handle({type:'frame',packet:{sequence:1,metadata:{},operations:[],[field]:true}}),/producer cannot supply native execution bindings/i);assert.equal(f.gpu.submitted.length,0);assert.equal(f.host.inspect().activeSequence,null);}finally{f.client.dispose();await f.host.dispose();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Mesh,BoxGeometry,MeshStandardMaterial,PerspectiveCamera} from 'three';
import {LoadingFrameSlack} from '../src/rendering/loading-frame-slack.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
function setup(){
 let target={name:'previous'},complete,reject;const waiting=new Promise((resolve,fail)=>{complete=resolve;reject=fail;});
 const renderer={shadowMap:{enabled:true},getRenderTarget:()=>target,setRenderTarget:value=>{target=value;}};
 const pipeline=new BuildingDestructionPass(renderer),world=new Scene(),opaque=new Mesh(new BoxGeometry(),new MeshStandardMaterial()),alpha=new Mesh(new BoxGeometry(),new MeshStandardMaterial({alphaTest:.5})),transparent=new Mesh(new BoxGeometry(),new MeshStandardMaterial({transparent:true}));
 world.add(opaque,alpha,transparent);const originals=[opaque,alpha,transparent].map(mesh=>mesh.material),prior=target;
 const cleanup=()=>{pipeline.dispose();for(const mesh of world.children){mesh.geometry.dispose();mesh.material.dispose();}};
 return {renderer,pipeline,world,opaque,alpha,transparent,originals,prior,waiting,complete,reject,cleanup};
}

test('depth preload starts with the actual target and recipes, restores scene immediately, then waits for compilation',async()=>{
 const s=setup();s.renderer.compileAsync=(world,camera)=>{
  assert.equal(world,s.world);assert.ok(camera.isPerspectiveCamera);assert.equal(s.renderer.getRenderTarget(),s.pipeline.smokeDepth);assert.equal(s.renderer.shadowMap.enabled,false);
  assert.ok(s.opaque.material.isMeshDepthMaterial);assert.equal(s.alpha.material,s.originals[1]);assert.equal(s.alpha.material.colorWrite,false);assert.equal(s.transparent.material.visible,false);return s.waiting;
 };
 const preparing=s.pipeline.prepareDepth(new PerspectiveCamera(),s.world);
 assert.deepEqual(s.world.children.map(mesh=>mesh.material),s.originals);assert.ok(s.originals.every(material=>material.visible&&material.colorWrite));assert.equal(s.pipeline.depthWarmStats.stockAlphaSpecialized,0);
 assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);
 s.complete();await preparing;assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);s.cleanup();
});

test('synchronous compile errors and asynchronous rejections restore target, shadows and every borrowed material',async()=>{
 for(const synchronous of [true,false]){
  const s=setup();s.renderer.compileAsync=()=>{if(synchronous)throw Error('compile failed');return s.waiting;};
  const pending=s.pipeline.prepareDepth(new PerspectiveCamera(),s.world);if(!synchronous)s.reject(Error('compile failed'));
  await assert.rejects(pending,/compile failed/);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);assert.deepEqual(s.world.children.map(mesh=>mesh.material),s.originals);assert.ok(s.originals.every(material=>material.visible&&material.colorWrite));s.cleanup();
 }
});

test('preload honors the same explicit diagnostic options as capture without enabling alpha or empty candidates globally',async()=>{
 const s=setup();s.pipeline.optimizedDepth=false;s.renderer.compileAsync=()=>{assert.equal(s.opaque.material,s.originals[0]);return Promise.resolve();};
 await s.pipeline.prepareDepth(new PerspectiveCamera(),s.world);assert.equal(s.pipeline.depthWarmStats.specialized,0);
 s.pipeline.optimizedDepth=true;s.pipeline.stockAlphaDepth=true;s.renderer.compileAsync=()=>{assert.ok(s.alpha.material.isMeshDepthMaterial);return Promise.resolve();};
 await s.pipeline.prepareDepth(new PerspectiveCamera(),s.world);assert.equal(s.pipeline.depthWarmStats.stockAlphaSpecialized,1);assert.deepEqual(s.world.children.map(mesh=>mesh.material),s.originals);s.cleanup();
});

test('bounded loading depth submissions restore originals and renderer while each program is pending',async()=>{const s=setup(),pending=[],calls=[];let yielded=0;const compile=(view,camera,target)=>{assert.equal(target,s.world);assert.equal(s.renderer.getRenderTarget(),s.pipeline.smokeDepth);const meshes=[];view.traverse(mesh=>meshes.push(mesh));assert.equal(meshes.length,1);calls.push(meshes[0]);return new Promise(resolve=>pending.push(resolve));};const preparing=s.pipeline.prepareDepth(new PerspectiveCamera(),s.world,{batchSize:1,compile,nextFrame:async()=>{yielded++;assert.deepEqual(s.world.children.map(m=>m.material),s.originals);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);}});assert.equal(pending.length,1);assert.deepEqual(s.world.children.map(m=>m.material),s.originals);assert.equal(s.renderer.getRenderTarget(),s.prior);for(let i=0;i<3;i++){pending[i]();for(let j=0;j<6;j++)await Promise.resolve();}await preparing;assert.deepEqual(calls,s.world.children);assert.equal(yielded,3);assert.equal(s.pipeline.depthWarmStats.excluded,1);s.cleanup();});
test('cancelling after a bounded depth batch cannot leave borrowed materials or renderer state',async()=>{const s=setup();let stop=false,calls=0;await assert.rejects(s.pipeline.prepareDepth(new PerspectiveCamera(),s.world,{batchSize:1,compile:()=>{calls++;return Promise.resolve();},cancelled:()=>stop,nextFrame:async()=>{stop=true;}}),/cancelled/);assert.equal(calls,1);assert.deepEqual(s.world.children.map(m=>m.material),s.originals);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);s.cleanup();});
test('grouped world-depth QA flag applies equally to preload and capture without changing the default',async()=>{
 const s=setup(),second=new MeshStandardMaterial(),sources=[s.originals[0],second];s.opaque.material=sources;
 s.renderer.getDrawingBufferSize=out=>out.set(32,24);
 for(const enabled of [false,true]){
  s.pipeline.materialArrayDepth=enabled;
  const inspect=()=>{assert.equal(s.renderer.shadowMap.enabled,false);assert.equal(s.renderer.getRenderTarget(),s.pipeline.smokeDepth);assert.ok(Array.isArray(s.opaque.material));if(enabled)assert.ok(s.opaque.material.every(m=>m.isMeshDepthMaterial));else assert.equal(s.opaque.material,sources);};
  s.renderer.compileAsync=()=>{inspect();return Promise.resolve();};
  await s.pipeline.prepareDepth(new PerspectiveCamera(),s.world);
  assert.equal(s.opaque.material,sources);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);
  s.renderer.render=inspect;s.pipeline.captureDepth(new PerspectiveCamera(),s.world);
  assert.equal(s.opaque.material,sources);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);
 }
 s.opaque.material=s.originals[0];second.dispose();s.cleanup();
});

test('a suspended depth frame reacts to owner signal or cancellation predicate before any late frame',async()=>{
 for(const mode of ['signal','predicate']){
  const s=setup(),owner=new AbortController();let stopped=false,calls=0,rejectLate;
  const pending=s.pipeline.prepareDepth(new PerspectiveCamera(),s.world,{batchSize:1,compile:()=>{calls++;return Promise.resolve();},signal:owner.signal,cancelled:()=>stopped,pollIntervalMs:2,nextFrame:()=>new Promise((resolve,reject)=>rejectLate=reject)});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);if(mode==='signal')owner.abort();else stopped=true;
  await assert.rejects(pending,/cancelled/);assert.equal(calls,1);assert.deepEqual(s.world.children.map(m=>m.material),s.originals);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);
  rejectLate(Error('late frame failure'));await new Promise(resolve=>setImmediate(resolve));s.cleanup();
 }
});
test('a depth frame deadline does not require the suspended RAF to resolve',async()=>{
 const s=setup();let clock=0,calls=0;
 const pending=s.pipeline.prepareDepth(new PerspectiveCamera(),s.world,{batchSize:1,compile:()=>{calls++;return Promise.resolve();},now:()=>clock,timeout:1,pollIntervalMs:2,nextFrame:()=>new Promise(()=>{})});
 await new Promise(resolve=>setImmediate(resolve));clock=2;await assert.rejects(pending,/timed out/);assert.equal(calls,1);assert.deepEqual(s.world.children.map(m=>m.material),s.originals);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);s.cleanup();
});

test('optional per-batch depth witnesses separate synchronous submission, program readiness and the unchanged frame barrier',async()=>{
 const s=setup(),spans=[];let clock=0,frames=0;
 await s.pipeline.prepareDepth(new PerspectiveCamera(),s.world,{batchSize:1,now:()=>clock,compile:()=>{clock+=2;return Promise.resolve();},onPrepare:span=>{spans.push(span);throw Error('observer');},nextFrame:async()=>{frames++;clock+=10;assert.deepEqual(s.world.children.map(m=>m.material),s.originals);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);}});
 const submit=spans.filter(s=>s.label==='loading-depth-batch-submit'),programs=spans.filter(s=>s.label==='loading-depth-batch-program-wait'),waits=spans.filter(s=>s.label==='loading-depth-batch-frame-wait');assert.equal(frames,3);assert.deepEqual(submit.map(s=>s.batchIndex),[0,1,2]);assert.ok(submit.every(s=>s.duration===2&&s.objects===1&&!s.failed));assert.equal(programs.length,3);assert.ok(waits.every(s=>s.duration===10));s.cleanup();
});

function depthSlack(){const owner=new LoadingFrameSlack({targetMs:16});for(const timestamp of [0,16,32,48])owner.observeFrame({timestamp,start:timestamp+.2,end:timestamp+1.2});return owner;}
test('opt-in depth slack coalesces cheap batches only inside a delivered presentation frame',async()=>{const s=setup();let clock=50,frames=0,calls=0;const owner=depthSlack();await s.pipeline.prepareDepth(new PerspectiveCamera(),s.world,{batchSize:1,frameSlack:owner,now:()=>clock,compile:()=>{clock+=1;calls++;return Promise.resolve();},nextFrame:async()=>{frames++;}});assert.equal(calls,3);assert.equal(frames,0);assert.equal(owner.stats.adaptiveDecisions,3);assert.deepEqual(s.world.children.map(m=>m.material),s.originals);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);s.cleanup();});
test('opt-in depth slack keeps every original barrier when presentation evidence is missing',async()=>{const s=setup();let frames=0;const owner=new LoadingFrameSlack();await s.pipeline.prepareDepth(new PerspectiveCamera(),s.world,{batchSize:1,frameSlack:owner,compile:()=>Promise.resolve(),nextFrame:async()=>{frames++;}});assert.equal(frames,3);assert.equal(owner.stats.adaptiveDecisions,0);s.cleanup();});
test('cancel after compilation is observed even when a trustworthy depth lane could skip the next barrier',async()=>{const s=setup(),signal=new AbortController();let calls=0,frames=0,clock=50;await assert.rejects(s.pipeline.prepareDepth(new PerspectiveCamera(),s.world,{batchSize:1,frameSlack:depthSlack(),signal:signal.signal,now:()=>clock,compile:()=>{calls++;clock++;signal.abort();return Promise.resolve();},nextFrame:async()=>{frames++;}}),/cancelled/);assert.equal(calls,1);assert.equal(frames,0);assert.deepEqual(s.world.children.map(m=>m.material),s.originals);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);s.cleanup();});

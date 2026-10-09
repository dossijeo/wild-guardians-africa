import {nativeFarRenderSignature} from '../tools/experiments/native-far-render-signature.js';
import {NativePreparedTreeCoverage} from '../tools/experiments/native-prepared-tree-coverage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Texture,Scene,Group,Vector4,Mesh} from 'three';
import {NativeFarGpuCancelled,prepareNativeFarGpu,releaseNativeFarGpuCache,nativeFarGpuRevision,nativeFarGpuContextLost} from '../tools/experiments/prepare-native-far-gpu.js';
import {waitGpuPreparation} from '../tools/experiments/wait-gpu-preparation.js';
import {compileGpuPreparation} from '../tools/experiments/compile-gpu-preparation.js';
import {BufferGeometry} from 'three';

test('zero-vertex preparation is explicit, isolated, and restores positive geometry before fence waits',async()=>{
 const f=fixture(),geometry=new BufferGeometry();geometry.setDrawRange(4,12);geometry.addGroup(6,6,1);let directCalls=0;
 const direct=f.renderer.renderBufferDirect=function(_camera,_scene,g,_material,_object,group){directCalls++;assert.deepEqual(g.drawRange,{start:0,count:0});assert.deepEqual(group,{start:0,count:0,materialIndex:1});};
 const render=f.renderer.render;f.renderer.render=(...args)=>{render(...args);f.renderer.renderBufferDirect({},f.scene,geometry,{}, {},geometry.groups[0]);};
 const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{isolateRoot:true,zeroVertices:true,nextFrame:async()=>{assert.equal(f.renderer.renderBufferDirect,direct);assert.deepEqual(geometry.drawRange,{start:4,count:12});assert.deepEqual(geometry.groups[0],{start:6,count:6,materialIndex:1});}});
 assert.equal(result.zeroVertexDraws,1);assert.equal(directCalls,1);assert.ok(f.calls.includes('fence'));f.restored();releaseNativeFarGpuCache(f.renderer);
 const invalid=fixture();await assert.rejects(prepareNativeFarGpu(invalid.renderer,invalid.root,invalid.scene,{},[],{zeroVertices:true}),/requires isolation/);assert.deepEqual(invalid.calls,[]);
});
test('zero-vertex draw failure restores renderer ownership and submits no success fence',async()=>{const f=fixture({renderError:true}),direct=f.renderer.renderBufferDirect=()=>{};await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{isolateRoot:true,zeroVertices:true}),/Draw failed/);assert.equal(f.renderer.renderBufferDirect,direct);assert.equal(f.calls.includes('fence'),false);assert.equal(f.root.parent,f.parent);f.restored();releaseNativeFarGpuCache(f.renderer);});

function fixture({renderError=false}={}){
 const scene=new Scene(),parent=new Group(),root=new Group();parent.add(root);const original={},calls=[];let current=original,waits=0,viewport=new Vector4(2,3,100,200),scissor=new Vector4(4,5,60,70),scissorTest=false;
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,WAIT_FAILED:4,NO_ERROR:0,isContextLost:()=>false,fenceSync:()=>{calls.push('fence');return {};},flush:()=>calls.push('flush'),clientWaitSync:()=>++waits<2?0:3,deleteSync:()=>calls.push('delete'),getError:()=>0};
 const renderer={compile:(r,c,s)=>{assert.equal(r,root);assert.equal(s,scene);calls.push('compile');return new Set();},properties:{get:()=>assert.fail('No program required')},target:null,getRenderTarget(){return this.target;},setRenderTarget(value){this.target=value;},getContext:()=>gl,initTexture:()=>calls.push('texture'),compileAsync:async(r,c,s)=>{assert.equal(r,root);assert.equal(s,scene);calls.push('compile');},autoClear:true,getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>scissorTest,setViewport:(...v)=>{viewport=v[0]?.isVector4?v[0].clone():new Vector4(...v);},setScissor:(...v)=>{scissor=v[0]?.isVector4?v[0].clone():new Vector4(...v);},setScissorTest:v=>{scissorTest=v;if(!v)calls.push('restore');},render:()=>{assert.equal(root.parent,scene);assert.deepEqual(viewport.toArray(),[0,0,0,0]);assert.deepEqual(scissor.toArray(),[0,0,0,0]);assert.equal(scissorTest,true);assert.equal(renderer.autoClear,false);calls.push('render');if(renderError)throw Error('Draw failed');}};
 return {scene,parent,root,original,calls,renderer,current:()=>current,restored(){assert.deepEqual(viewport.toArray(),[2,3,100,200]);assert.deepEqual(scissor.toArray(),[4,5,60,70]);assert.equal(scissorTest,false);assert.equal(renderer.autoClear,true);}};
}

function ownedFixture(){const f=fixture();f.renderer.compile=()=>new Set();f.renderer.properties={get:()=>assert.fail('No selected material')};f.renderer.compileAsync=()=>assert.fail('Three async timer');return f;}

test('owned texture frame wait cancels without uploading the remaining texture',async()=>{
 const f=ownedFixture(),textures=[new Texture(),new Texture()];let cancelled=false,finish;
 const pending=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},textures,{ownedCompilation:true,ownedWaits:true,cancelled:()=>cancelled,nextFrame:()=>new Promise(resolve=>finish=resolve)});
 await new Promise(resolve=>setImmediate(resolve));cancelled=true;
 await assert.rejects(pending,NativeFarGpuCancelled);assert.deepEqual(f.calls,['texture']);finish();await Promise.resolve();assert.deepEqual(f.calls,['texture']);
 f.restored();releaseNativeFarGpuCache(f.renderer);assert.equal(textures[0]._listeners.dispose.length,0);
});
test('owned image decode wait cancels and observes a late decoder rejection',async()=>{
 const f=ownedFixture();let cancelled=false,rejectDecode;
 const texture=new Texture({decode:()=>new Promise((resolve,reject)=>rejectDecode=reject)});
 const pending=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{ownedCompilation:true,ownedWaits:true,decodeImages:true,cancelled:()=>cancelled});
 await new Promise(resolve=>setImmediate(resolve));cancelled=true;await assert.rejects(pending,NativeFarGpuCancelled);
 rejectDecode(Error('late decode failure'));await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.calls,[]);f.restored();releaseNativeFarGpuCache(f.renderer);
});
test('owned fence wait checks cancellation even if RAF never resumes',async()=>{
 const f=ownedFixture();let cancelled=false;
 const pending=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{ownedCompilation:true,ownedWaits:true,cancelled:()=>cancelled,nextFrame:()=>new Promise(()=>{})});
 await new Promise(resolve=>setImmediate(resolve));assert.ok(f.calls.includes('fence'));cancelled=true;
 await assert.rejects(pending,NativeFarGpuCancelled);assert.equal(f.calls.at(-1),'delete');f.restored();assert.equal(f.root.parent,f.parent);releaseNativeFarGpuCache(f.renderer);
});
test('owned fence from a lost/restored context is never queried or deleted in the new epoch',async()=>{
 const f=ownedFixture();f.renderer.domElement=new EventTarget();let queries=0;
 f.renderer.getContext().clientWaitSync=()=>{queries++;return 0;};
 const pending=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{ownedCompilation:true,ownedWaits:true,nextFrame:()=>new Promise(()=>{})});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(queries,1);
 f.renderer.domElement.dispatchEvent(new Event('webglcontextlost'));f.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));
 await assert.rejects(pending,error=>error instanceof NativeFarGpuCancelled&&error.reason==='context-changed');
 assert.equal(queries,1);assert.equal(f.calls.includes('delete'),false);f.restored();releaseNativeFarGpuCache(f.renderer);
});
test('owned fence deadline rejects rather than waiting indefinitely for a frame',async()=>{
 const f=ownedFixture();await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{ownedCompilation:true,ownedWaits:true,timeout:15,nextFrame:()=>new Promise(()=>{})}),/timed out/);
 assert.equal(f.calls.at(-1),'delete');f.restored();releaseNativeFarGpuCache(f.renderer);
});
test('owned frame waits cannot wrap the uncancellable Three compiler',async()=>{
 const f=fixture();await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{ownedWaits:true}),/require owned compilation/);assert.deepEqual(f.calls,[]);
});

test('ownership changing inside the final fence query cannot adopt readiness',async()=>{
 const f=ownedFixture();let cancelled=false;f.renderer.getContext().clientWaitSync=()=>{cancelled=true;return 3;};
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{ownedCompilation:true,ownedWaits:true,cancelled:()=>cancelled}),NativeFarGpuCancelled);
 assert.equal(f.calls.at(-1),'delete');f.restored();releaseNativeFarGpuCache(f.renderer);
});

test('a real fence fault is preserved when ownership changes inside the query',async()=>{
 const f=ownedFixture();let cancelled=false;f.renderer.getContext().clientWaitSync=()=>{cancelled=true;return 4;};
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{ownedCompilation:true,ownedWaits:true,cancelled:()=>cancelled}),error=>!(error instanceof NativeFarGpuCancelled)&&error.message==='Native GPU fence failed');
 f.restored();releaseNativeFarGpuCache(f.renderer);
});

test('opt-in owned compilation bypasses Three async polling and preserves native draw/fence recipe',async()=>{
 const f=fixture(),material={};let queries=0;
 f.renderer.compile=(root,camera,scene)=>{assert.equal(root,f.root);assert.equal(scene,f.scene);f.calls.push('compile-owned');return new Set([material]);};
 f.renderer.properties={get:()=>({currentProgram:{isReady:()=>++queries>=2}})};
 f.renderer.compileAsync=()=>assert.fail('Three async timer must not start');
 await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{ownedCompilation:true,nextFrame:async()=>{}});
 assert.equal(queries,2);assert.deepEqual(f.calls,['compile-owned','render','restore','fence','flush','delete']);
 f.restored();assert.equal(f.root.parent,f.parent);releaseNativeFarGpuCache(f.renderer);
});

test('direct owned compilation observes owner cancellation while RAF is suspended',async()=>{
 const f=fixture(),material={};let cancelled=false,queries=0;
 f.renderer.compile=()=>new Set([material]);
 f.renderer.properties={get:()=>({currentProgram:{isReady:()=>{assert.equal(cancelled,false);queries++;return false;}}})};
 f.renderer.compileAsync=()=>assert.fail('Three async timer must not start');
 const pending=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{ownedCompilation:true,cancelled:()=>cancelled,nextFrame:()=>new Promise(()=>{})});
 await new Promise(resolve=>setImmediate(resolve));cancelled=true;
 await assert.rejects(pending,error=>error instanceof NativeFarGpuCancelled&&error.reason==='owner-cancelled');
 const finalQueries=queries;await new Promise(resolve=>setTimeout(resolve,25));assert.equal(queries,finalQueries);
 assert.deepEqual(f.calls,[]);f.restored();assert.equal(f.root.parent,f.parent);releaseNativeFarGpuCache(f.renderer);
});

test('direct owned compilation rejects context loss and restoration before another query',async()=>{
 const f=fixture(),material={};f.renderer.domElement=new EventTarget();let queries=0;
 f.renderer.compile=()=>new Set([material]);
 f.renderer.properties={get:()=>({currentProgram:{isReady:()=>{assert.equal(nativeFarGpuRevision(f.renderer),0);queries++;return false;}}})};
 const pending=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{ownedCompilation:true});
 await new Promise(resolve=>setImmediate(resolve));f.renderer.domElement.dispatchEvent(new Event('webglcontextlost'));f.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));
 await assert.rejects(pending,error=>error instanceof NativeFarGpuCancelled&&error.reason==='context-changed');
 const finalQueries=queries;await new Promise(resolve=>setTimeout(resolve,25));assert.equal(queries,finalQueries);
 assert.deepEqual(f.calls,[]);f.restored();releaseNativeFarGpuCache(f.renderer);
});

test('direct owned compilation applies the native deadline without starting a draw',async()=>{
 const f=fixture(),material={};f.renderer.compile=()=>new Set([material]);
 f.renderer.properties={get:()=>({currentProgram:{isReady:()=>false}})};
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{ownedCompilation:true,timeout:15}),/timed out/);
 assert.deepEqual(f.calls,[]);f.restored();releaseNativeFarGpuCache(f.renderer);
});

test('owned compiler candidate cancels the real preparation and stops its readiness queries',async()=>{
 const f=fixture(),texture=new Texture(),owner=new AbortController(),material={};let queries=0;
 f.renderer.compile=(root,camera,scene)=>{assert.equal(root,f.root);assert.equal(scene,f.scene);f.calls.push('compile-owned');return new Set([material]);};
 f.renderer.properties={get:()=>({currentProgram:{isReady:()=>{assert.equal(owner.signal.aborted,false);queries++;return false;}}})};
 f.renderer.compileAsync=(root,camera,scene)=>compileGpuPreparation(f.renderer,root,camera,scene,{
  signal:owner.signal,pollIntervalMs:5,check:()=>{if(owner.signal.aborted)throw new NativeFarGpuCancelled('owner-cancelled');}
 });
 const preparing=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{cancelled:()=>owner.signal.aborted});
 await new Promise(resolve=>setImmediate(resolve));owner.abort();
 await assert.rejects(preparing,error=>error instanceof NativeFarGpuCancelled&&error.reason==='owner-cancelled');
 const finalQueries=queries;await new Promise(resolve=>setTimeout(resolve,15));assert.equal(queries,finalQueries);
 assert.deepEqual(f.calls,['texture','compile-owned']);f.restored();assert.equal(f.root.parent,f.parent);
 releaseNativeFarGpuCache(f.renderer);assert.equal(texture._listeners.dispose.length,0);
});

test('owned compiler candidate cannot fence programs from a lost and restored native cache epoch',async()=>{
 const f=fixture(),material={};f.renderer.domElement=new EventTarget();let queries=0;
 f.renderer.compile=()=>new Set([material]);
 f.renderer.properties={get:()=>({currentProgram:{isReady:()=>{assert.equal(nativeFarGpuRevision(f.renderer),0);queries++;return false;}}})};
 f.renderer.compileAsync=(root,camera,scene)=>{
  const epoch=nativeFarGpuRevision(f.renderer);
  return compileGpuPreparation(f.renderer,root,camera,scene,{pollIntervalMs:5,check:()=>{if(nativeFarGpuRevision(f.renderer)!==epoch)throw new NativeFarGpuCancelled('context-changed');}});
 };
 const preparing=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[]);
 await new Promise(resolve=>setImmediate(resolve));
 f.renderer.domElement.dispatchEvent(new Event('webglcontextlost'));f.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));
 await assert.rejects(preparing,error=>error instanceof NativeFarGpuCancelled&&error.reason==='context-changed');
 const finalQueries=queries;await new Promise(resolve=>setTimeout(resolve,15));assert.equal(queries,finalQueries);
 assert.equal(f.calls.includes('render'),false);assert.equal(f.calls.includes('fence'),false);f.restored();
 assert.equal(f.root.parent,f.parent);releaseNativeFarGpuCache(f.renderer);
});

test('candidate compile waiter lets real preparation unwind an owner abort without late drawing',async()=>{
 const f=fixture(),texture=new Texture(),owner=new AbortController();let rejectDriver;
 f.renderer.compileAsync=()=>{
  f.calls.push('compile-pending');
  return waitGpuPreparation(new Promise((resolve,reject)=>rejectDriver=reject),{
   signal:owner.signal,pollIntervalMs:5,nextFrame:()=>new Promise(()=>{}),
   check:()=>{if(owner.signal.aborted)throw new NativeFarGpuCancelled('owner-cancelled');}
  });
 };
 const preparing=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{cancelled:()=>owner.signal.aborted});
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.calls,['texture','compile-pending']);
 owner.abort();await assert.rejects(preparing,error=>error instanceof NativeFarGpuCancelled&&error.reason==='owner-cancelled');
 f.restored();assert.equal(f.root.parent,f.parent);assert.equal(f.calls.includes('render'),false);assert.equal(f.calls.includes('fence'),false);
 releaseNativeFarGpuCache(f.renderer);assert.equal(texture._listeners.dispose.length,0);
 rejectDriver(Error('late driver rejection'));await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(f.calls,['texture','compile-pending']);
});

test('candidate compile waiter rejects lost/restored context without a stale readiness fence',async()=>{
 const f=fixture(),texture=new Texture();f.renderer.domElement=new EventTarget();let resolveDriver;
 f.renderer.compileAsync=()=>{
  const generation=nativeFarGpuRevision(f.renderer);f.calls.push('compile-pending');
  return waitGpuPreparation(new Promise(resolve=>resolveDriver=resolve),{
   pollIntervalMs:5,nextFrame:()=>new Promise(()=>{}),
   check:()=>{if(nativeFarGpuRevision(f.renderer)!==generation)throw new NativeFarGpuCancelled('context-changed');}
  });
 };
 const preparing=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture]);
 await new Promise(resolve=>setImmediate(resolve));
 f.renderer.domElement.dispatchEvent(new Event('webglcontextlost'));
 f.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));
 await assert.rejects(preparing,error=>error instanceof NativeFarGpuCancelled&&error.reason==='context-changed');
 f.restored();assert.equal(f.root.parent,f.parent);assert.equal(nativeFarGpuRevision(f.renderer),2);
 resolveDriver();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(f.calls,['texture','compile-pending']);releaseNativeFarGpuCache(f.renderer);assert.equal(texture._listeners.dispose.length,0);
});
test('GPU preparation compiles, uploads through zero-pixel draw and yields until fence signals',async()=>{
 const f=fixture(),texture={};let frames=0;
 const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture,texture],{nextFrame:async()=>{frames++;}});
 assert.equal(result.textures,1);assert.equal(frames,1);assert.equal(f.root.parent,f.parent);assert.equal(f.current(),f.original);f.restored();
 assert.deepEqual(f.calls,['texture','compile','render','restore','fence','flush','delete']);
});

test('normal streaming proves completion with an async fence without synchronous error readbacks',async()=>{
 const f=fixture();f.renderer.getContext().getError=()=>{throw Error('Synchronous GL error readback');};
 const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{nextFrame:async()=>{}});
 assert.equal(result.textures,0);assert.ok(f.calls.includes('fence'));assert.ok(f.calls.includes('delete'));f.restored();
});

test('isolated upload restores unrelated visibility and shadow scheduling before fencing',async()=>{
 const f=fixture(),other=new Mesh();f.scene.add(other);f.renderer.shadowMap={enabled:true,autoUpdate:true,needsUpdate:true};
 const originalDraw=f.renderer.render;f.renderer.render=()=>{assert.equal(other.visible,false);assert.equal(f.renderer.shadowMap.enabled,true);assert.equal(f.renderer.shadowMap.autoUpdate,false);originalDraw();};
 const gl=f.renderer.getContext(),originalFence=gl.fenceSync;gl.fenceSync=(...args)=>{assert.equal(other.visible,true);assert.equal(f.renderer.shadowMap.autoUpdate,true);assert.equal(f.renderer.shadowMap.needsUpdate,true);return originalFence(...args);};
 await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{isolateRoot:true,nextFrame:async()=>{}});assert.equal(other.visible,true);f.restored();
});

test('isolated draw failure restores the full render state without disposing borrowed resources',async()=>{
 const f=fixture({renderError:true}),mesh=new Mesh(),other=new Mesh();other.visible=false;f.root.add(mesh);f.scene.add(other);
 let disposals=0;mesh.geometry.addEventListener('dispose',()=>disposals++);mesh.material.addEventListener('dispose',()=>disposals++);
 f.renderer.shadowMap={enabled:true,autoUpdate:false,needsUpdate:true};
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{isolateRoot:true}),/Draw failed/);
 assert.equal(mesh.frustumCulled,true);assert.equal(other.visible,false);assert.equal(f.root.parent,f.parent);
 assert.deepEqual(f.renderer.shadowMap,{enabled:true,autoUpdate:false,needsUpdate:true});f.restored();
 assert.equal(disposals,0);assert.equal(f.calls.includes('fence'),false);releaseNativeFarGpuCache(f.renderer);
});

test('isolated cancellation while waiting for the fence leaves the next gameplay draw intact',async()=>{
 const f=fixture(),other=new Mesh();f.scene.add(other);let cancelled=false;
 f.renderer.shadowMap={enabled:true,autoUpdate:true,needsUpdate:true};
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{isolateRoot:true,cancelled:()=>cancelled,nextFrame:async()=>{
  assert.equal(other.visible,true);assert.equal(f.root.parent,f.parent);f.restored();
  assert.deepEqual(f.renderer.shadowMap,{enabled:true,autoUpdate:true,needsUpdate:true});cancelled=true;
 }}),NativeFarGpuCancelled);
 assert.equal(f.calls.at(-1),'delete');assert.equal(other.visible,true);f.restored();releaseNativeFarGpuCache(f.renderer);
});

test('overlapping isolated preparation restores flags between out-of-order compile completions',async()=>{
 const f=fixture(),mesh=new Mesh(),other=new Mesh();f.root.add(mesh);f.scene.add(other);
 const pending=[];f.renderer.compileAsync=()=>new Promise(resolve=>pending.push(resolve));
 f.renderer.shadowMap={enabled:true,autoUpdate:true,needsUpdate:true};const draw=f.renderer.render;
 f.renderer.render=()=>{assert.equal(other.visible,false);assert.equal(mesh.frustumCulled,false);draw();};
 const first=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{isolateRoot:true,nextFrame:async()=>{}});
 const second=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{isolateRoot:true,nextFrame:async()=>{}});
 assert.equal(other.visible,true);assert.equal(mesh.frustumCulled,true);
 pending[1]();await second;assert.equal(other.visible,true);assert.equal(mesh.frustumCulled,true);f.restored();
 pending[0]();await first;assert.equal(other.visible,true);assert.equal(mesh.frustumCulled,true);f.restored();
 assert.deepEqual(f.renderer.shadowMap,{enabled:true,autoUpdate:true,needsUpdate:true});
 assert.equal(f.calls.filter(call=>call==='delete').length,2);releaseNativeFarGpuCache(f.renderer);
});
test('failed zero-pixel draw restores renderer and parent before rejecting',async()=>{
 const f=fixture({renderError:true});await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[]),/Draw failed/);
 assert.equal(f.root.parent,f.parent);assert.equal(f.current(),f.original);f.restored();assert.deepEqual(f.calls,['compile','render','restore']);
});

test('overlapping species compilation leaves culling unchanged until each synchronous upload draw',async()=>{
 const f=fixture(),a=new Mesh(),b=new Mesh();b.frustumCulled=false;f.root.add(a,b);const pending=[];
 f.renderer.compileAsync=()=>new Promise(resolve=>pending.push(resolve));const draw=f.renderer.render;
 f.renderer.render=()=>{assert.equal(a.frustumCulled,false);assert.equal(b.frustumCulled,false);draw();};
 const options={nextFrame:async()=>{}},first=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],options),second=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],options);
 assert.equal(pending.length,2);assert.equal(a.frustumCulled,true);assert.equal(b.frustumCulled,false);
 pending[1]();await second;assert.equal(a.frustumCulled,true);assert.equal(b.frustumCulled,false);
 pending[0]();await first;assert.equal(a.frustumCulled,true);assert.equal(b.frustumCulled,false);f.restored();
});

test('failed upload draw restores native mesh culling without changing intentionally unculled meshes',async()=>{
 const f=fixture({renderError:true}),a=new Mesh(),b=new Mesh();b.frustumCulled=false;f.root.add(a,b);
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{nextFrame:async()=>{}}),/Draw failed/);
 assert.equal(a.frustumCulled,true);assert.equal(b.frustumCulled,false);f.restored();
});
test('cancelled preparation never compiles or draws',async()=>{
 const f=fixture();await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{cancelled:()=>true}),/cancelled/);assert.deepEqual(f.calls,[]);
});
test('cancellation during fence polling releases the sync and leaves rendering restored',async()=>{
 const f=fixture();let cancelled=false;
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{cancelled:()=>cancelled,nextFrame:async()=>{cancelled=true;}}),/cancelled/);
 f.restored();assert.equal(f.root.parent,f.parent);assert.equal(f.calls.at(-1),'delete');
});
test('texture preparation deduplicates and yields between bounded batches before compilation',async()=>{
 const f=fixture(),a={},b={},c={},d={},e={};
 const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[a,b,c,a,d,e],{texturesPerFrame:2,nextFrame:async()=>f.calls.push('frame')});
 assert.equal(result.textures,5);assert.equal(result.textureBatches,3);assert.equal(result.maxTextureBatchCount,2);
 assert.deepEqual(f.calls.slice(0,8),['texture','texture','frame','texture','texture','frame','texture','compile']);
});
test('cancelling between texture batches prevents remaining uploads and compilation',async()=>{
 const f=fixture();let cancelled=false;
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[{},{}],{cancelled:()=>cancelled,nextFrame:async()=>{cancelled=true;}}),/cancelled/);
 assert.deepEqual(f.calls,['texture']);f.restored();
 for(const texturesPerFrame of [0,-1,1.5,Infinity])await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{texturesPerFrame}),/budget/);
});
test('optional image decoding finishes before upload and cancellation prevents upload',async()=>{
 const f=fixture(),texture={image:{decode:async()=>f.calls.push('decode')}};
 const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{decodeImages:true,nextFrame:async()=>{}});
 assert.deepEqual(f.calls.slice(0,3),['decode','texture','compile']);assert.ok(result.textureUploads[0].decodeMs>=0);
 let cancelled=false;const g=fixture();await assert.rejects(prepareNativeFarGpu(g.renderer,g.root,g.scene,{},[{image:{decode:async()=>{cancelled=true;}}}],{decodeImages:true,cancelled:()=>cancelled}),/cancelled/);assert.deepEqual(g.calls,[]);
});

test('warm texture generations skip upload budgets but always compile, draw and fence new native packing',async()=>{
 const f=fixture(),textures=[new Texture(),new Texture(),new Texture()];let frames=0;
 const options={nextFrame:async()=>frames++};await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},textures,options);const first=f.calls.filter(c=>c==='texture').length;
 frames=0;const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},textures,options);assert.equal(result.cachedTextures,3);assert.equal(result.textureBatches,0);assert.equal(frames,0);assert.equal(f.calls.filter(c=>c==='texture').length,first);assert.equal(f.calls.filter(c=>c==='compile').length,2);assert.equal(f.calls.filter(c=>c==='fence').length,2);
 textures[0].needsUpdate=true;await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},textures,options);assert.equal(f.calls.filter(c=>c==='texture').length,first+1);
 textures[1].dispose();await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},textures,options);assert.equal(f.calls.filter(c=>c==='texture').length,first+2);
 releaseNativeFarGpuCache(f.renderer);await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},textures,options);assert.equal(f.calls.filter(c=>c==='texture').length,first+5);
});
test('context restoration invalidates warm texture budgets independently per renderer',async()=>{
 const f=fixture(),g=fixture(),texture=new Texture();f.renderer.domElement=new EventTarget();
 await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});await prepareNativeFarGpu(g.renderer,g.root,g.scene,{},[texture],{nextFrame:async()=>{}});assert.equal(f.calls.filter(c=>c==='texture').length,1);assert.equal(g.calls.filter(c=>c==='texture').length,1);
 f.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});assert.equal(f.calls.filter(c=>c==='texture').length,2);releaseNativeFarGpuCache(f.renderer);releaseNativeFarGpuCache(g.renderer);
});

test('shared image source changes require a new upload budget even without texture wrapper version change',async()=>{
 const f=fixture(),texture=new Texture();await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});const before=texture.version;texture.source.needsUpdate=true;assert.equal(texture.version,before);
 const report=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});assert.equal(report.cachedTextures,0);assert.equal(report.textureUploads.length,1);releaseNativeFarGpuCache(f.renderer);
});


test('closing a renderer owner releases texture and context listeners, including after restoration',async()=>{
 const f=fixture(),listeners=new Map();f.renderer.domElement={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type,fn)=>{assert.equal(listeners.get(type),fn);listeners.delete(type);}};const texture=new Texture();
 await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});assert.equal(listeners.size,2);assert.equal(texture._listeners.dispose.length,1);
 listeners.get('webglcontextrestored')();await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});assert.equal(texture._listeners.dispose.length,1);
 releaseNativeFarGpuCache(f.renderer);assert.equal(listeners.size,0);assert.equal(texture._listeners.dispose.length,0);releaseNativeFarGpuCache(f.renderer);
});
test('a late cancelled request cannot create an owner after its cache was released',async()=>{
 const f=fixture();let additions=0;f.renderer.domElement={addEventListener:()=>additions++,removeEventListener:()=>{}};releaseNativeFarGpuCache(f.renderer);
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[new Texture()],{cancelled:()=>true}),/cancelled/);assert.equal(additions,0);assert.deepEqual(f.calls,[]);
});


test('a cancelled generation keeps only uploads already completed for the next generation',async()=>{
 const f=fixture(),textures=[new Texture(),new Texture()];let cancelled=false;
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},textures,{cancelled:()=>cancelled,nextFrame:async()=>{cancelled=true;}}),/cancelled/);assert.deepEqual(f.calls,['texture']);
 const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},textures,{nextFrame:async()=>{}});assert.equal(result.cachedTextures,1);assert.equal(result.textureUploads.length,1);assert.equal(f.calls.filter(c=>c==='texture').length,2);releaseNativeFarGpuCache(f.renderer);
});
test('a failed texture upload is never reused by a subsequent generation',async()=>{
 const f=fixture(),texture=new Texture();f.renderer.initTexture=()=>{throw Error('Upload failed');};await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture]),/Upload failed/);
 f.renderer.initTexture=()=>f.calls.push('texture');const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});assert.equal(result.cachedTextures,0);assert.equal(result.textureUploads.length,1);releaseNativeFarGpuCache(f.renderer);
});

test('context restoration invalidates a completed native tree proof before any handoff can reuse it',async()=>{
 const f=fixture(),texture=new Texture();f.renderer.domElement=new EventTarget();const world={renderer:f.renderer,renderOrigin:{revision:0},assetGroups:{colors:new Map()}},native={revision:1,batches:new Map([[{}, {ids:new Set(['tree'])}]])},proof=new NativePreparedTreeCoverage(native,()=>nativeFarRenderSignature(world,0));
 await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});proof.complete(proof.capture());assert.equal(proof.has('tree'),true);const old=proof.capture();f.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));proof.update();assert.equal(proof.has('tree'),false);assert.equal(proof.complete(old),0);
 const current=proof.capture();await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});assert.equal(proof.complete(current),1);assert.equal(proof.has('tree'),true);releaseNativeFarGpuCache(f.renderer);
});

test('loss invalidates an in-flight fence generation and clears warm texture ownership before restoration',async()=>{
 const f=fixture(),texture=new Texture();f.renderer.domElement=new EventTarget();let lost=false;f.renderer.getContext().isContextLost=()=>lost;
 const pending=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{lost=true;f.renderer.domElement.dispatchEvent(new Event('webglcontextlost'));}});
 await assert.rejects(pending,/cancelled/);assert.equal(nativeFarGpuContextLost(f.renderer),true);assert.equal(nativeFarGpuRevision(f.renderer),1);assert.equal(f.calls.at(-1),'delete');f.restored();
 lost=false;f.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));assert.equal(nativeFarGpuContextLost(f.renderer),false);assert.equal(nativeFarGpuRevision(f.renderer),2);
 const recovered=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});assert.equal(recovered.cachedTextures,0);assert.equal(recovered.textureUploads.length,1);releaseNativeFarGpuCache(f.renderer);
});

test('diagnostic error after fence completion rejects the proof and releases the fence',async()=>{
 const f=fixture();let reads=0;f.renderer.getContext().getError=()=>++reads===4?0x502:0;
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{nextFrame:async()=>{},diagnoseErrors:true}),/Native GPU preparation error 0x502/);
 assert.equal(f.calls.at(-1),'delete');f.restored();releaseNativeFarGpuCache(f.renderer);
});

test('opt-in diagnostics distinguish pre-existing GL faults before uploading or drawing',async()=>{
 const f=fixture();f.renderer.getContext().getError=()=>0x502;
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{diagnoseErrors:true}),/0x502 \(before preparation\)/);assert.deepEqual(f.calls,[]);releaseNativeFarGpuCache(f.renderer);
});
test('opt-in diagnostic upload-draw faults preserve renderer cleanup and report the failing stage',async()=>{
 const f=fixture();let code=0;const render=f.renderer.render;f.renderer.render=()=>{render();code=0x502;};f.renderer.getContext().getError=()=>code;
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{diagnoseErrors:true}),/0x502 \(after upload draw\)/);f.restored();assert.equal(f.calls.at(-1),'restore');releaseNativeFarGpuCache(f.renderer);
});

test('release during initTexture prevents late texture handler registration',async()=>{
 const f=fixture(),listeners=new Set(),texture=new Texture();f.renderer.domElement={addEventListener:(name,fn)=>listeners.add(fn),removeEventListener:(name,fn)=>listeners.delete(fn)};f.renderer.initTexture=()=>releaseNativeFarGpuCache(f.renderer);
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}}),/cancelled/);assert.equal(listeners.size,0);assert.equal(texture._listeners?.dispose?.length??0,0);assert.ok(!f.calls.includes('compile'));
});
test('released in-flight compile cannot adopt or release a replacement cache',async()=>{
 const f=fixture(),listeners=new Set(),oldTexture=new Texture(),newTexture=new Texture();f.renderer.domElement={addEventListener:(name,fn)=>listeners.add(fn),removeEventListener:(name,fn)=>listeners.delete(fn)};let complete;f.renderer.compileAsync=()=>new Promise(r=>complete=r);
 const old=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[oldTexture],{nextFrame:async()=>{}});releaseNativeFarGpuCache(f.renderer);assert.equal(listeners.size,0);f.renderer.compileAsync=async()=>{};
 await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[newTexture],{nextFrame:async()=>{}});complete();await assert.rejects(old,/cancelled/);assert.equal(listeners.size,2);assert.equal(oldTexture._listeners.dispose.length,0);assert.equal(newTexture._listeners.dispose.length,1);releaseNativeFarGpuCache(f.renderer);assert.equal(listeners.size,0);
});


test('a restored context cannot accept compilation started in an earlier resource generation',async()=>{
 const f=fixture(),texture=new Texture();f.renderer.domElement=new EventTarget();let finish;
 f.renderer.compileAsync=()=>new Promise(resolve=>finish=resolve);
 const old=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});
 f.renderer.domElement.dispatchEvent(new Event('webglcontextlost'));
 f.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));
 f.renderer.compileAsync=async()=>{};
 const fresh=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{nextFrame:async()=>{}});
 assert.equal(fresh.cachedTextures,0);assert.equal(f.calls.filter(c=>c==='fence').length,1);
 finish();await assert.rejects(old,error=>error instanceof NativeFarGpuCancelled&&error.reason==='context-changed');
 assert.equal(f.calls.filter(c=>c==='render').length,1);assert.equal(f.calls.filter(c=>c==='fence').length,1);
 assert.equal(texture._listeners.dispose.length,1);assert.equal(nativeFarGpuRevision(f.renderer),2);
 f.restored();releaseNativeFarGpuCache(f.renderer);
});


test('a real draw fault is not reclassified when ownership changes during that failing draw',async()=>{
 const f=fixture();let cancelled=false;
 f.renderer.render=()=>{cancelled=true;throw Error('Draw failed during invalidation');};
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{cancelled:()=>cancelled}),error=>!(error instanceof NativeFarGpuCancelled)&&error.message==='Draw failed during invalidation');
 f.restored();releaseNativeFarGpuCache(f.renderer);
});


test('loading queue preserves concurrent texture uploads but serializes compilation/fences and rejects stale jobs',async()=>{
 const f=fixture();let releaseFirst,started,compiles=0,frames=0,stale=false,held=false;const entered=new Promise(resolve=>started=resolve);f.renderer.compile=()=>{compiles++;return new Set();};f.renderer.compileAsync=()=>assert.fail('Unowned Three timer');
 const options={cooperative:true,nextFrame:async()=>{frames++;if(!held&&f.calls.includes('fence')){held=true;started();await new Promise(resolve=>releaseFirst=resolve);}}},first=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],options);await entered;
 const second=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[new Texture()],{...options,cancelled:()=>stale}),rejected=assert.rejects(second,e=>e instanceof NativeFarGpuCancelled);stale=true;const third=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[new Texture()],options);assert.equal(compiles,1);assert.equal(f.calls.filter(c=>c==='texture').length,2);assert.equal(f.calls.filter(c=>c==='render').length,1);releaseFirst();await first;await rejected;await third;assert.equal(compiles,2);assert.equal(f.calls.filter(c=>c==='render').length,2);assert.equal(f.calls.filter(c=>c==='delete').length,2);assert.ok(frames>=3);f.restored();
 await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],options);assert.equal(compiles,3);
});


test('loading-only preparation cancels owned program polls without Three async timers',async()=>{
 const f=fixture(),material={};let queries=0,started,cancelled=false;const entered=new Promise(resolve=>started=resolve);
 const program={isReady:()=>{queries++;started();return false;}};f.renderer.compile=()=>new Set([material]);f.renderer.properties.get=()=>({currentProgram:program,programs:new Map([['screen',program]])});f.renderer.compileAsync=()=>assert.fail('Three async timer');
 const pending=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{cooperative:true,cancelled:()=>cancelled,nextFrame:async()=>{}});await entered;cancelled=true;
 await assert.rejects(pending,error=>error instanceof NativeFarGpuCancelled);const count=queries;await new Promise(resolve=>setTimeout(resolve,20));assert.equal(queries,count);assert.equal(f.calls.includes('render'),false);assert.equal(f.calls.includes('fence'),false);f.restored();releaseNativeFarGpuCache(f.renderer);
});

test('queued loading job can stop waiting while an older owner remains pending',async()=>{
 const f=fixture();let releaseFrame,started,cancelled=false,held=false;const entered=new Promise(resolve=>started=resolve);
 const options={cooperative:true,nextFrame:()=>{if(!held){held=true;started();return new Promise(resolve=>releaseFrame=resolve);}return Promise.resolve();}};
 const first=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],options);await entered;
 const second=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{...options,cancelled:()=>cancelled});cancelled=true;try{await assert.rejects(second,error=>error instanceof NativeFarGpuCancelled);assert.equal(f.calls.includes('compile'),false);}finally{releaseFrame();await first;f.restored();releaseNativeFarGpuCache(f.renderer);}
});


test('cooperative image decoder can cancel with suspended RAF and observes late failure',async()=>{
 const f=ownedFixture();let cancelled=false,rejectDecode;const texture=new Texture({decode:()=>new Promise((resolve,reject)=>rejectDecode=reject)});
 const pending=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{cooperative:true,decodeImages:true,cancelled:()=>cancelled,nextFrame:()=>new Promise(()=>{})});
 await new Promise(resolve=>setImmediate(resolve));cancelled=true;await assert.rejects(pending,NativeFarGpuCancelled);rejectDecode(Error('late decode failure'));await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.calls,[]);f.restored();releaseNativeFarGpuCache(f.renderer);
});
test('cooperative never-resolving decode respects deadline without a resumed RAF',async()=>{
 const f=ownedFixture(),texture=new Texture({decode:()=>new Promise(()=>{})});
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture],{cooperative:true,decodeImages:true,timeout:5,nextFrame:()=>new Promise(()=>{})}),/timed out/);assert.deepEqual(f.calls,[]);f.restored();releaseNativeFarGpuCache(f.renderer);
});


test('cooperative isolated preparation restores world flags before a cancellable held fence',async()=>{
 const f=fixture(),other=new Mesh();f.scene.add(other);f.renderer.shadowMap={enabled:true,autoUpdate:true,needsUpdate:true};let cancelled=false,started;
 const entered=new Promise(resolve=>started=resolve),nativeDraw=f.renderer.render;
 f.renderer.render=()=>{assert.equal(other.visible,false);assert.equal(f.renderer.shadowMap.enabled,true);assert.equal(f.renderer.shadowMap.autoUpdate,false);nativeDraw();};
 f.renderer.getContext().clientWaitSync=()=>0;
 const pending=prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{cooperative:true,isolateRoot:true,cancelled:()=>cancelled,nextFrame:()=>{if(f.calls.includes('fence')){assert.equal(other.visible,true);assert.equal(f.root.parent,f.parent);assert.equal(f.renderer.shadowMap.autoUpdate,true);f.restored();started();return new Promise(()=>{});}return Promise.resolve();}});
 await entered;cancelled=true;await assert.rejects(pending,NativeFarGpuCancelled);assert.equal(other.visible,true);assert.equal(f.root.parent,f.parent);assert.deepEqual(f.renderer.shadowMap,{enabled:true,autoUpdate:true,needsUpdate:true});f.restored();releaseNativeFarGpuCache(f.renderer);
});

test('optional GPU upload envelope wraps only synchronous draw, not compile or awaited fence',async()=>{const f=fixture();let active=false,calls=0;const compile=f.renderer.compileAsync;f.renderer.compileAsync=async(...args)=>{assert.equal(active,false);await compile(...args);};const render=f.renderer.render;f.renderer.render=(...args)=>{assert.equal(active,true);return render(...args);};const wait=f.renderer.getContext().clientWaitSync;f.renderer.getContext().clientWaitSync=(...args)=>{assert.equal(active,false);return wait(...args);};await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{nextFrame:async()=>{},measureDraw:run=>{calls++;active=true;try{return run();}finally{active=false;}}});assert.equal(calls,1);f.restored();releaseNativeFarGpuCache(f.renderer);});

test('optional upload envelope preserves native failure and restores borrowed state without a fence',async()=>{const f=fixture({renderError:true});let exited=false;await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{nextFrame:async()=>{},measureDraw:run=>{try{return run();}finally{exited=true;}}}),/Draw failed/);assert.equal(exited,true);assert.equal(f.calls.includes('fence'),false);assert.equal(f.root.parent,f.parent);f.restored();releaseNativeFarGpuCache(f.renderer);});

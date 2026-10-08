import {nativeFarRenderSignature} from '../tools/experiments/native-far-render-signature.js';
import {NativePreparedTreeCoverage} from '../tools/experiments/native-prepared-tree-coverage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Texture,Scene,Group,Vector4,Mesh} from 'three';
import {NativeFarGpuCancelled,prepareNativeFarGpu,releaseNativeFarGpuCache,nativeFarGpuRevision,nativeFarGpuContextLost} from '../tools/experiments/prepare-native-far-gpu.js';

function fixture({renderError=false}={}){
 const scene=new Scene(),parent=new Group(),root=new Group();parent.add(root);const original={},calls=[];let current=original,waits=0,viewport=new Vector4(2,3,100,200),scissor=new Vector4(4,5,60,70),scissorTest=false;
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,WAIT_FAILED:4,NO_ERROR:0,isContextLost:()=>false,fenceSync:()=>{calls.push('fence');return {};},flush:()=>calls.push('flush'),clientWaitSync:()=>++waits<2?0:3,deleteSync:()=>calls.push('delete'),getError:()=>0};
 const renderer={getContext:()=>gl,initTexture:()=>calls.push('texture'),compileAsync:async(r,c,s)=>{assert.equal(r,root);assert.equal(s,scene);calls.push('compile');},autoClear:true,getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>scissorTest,setViewport:(...v)=>{viewport=v[0]?.isVector4?v[0].clone():new Vector4(...v);},setScissor:(...v)=>{scissor=v[0]?.isVector4?v[0].clone():new Vector4(...v);},setScissorTest:v=>{scissorTest=v;if(!v)calls.push('restore');},render:()=>{assert.equal(root.parent,scene);assert.deepEqual(viewport.toArray(),[0,0,0,0]);assert.deepEqual(scissor.toArray(),[0,0,0,0]);assert.equal(scissorTest,true);assert.equal(renderer.autoClear,false);calls.push('render');if(renderError)throw Error('Draw failed');}};
 return {scene,parent,root,original,calls,renderer,current:()=>current,restored(){assert.deepEqual(viewport.toArray(),[2,3,100,200]);assert.deepEqual(scissor.toArray(),[4,5,60,70]);assert.equal(scissorTest,false);assert.equal(renderer.autoClear,true);}};
}
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

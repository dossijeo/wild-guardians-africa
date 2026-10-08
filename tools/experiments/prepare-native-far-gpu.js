import {compileLoadingPrograms} from '../../src/rendering/loading-programs.js';
import {withScreenTarget} from '../../src/rendering/screen-target.js';
import {Vector4} from 'three';
import {withGpuRootIsolation} from './isolated-gpu-root.js';
import {compileGpuPreparation} from './compile-gpu-preparation.js';
import {waitGpuPreparation} from './wait-gpu-preparation.js';
import {waitGpuFrame} from './wait-gpu-frame.js';
// Active renderer owners release the dispose/context listeners on world close.
// Warm images need no repeated upload budget; every packing still draws/fences.
const textureCaches=new WeakMap(),textureOwnerSignals=new WeakMap();
// Only explicit lifetime/context invalidation is cancellation; GL faults remain errors.
export class NativeFarGpuCancelled extends Error {
 constructor(reason){super('Native GPU preparation cancelled: '+reason);this.name='AbortError';this.reason=reason;}
}
// A closed attachment cannot resurrect cache resources through a late callback.
// Weak texture keys retain no world, renderer or event listener.
export function registerNativeFarTextureOwner(texture,signal){
 const previous=textureOwnerSignals.get(texture);if(previous&&previous!==signal)throw Error('Far atlas already belongs to another owner');
 textureOwnerSignals.set(texture,signal);
}
function textureCache(renderer){
 let entry=textureCaches.get(renderer);if(entry)return entry;
 entry={textures:new WeakMap(),handlers:new Map(),epoch:0,contextLost:false,released:false,restore:null,lost:null};
 entry.lost=()=>{entry.contextLost=true;entry.textures=new WeakMap();entry.epoch++;};
 entry.restore=()=>{entry.contextLost=false;entry.textures=new WeakMap();entry.epoch++;};
 renderer.domElement?.addEventListener?.('webglcontextlost',entry.lost);renderer.domElement?.addEventListener?.('webglcontextrestored',entry.restore);textureCaches.set(renderer,entry);return entry;
}
export function nativeFarGpuContextLost(renderer){return textureCaches.get(renderer)?.contextLost??false;}
export function nativeFarGpuRevision(renderer){return textureCaches.get(renderer)?.epoch??0;}
export function releaseNativeFarGpuCache(renderer){const entry=textureCaches.get(renderer);if(!entry)return;entry.released=true;renderer.domElement?.removeEventListener?.('webglcontextlost',entry.lost);renderer.domElement?.removeEventListener?.('webglcontextrestored',entry.restore);for(const [texture,handler] of entry.handlers)texture.removeEventListener?.('dispose',handler);entry.handlers.clear();entry.textures=new WeakMap();textureCaches.delete(renderer);}
function rememberTexture(entry,texture){
 if(!entry.handlers.has(texture)){const disposed=()=>{entry.textures.delete(texture);entry.handlers.delete(texture);texture.removeEventListener?.('dispose',disposed);};entry.handlers.set(texture,disposed);texture.addEventListener?.('dispose',disposed);}
 entry.textures.set(texture,{version:texture.version??0,sourceVersion:texture.source?.version??0});
}

// Prepare the current root using the normal output/shader recipe. Callers bind
// the completed fence to their exact packing and renderable generation.
export async function prepareNativeFarGpu(renderer,root,scene,camera,textures,{cancelled=()=>false,nextFrame,timeout=30000,texturesPerFrame=1,decodeImages=false,diagnoseErrors=false,isolateRoot=false,ownedCompilation=false,ownedWaits=false,cooperative=false}={}){
 if(typeof isolateRoot!=='boolean')throw Error('Invalid isolated GPU preparation option');
 if(typeof ownedCompilation!=='boolean')throw Error('Invalid owned GPU compilation option');
 if(typeof ownedWaits!=='boolean'||ownedWaits&&!ownedCompilation)throw Error('Owned GPU waits require owned compilation');
 if(!Number.isInteger(texturesPerFrame)||texturesPerFrame<1)throw Error('Invalid texture preparation budget');
 const unique=[...new Set(textures)],textureUploads=[],gl=renderer.getContext(),begin=performance.now();let cache,cacheEpoch,sync,textureBatches=0,maxTextureBatchMs=0,maxTextureBatchCount=0;
 const check=()=>{if(cancelled()||cache?.released||unique.some(texture=>textureOwnerSignals.get(texture)?.aborted))throw new NativeFarGpuCancelled('owner-cancelled');if(gl.isContextLost()||cache?.contextLost||cache&&cache.epoch!==cacheEpoch||(ownedWaits||cooperative)&&renderer.getContext()!==gl)throw new NativeFarGpuCancelled('context-changed');if(performance.now()-begin>timeout)throw Error('Native GPU preparation timed out');};
 const frame=()=>(ownedWaits||cooperative)?waitGpuFrame({check,nextFrame}):(nextFrame?nextFrame():new Promise(resolve=>requestAnimationFrame(resolve)));
 const checkErrors=stage=>{if(!diagnoseErrors)return;const code=gl.getError();if(code!==gl.NO_ERROR)throw Error('Native GPU preparation error 0x'+code.toString(16)+' ('+stage+')');};
 check();checkErrors('before preparation');cache=textureCache(renderer);cacheEpoch=cache.epoch;check();const pending=unique.filter(t=>{const record=cache.textures.get(t);return !record||record.version!==(t.version??0)||record.sourceVersion!==(t.source?.version??0);});
 try{
  for(let first=0;first<pending.length;first+=texturesPerFrame){
   check();const start=performance.now(),end=Math.min(pending.length,first+texturesPerFrame);
   for(let i=first;i<end;i++){
    check();const texture=pending[i],image=texture.image,decodeStart=performance.now();
    if(decodeImages&&typeof image?.decode==='function'){
     const decoding=image.decode();
     if(ownedWaits||cooperative)await waitGpuPreparation(decoding,{check,nextFrame:()=>new Promise(()=>{})});else await decoding;
    }check();const decodeMs=performance.now()-decodeStart,before=performance.now();renderer.initTexture(texture);check();checkErrors('after texture upload');rememberTexture(cache,texture);
    textureUploads.push({index:unique.indexOf(texture),width:image?.width??null,height:image?.height??null,imageType:image?.constructor?.name??null,mipmaps:!!texture.generateMipmaps,colorSpace:texture.colorSpace??null,decodeMs,cpuMs:performance.now()-before});
   }
   textureBatches++;maxTextureBatchCount=Math.max(maxTextureBatchCount,end-first);maxTextureBatchMs=Math.max(maxTextureBatchMs,performance.now()-start);
   if(end<pending.length)await frame();
  }
  check();
  const compileDrawAndFence=async()=>{check();
  // Explicit QA gate: preserve the original recipe until native cancellation,
  // visual and traveling checks validate the owned readiness poll.
  if(cooperative)await compileLoadingPrograms(renderer,root,camera,scene,{screen:true,timeout,cancelled:()=>{check();return false;}});
  else if(ownedCompilation)await compileGpuPreparation(renderer,root,camera,scene,{check});
  else await renderer.compileAsync(root,camera,scene);
  check();checkErrors('after compilation');
  // Keep the normal target/output recipe: another render target creates shader
  // variants. A zero viewport/scissor uploads vertex buffers without touching
  // visible pixels or clearing the player's framebuffer.
  const viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear,parent=root.parent,culled=[];
  // Scope this mutation to the synchronous upload draw. Other species may be
  // awaiting compilation concurrently; none may inherit another one's flags.
  try{root.traverse(o=>{if(o.isMesh){culled.push([o,o.frustumCulled]);o.frustumCulled=false;}});scene.add(root);renderer.autoClear=false;renderer.setViewport(0,0,0,0);renderer.setScissor(0,0,0,0);renderer.setScissorTest(true);const draw=()=>{if(cooperative)return withScreenTarget(renderer,()=>{renderer.setViewport(0,0,0,0);renderer.setScissor(0,0,0,0);renderer.setScissorTest(true);return renderer.render(scene,camera);});return renderer.render(scene,camera);};if(isolateRoot)withGpuRootIsolation(renderer,root,scene,draw);else draw();checkErrors('after upload draw');}
  finally{for(const [mesh,value] of culled)mesh.frustumCulled=value;renderer.autoClear=autoClear;renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);root.removeFromParent();if(parent)parent.add(root);}
  sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);if(!sync)throw Error('Native GPU fence unavailable');gl.flush();
  for(;;){check();const status=gl.clientWaitSync(sync,0,0);if(status===gl.WAIT_FAILED)throw Error('Native GPU fence failed');if(ownedWaits||cooperative)check();if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED)break;await frame();}
  // getError can synchronously wait for commands submitted after this fence,
  // including the next gameplay frame. Keep that expensive round trip in
  // explicit diagnostics; readiness still requires the successful GPU fence,
  // a live context, current resource epoch and an uncancelled owner.
  checkErrors('after fence');
  if(ownedWaits||cooperative)check();
  return {elapsedMs:performance.now()-begin,textures:unique.length,cachedTextures:unique.length-pending.length,textureBatches,maxTextureBatchCount,maxTextureBatchMs,textureUploads};
  };
  return cooperative?await queueLoadingFarPrograms(renderer,compileDrawAndFence,{check,nextFrame:frame}):await compileDrawAndFence();
 }finally{if(sync&&(!(ownedWaits||cooperative)||renderer.getContext()===gl&&!gl.isContextLost()&&!cache.contextLost&&cache.epoch===cacheEpoch))gl.deleteSync(sync);}
}

// Loading-only compile/draw queue. Texture preparation remains concurrent;
// program preparation and upload draws/fences are admitted one at a time.
// This avoids serializing long image preparations just to separate native draw
// continuations or concentrating pending compilations in the first draw.
// Ordinary gameplay retains its existing scheduling.
const loadingPreparations=new WeakMap();
function queueLoadingFarPrograms(renderer,draw,{check,nextFrame}){
 const previous=loadingPreparations.get(renderer)??Promise.resolve();let release;
 const gate=new Promise(resolve=>{release=resolve;}),tail=previous.catch(()=>{}).then(()=>gate);loadingPreparations.set(renderer,tail);
 const clear=()=>{if(loadingPreparations.get(renderer)===tail)loadingPreparations.delete(renderer);};tail.then(clear,clear);
 // Waiting for the previous owner must remain cancellable even if its RAF is
 // suspended. Only the explicit frame after admission consumes a RAF; the
 // shared waiter checks the owner/deadline independently while the gate waits.
 return (async()=>{try{await waitGpuPreparation(previous.catch(()=>{}),{check,nextFrame:()=>new Promise(()=>{})});check();await nextFrame();check();return await draw();}finally{release();}})();
}

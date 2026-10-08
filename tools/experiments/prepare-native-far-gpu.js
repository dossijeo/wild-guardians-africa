import {Vector4} from 'three';
import {withScreenTarget} from '../../src/rendering/screen-target.js';
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
export async function prepareNativeFarGpu(renderer,root,scene,camera,textures,{cancelled=()=>false,nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),timeout=30000,texturesPerFrame=1,decodeImages=false,diagnoseErrors=false,cooperative=false}={}){
 if(!Number.isInteger(texturesPerFrame)||texturesPerFrame<1)throw Error('Invalid texture preparation budget');
 const unique=[...new Set(textures)],textureUploads=[],gl=renderer.getContext(),begin=performance.now();let cache,cacheEpoch,sync,textureBatches=0,maxTextureBatchMs=0,maxTextureBatchCount=0;
 const check=()=>{if(cancelled()||cache?.released||unique.some(texture=>textureOwnerSignals.get(texture)?.aborted))throw new NativeFarGpuCancelled('owner-cancelled');if(gl.isContextLost()||cache?.contextLost||cache&&cache.epoch!==cacheEpoch)throw new NativeFarGpuCancelled('context-changed');if(performance.now()-begin>timeout)throw Error('Native GPU preparation timed out');};
 const checkErrors=stage=>{if(!diagnoseErrors)return;const code=gl.getError();if(code!==gl.NO_ERROR)throw Error('Native GPU preparation error 0x'+code.toString(16)+' ('+stage+')');};
 check();checkErrors('before preparation');cache=textureCache(renderer);cacheEpoch=cache.epoch;check();const pending=unique.filter(t=>{const record=cache.textures.get(t);return !record||record.version!==(t.version??0)||record.sourceVersion!==(t.source?.version??0);});
 try{
  for(let first=0;first<pending.length;first+=texturesPerFrame){
   check();const start=performance.now(),end=Math.min(pending.length,first+texturesPerFrame);
   for(let i=first;i<end;i++){
    check();const texture=pending[i],image=texture.image,decodeStart=performance.now();
    if(decodeImages&&typeof image?.decode==='function')await image.decode();check();const decodeMs=performance.now()-decodeStart,before=performance.now();renderer.initTexture(texture);check();checkErrors('after texture upload');rememberTexture(cache,texture);
    textureUploads.push({index:unique.indexOf(texture),width:image?.width??null,height:image?.height??null,imageType:image?.constructor?.name??null,mipmaps:!!texture.generateMipmaps,colorSpace:texture.colorSpace??null,decodeMs,cpuMs:performance.now()-before});
   }
   textureBatches++;maxTextureBatchCount=Math.max(maxTextureBatchCount,end-first);maxTextureBatchMs=Math.max(maxTextureBatchMs,performance.now()-start);
   if(end<pending.length)await nextFrame();
  }
  check();
  const compileDrawAndFence=async()=>{check();
  const compilation=cooperative?withScreenTarget(renderer,()=>renderer.compileAsync(root,camera,scene)):renderer.compileAsync(root,camera,scene);
  await compilation;check();checkErrors('after compilation');
  // Keep the normal target/output recipe: another render target creates shader
  // variants. A zero viewport/scissor uploads vertex buffers without touching
  // visible pixels or clearing the player's framebuffer.
  const viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear,parent=root.parent,culled=[];
  // Scope this mutation to the synchronous upload draw. Other species may be
  // awaiting compilation concurrently; none may inherit another one's flags.
  try{root.traverse(o=>{if(o.isMesh){culled.push([o,o.frustumCulled]);o.frustumCulled=false;}});scene.add(root);renderer.autoClear=false;renderer.setViewport(0,0,0,0);renderer.setScissor(0,0,0,0);renderer.setScissorTest(true);if(cooperative)withScreenTarget(renderer,()=>{renderer.setViewport(0,0,0,0);renderer.setScissor(0,0,0,0);renderer.setScissorTest(true);renderer.render(scene,camera);});else renderer.render(scene,camera);checkErrors('after upload draw');}
  finally{for(const [mesh,value] of culled)mesh.frustumCulled=value;renderer.autoClear=autoClear;renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);root.removeFromParent();if(parent)parent.add(root);}
  sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);if(!sync)throw Error('Native GPU fence unavailable');gl.flush();
  for(;;){check();const status=gl.clientWaitSync(sync,0,0);if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED)break;if(status===gl.WAIT_FAILED)throw Error('Native GPU fence failed');await nextFrame();}
  const errorCode=gl.getError();if(errorCode!==gl.NO_ERROR)throw Error('Native GPU preparation error 0x'+errorCode.toString(16));
  return {elapsedMs:performance.now()-begin,textures:unique.length,cachedTextures:unique.length-pending.length,textureBatches,maxTextureBatchCount,maxTextureBatchMs,textureUploads};
  };
  return cooperative?await queueLoadingFarPrograms(renderer,compileDrawAndFence,{check,nextFrame}):await compileDrawAndFence();
 }finally{if(sync)gl.deleteSync(sync);}
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
 return (async()=>{try{await previous.catch(()=>{});check();await nextFrame();check();return await draw();}finally{release();}})();
}

import * as THREE from 'three/webgpu';
import {WebGLRenderer} from 'three';
import {GpuTimer} from '/tests/browser/gpu-timer.js';

const params=new URLSearchParams(location.search);
const backend=params.get('backend')??'webgpu',scenario=params.get('scenario')??'grass';
const errors=[];window.addEventListener('error',e=>errors.push(e.message));
window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const originalConsoleError=console.error;
console.error=(...args)=>{errors.push(args.map(String).join(' '));originalConsoleError(...args)};
const legacy=backend==='legacy';
const renderer=legacy?new WebGLRenderer({antialias:false,preserveDrawingBuffer:false}):
  new THREE.WebGPURenderer({forceWebGL:backend==='webgl-tsl',trackTimestamp:true,antialias:false});
renderer.setPixelRatio(1);renderer.setSize(1280,720);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;
renderer.info.autoReset=false;
document.body.append(renderer.domElement);
if(!legacy){await renderer.init();renderer._animation.stop()}
const timestampSupported=legacy?null:renderer.backend.trackTimestamp;
if(backend==='webgpu'&&!renderer.backend.isWebGPUBackend)throw Error('WebGPU silently fell back; invalid GPU comparison');
const adapter=(!legacy&&renderer.backend.adapter)||await navigator.gpu?.requestAdapter();
const adapterInfo=adapter?Object.fromEntries(['vendor','architecture','device','description','isFallbackAdapter'].map(k=>[k,adapter.info[k]])):null;
if(!legacy&&renderer.backend.device){
 const initTimestampQuery=renderer.backend.initTimestampQuery;
 renderer.backend.initTimestampQuery=function(type,uid,descriptor){
  if(!this.trackTimestamp){delete descriptor.timestampWrites;return}
  return initTimestampQuery.call(this,type,uid,descriptor);
 };
 renderer.backend.device.addEventListener('uncapturederror',e=>errors.push(String(e.error.message)));
 renderer.backend.device.lost.then(info=>{if(info.reason!=='destroyed')errors.push('device lost: '+info.message)});
}
const sceneType=scenario.startsWith('grass')?'grass':scenario;
const factory=(await import(`./${sceneType}-scene.js`))[`create${sceneType[0].toUpperCase()+sceneType.slice(1)}Scene`];
const fixture=await factory({THREE,backend,renderer,scenario});
const {scene,camera}=fixture;
let night=0,time=0;
const gl=legacy?renderer.getContext():renderer.backend.gl;
// Three's GL timestamp pool cannot nest TIME_ELAPSED queries around shadow
// rendering. Use one external query for the entire submission on both GL paths.
if(gl&&!legacy)renderer.backend.trackTimestamp=false;
const debug=gl?.getExtension('WEBGL_debug_renderer_info');
const hardware={adapter:adapterInfo,userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,
  deviceMemoryGiB:navigator.deviceMemory,glRenderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,
  features:adapter?[...adapter.features]:[],actualBackend:legacy?'WebGLRenderer':renderer.backend.constructor.name};
const timer=gl?new GpuTimer(gl):null;
const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
function pose(t=0,n=night,step=0){time=t;night=n;fixture.update(t,n,step)}
function counts(){const r=renderer.info.render;return {drawCalls:legacy?r.calls:r.drawCalls,triangles:r.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}}
// QA owns the outer frame clock. The internal RAF otherwise lets ShadowNode
// reuse a shadow in some serialized samples but not others (Three r180).
function draw(){
 renderer.info.reset();
 if(!legacy){renderer._nodes.nodeFrame.update();renderer.info.frame=renderer._nodes.nodeFrame.frameId}
 renderer.render(scene,camera);
}
async function resolveFresh(){
 const pool=renderer.backend.timestampQueryPool.render;
 if(!pool?.trackTimestamp||pool.currentQueryIndex===0||pool.pendingResolve)return {valid:false,reason:'no-fresh-query'};
 const queryPairs=pool.currentQueryIndex/2,uniqueContexts=pool.queryOffsets.size;
 const endedQueries=pool.queryStates?[...pool.queryStates.values()].filter(s=>s==='ended').length:queryPairs;
 const disjoint=gl&&pool.ext?gl.getParameter(pool.ext.GPU_DISJOINT_EXT):false;
 const errorCount=errors.length;
 const ms=await renderer.resolveTimestampsAsync('render');
 const disjointAfter=gl&&pool.ext?gl.getParameter(pool.ext.GPU_DISJOINT_EXT):false;
 return {valid:!disjoint&&!disjointAfter&&queryPairs===uniqueContexts&&endedQueries===queryPairs&&errors.length===errorCount&&Number.isFinite(ms)&&ms>=0,ms,belowResolution:ms===0,queryPairs,uniqueContexts,endedQueries,disjoint:disjoint||disjointAfter};
}
async function oneTimed(frame){
 const issued=timer?timer.begin(frame):null;
 const start=performance.now();draw();const cpuMs=performance.now()-start;
 let gpu;
 if(timer){
  timer.end();const deadline=performance.now()+(issued?5000:0);
  while(!timer.samples.some(s=>s.frame===frame)&&performance.now()<deadline){await new Promise(r=>setTimeout(r,0));timer.poll()}
  const sample=timer.samples.find(s=>s.frame===frame);
  gpu={valid:!!sample,ms:sample?.ms,belowResolution:sample?.ms===0};
 }else gpu=await resolveFresh();
 return {frame,cpuMs,gpu,...counts()};
}
window.qa={
 backend,scenario,hardware,metadata:fixture.metadata,errors,renderer,fixture,
 async capture({night:n=0,time:t=1.25,step=0}={}){
  pose(t,n,step);draw();if(!legacy)await resolveFresh();
  // Re-render directly before capture; WebGPU canvas drawing buffers are transient.
  draw();const image=renderer.domElement.toDataURL('image/png');
  if(!legacy)await resolveFresh();
  return {image,counts:counts(),camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray()},errors:[...errors]};
 },
 async run({samples=120,warmup=45,frames=180,moving=true,night:n=0}={}){
  const timed=[];timer?.clear();if(!legacy)renderer.backend.trackTimestamp=!gl&&timestampSupported;
  for(let i=0;i<warmup;i++){pose(i/60,n,moving?i/60:0);await oneTimed(-i-1)}
  for(let i=0;i<samples;i++){pose(i/60,n,moving?i/60:0);timed.push(await oneTimed(i))}
  // Separate unblocked RAF run: no timestamp readbacks or promises inside CPU submission.
  if(!legacy)renderer.backend.trackTimestamp=false;
  const interactive=[];let previous=await raf();
  for(let i=0;i<frames+30;i++){
   const now=await raf();const start=performance.now();
   pose(i/60,n,moving?i/60:0);const updateMs=performance.now()-start;
   const submit=performance.now();draw();const cpuMs=performance.now()-submit;
   if(i>=30)interactive.push({frame:i-30,intervalMs:now-previous,intervalSincePreviousFrame:i-31,updateMs,cpuMs,...counts()});previous=now;
  }
  if(!legacy)renderer.backend.trackTimestamp=!gl&&timestampSupported;
  return {protocol:'v3-deterministic-shadow-frame-external-GL-envelope-GPU-pass-sum',backend,scenario,hardware,metadata:fixture.metadata,options:{samples,warmup,frames,moving,night:n},timed,interactive,
   memory:{jsHeapUsed:performance.memory?.usedJSHeapSize??null,rendererCounts:{...renderer.info.memory},estimated:fixture.metadata?.memory??null},
   timer:timer?{kind:'external-GL-whole-render-envelope',...timer.report()}:{kind:'Three-r180-per-frame-pass-sum',supported:renderer.backend.trackTimestamp},
   errors:[...errors],limitations:['GL uses one external query around all render commands; GPU sums pass durations, excluding inter-pass gaps/transfers: not strictly identical scopes.','Serialized GPU samples are not total wall time or queue latency.','Interactive RAF is measured separately without readback.','JS heap is not GPU memory.']};
 },
 dispose(){fixture.dispose();timer?.dispose();renderer.dispose()}
};
document.querySelector('#status').textContent=`${scenario} · ${hardware.actualBackend} · ${adapterInfo?.vendor??'unknown'}`;
pose();draw();if(!legacy)await resolveFresh();
window.qaReady=true;

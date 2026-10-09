// Smoke-only draft. No imports/calls on the normal path until separately reviewed.
// All snapshots are bounded scalar copies; never call readiness methods to observe them.
const finite=value=>Number.isFinite(value)?value:null;
const text=value=>typeof value==='string'?value.slice(0,160):null;
const section=(issues,label,read)=>{try{return read();}catch{issues.push(label);return null;}};

export function loadingReadinessSnapshot({world,progress=world?.loadingProgress,diorama,cinematic,spans}={}){
 const issues=[];
 const result={scope:'One-time observational readiness snapshot. Queue counts are logical state, not GPU completion or physical memory.',issues};
 result.owner=section(issues,'owner',()=>({present:Boolean(world),disposed:Boolean(world?.disposed),aborted:Boolean(world?.loading?.signal.aborted)}));
 result.progress=section(issues,'progress',()=>{
  if(!progress)return null;
  const stages=[];let count=0;
  for(const value of progress.stages?.values()??[]){count++;if(stages.length<16)stages.push({id:text(value.id),progress:finite(value.progress),started:finite(value.started),finished:finite(value.finished)});}
  return {value:finite(progress.value),ready:Boolean(progress.ready),failed:Boolean(progress.failure),stages,omitted:Math.max(0,count-stages.length)};
 });
 result.actors=section(issues,'actors',()=>{
  const queue=world?.loadingActorQueue;if(!queue)return null;
  const stats=queue.stats??{};
  return {queued:finite(queue.jobs?.length),pumping:Boolean(queue.pumping),closed:Boolean(queue.closed),spent:finite(queue.spent),submitted:finite(stats.submitted),completed:finite(stats.completed),failed:finite(stats.failed),yields:finite(stats.yields)};
 });
 result.chunks=section(issues,'chunks',()=>{
  const stream=world?.chunkStream;if(!stream)return null;
  return {queued:finite(stream.queue?.length),busy:Boolean(stream.busy),desired:finite(stream.desired?.size),failed:finite(stream.failed?.size),closed:Boolean(stream.dead),epoch:finite(stream.epoch)};
 });
 result.far=section(issues,'far',()=>{
  const owner=world?.farVegetation;if(!owner)return null;
  const adapters=owner.adapters??[];
  return {enabled:Boolean(owner.enabled),count:adapters.length,omitted:Math.max(0,adapters.length-8),adapters:adapters.slice(0,8).map((adapter,index)=>{
   const layer=adapter.layer,stream=layer?.stream;
   return {index,current:Boolean(layer?.current),currentKey:text(layer?.current?.key),pendingPreparations:finite(layer?.pendingPreparations),closed:Boolean(layer?.closed),epoch:finite(layer?.epoch),streamPending:Boolean(stream?.pending),streamPendingKey:text(stream?.pending?.key),streamClosed:Boolean(stream?.closed),streamError:Boolean(stream?.error),errorCount:finite(adapter.stats?.errors?.length)};
  })};
 });
 result.presentation=section(issues,'presentation',()=>({dioramaPresent:Boolean(diorama),disposed:Boolean(diorama?.disposed),prepared:Boolean(diorama?.prepared),interactive:Boolean(diorama?.interactive),orbitSettled:diorama?.orbit?Boolean(diorama.orbit.settled):null,orbitStopping:diorama?.orbit?Boolean(diorama.orbit.stopping):null,orbitSpeed:finite(diorama?.orbit?.speed),plantsCount:finite(diorama?.plants?.plants?.length),plantsReady:diorama?.plants?Boolean(diorama.plants.ready):null,plantsProgress:finite(diorama?.plants?.progress),plantsMature:diorama?.plants?Boolean(diorama.plants.mature):null,cinematicPresent:Boolean(cinematic),cinematicArmed:Boolean(cinematic?.armed),cinematicDone:Boolean(cinematic?.done),cinematicTime:finite(cinematic?.time)}));
 result.spans=section(issues,'spans',()=>spans?.snapshot()??null);
 return result;
}

// Reads only the already-owned context, never canvas.getContext/createRenderer.
// Call once at report finish; extension/parameter reads are diagnostic overhead.
export function existingLoadingContextIdentity(world){
 if(!world?.renderer||world.disposed||world.loading?.signal.aborted)return null;
 try{
  const gl=world.renderer.getContext();if(!gl)return null;
  const lost=Boolean(gl.isContextLost());if(lost)return {contextLost:true};
  const debug=gl.getExtension('WEBGL_debug_renderer_info');
  return {contextLost:false,vendor:text(gl.getParameter(gl.VENDOR)),renderer:text(gl.getParameter(gl.RENDERER)),version:text(gl.getParameter(gl.VERSION)),unmaskedVendor:debug?text(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)):null,unmaskedRenderer:debug?text(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)):null,scope:'Existing World renderer context at finish only; identity is not a measured cause.'};
 }catch{return {unavailable:true};}
}

// Compose with the existing optional witness only. No timers, RAF or phase work.
// Preserve prior callback this/arguments/result/exception exactly once.
export function createLoadingReadinessSpanTracker(previous,{now=()=>performance.now()}={}){
 const active=new Map();let dropped=0,lastCompleted=null;
 const copy=row=>({label:text(row?.label),start:finite(row?.start),end:finite(row?.end),duration:finite(row?.duration),failed:Boolean(row?.failed)});
 const key=row=>JSON.stringify([row?.label,row?.start]);
 function witness(...args){
  try{const row=args[0];active.delete(key(row));lastCompleted=copy(row);}catch{}
  return typeof previous==='function'?Reflect.apply(previous,this,args):undefined;
 }
 witness.onBegin=function(...args){
  try{const row=args[0],id=key(row);if(active.size<16||active.has(id))active.set(id,copy(row));else dropped++;}catch{}
  return typeof previous?.onBegin==='function'?Reflect.apply(previous.onBegin,this===witness?previous:this,args):undefined;
 };
 witness.snapshot=()=>{
  let at=null;try{at=finite(now());}catch{}
  return {at,active:[...active.values()].map(row=>({...row,elapsed:at!==null&&row.start!==null?Math.max(0,at-row.start):null})),lastCompleted:lastCompleted?{...lastCompleted}:null,dropped,scope:'Nested awaited wall spans; do not sum as exclusive CPU/GPU time. Associations are labels, not exhaustive readiness proof.'};
 };
 return witness;
}

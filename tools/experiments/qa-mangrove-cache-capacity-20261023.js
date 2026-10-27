import {verifyFixedMask} from './qa-mangrove-fixed-mask-probe-20261023.js';
export async function verifyCacheCapacity(w){
 const c=w.mangroveMaterialCache;if(!c)throw Error('Integrated cache missing');
 const previous=w.farResidentRange,previousSync=w.syncChunks;
 const snapshot=()=>({chunks:w.chunks.size,tracked:c.states.size,cached:c.queue.entries.size,bytes:c.queue.stats.bytes,peakBytes:c.queue.stats.peakBytes,published:c.queue.stats.published,fallback:[...c.states].filter(([,s])=>!s.texture.value).map(([key,s])=>({key,hooks:s.hooks.size})),pending:c.queue.pending.size});
 const settle=async()=>{w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(let i=0;i<180;i++){await new Promise(requestAnimationFrame);w.render(0);}};
 const before=snapshot();let expanded,mask,capture,restored;
 try{
  w.syncChunks=function(...args){this.farResidentRange=3;return previousSync.apply(this,args);};w.farResidentRange=3;await settle();expanded=snapshot();
  if(expanded.tracked<=28||expanded.cached!==28||expanded.fallback.some(s=>s.hooks!==0))throw Error('Capacity/fallback not exercised '+JSON.stringify(expanded));
  mask=await verifyFixedMask(w);mask.captures=[];
  capture=w.renderer.domElement.toDataURL('image/png').split(',')[1];
  if(c.queue.stats.peakBytes>40*1024*1024)throw Error('Capacity exceeded');
 }finally{w.syncChunks=previousSync;w.farResidentRange=previous;await settle();restored=snapshot();}
 if(restored.tracked!==before.tracked||restored.cached!==before.cached||restored.bytes!==before.bytes)throw Error('Residency did not recover');
 if(w.renderer.getContext().getError())throw Error('Capacity GL failure');
 return {before,expanded,mask,restored,capture,scope:'Real native chunks, QA resident radius 3 then restored; synthetic mask invalidation at capacity. Not a performance benchmark.'};
}

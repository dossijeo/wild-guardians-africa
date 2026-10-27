// Exercises the real scene preparation iterator with the live native terrain field.
// The private group is never attached; the existing scheduler cancellation tests
// separately cover which invalidations call return().
export async function inspectLiveWaterCancellation(w,cx,cz){
 const before=[...w.chunks.entries()],probe=Object.create(w);let disposed=0,waterDisposed=0,materialDisposed=0,steps=0;
 probe.disposePreparedTerrain=function(group){
  disposed++;group.traverse(o=>{if(o.userData.nativeFluid==='chunk'){
   o.geometry.addEventListener('dispose',()=>waterDisposed++);
   if(o.material!==this.fluidMaterial)o.material.addEventListener('dispose',()=>materialDisposed++);
  }});return w.disposePreparedTerrain.call(this,group);
 };
 const core=w.spatialSession.core,selected=core.currentChunk();let payload;
 try{if(core.selectChunk(cx,cz)<0)throw Error('Expected resident native chunk');payload=core.chunkPayload();}
 finally{if(selected)core.selectChunk(selected.cx,selected.cz);}
 const iterator=probe.prepareTerrainSteps(cx,cz,payload,{asynchronous:true});
 const initialYields=globalThis.qaChunkWaterBed?.yields??0;
 let interrupted=false,resume;
 try{for(;steps<20000;steps++){
  const step=iterator.next(resume);resume=undefined;if(step.done)throw Error('Preparation finished without an incremental water sample');
  if((globalThis.qaChunkWaterBed?.yields??0)>initialYields){interrupted=true;break;}
  // Existing mud preparation may yield a promise; honor it before continuing.
  if(step.value?.waitFor)resume=await step.value.waitFor;
  else if(step.value&&typeof step.value.then==='function')resume=await step.value;
  else await new Promise(requestAnimationFrame);
 }}finally{iterator.return();}
 if(!interrupted||disposed!==1||waterDisposed!==1||materialDisposed!==1)throw Error('Incomplete cancellation cleanup '+JSON.stringify({interrupted,disposed,waterDisposed,materialDisposed}));
 if(!iterator.next().done)throw Error('Closed iterator resumed');
 if(before.length!==w.chunks.size||before.some(([key,group])=>w.chunks.get(key)!==group))throw Error('Private preparation changed resident chunks');
 return {interrupted,disposed,waterDisposed,materialDisposed,steps,residentGroupsUnchanged:true,scope:'Real scene iterator closed after a sampled water yield; not a forced context-loss or construction test.'};
}

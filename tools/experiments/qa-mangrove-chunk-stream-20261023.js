export async function verifyMangroveChunkStream(w){
 const camera=w.camera.position.clone(),target=w.controls.target.clone(),cache=w.qaRegionCacheOwner;
 if(!cache)throw Error('Expected region cache owner');
 const result={before:{chunks:[...w.chunks.keys()],entries:cache.queue.entries.size,events:{...cache.stats.chunkEvents}},samples:[]};
 try{
  for(const offset of [144,0]){
   w.camera.position.copy(camera);w.camera.position.x+=offset;w.controls.target.copy(target);w.controls.target.x+=offset;
   w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();
   for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);w.render(0);}
   result.samples.push({offset,chunks:[...w.chunks.keys()],registered:[...cache.owner.records.keys()],entries:cache.queue.entries.size,pending:cache.queue.pending.size,events:{...cache.stats.chunkEvents},memory:{...w.renderer.info.memory},glError:w.renderer.getContext().getError()});
   const a=[...w.chunks.keys()].sort().join('|'),b=[...cache.owner.records.keys()].sort().join('|');
   if(a!==b)throw Error('Streamed ground registration mismatch');
  }
  if(!result.samples[0].events.removed||result.samples[0].entries!==0)throw Error('Old region retained after chunk unload');
  return {...result,scope:'Chunk event/cancellation probe only; new chunks retain original ground shading until incremental creation is connected'};
 }finally{w.camera.position.copy(camera);w.controls.target.copy(target);}
}

export async function verifyIncrementalStream(w){
 const camera=w.camera.position.clone(),target=w.controls.target.clone(),cache=w.qaIncrementalGround,samples=[];
 if(!cache)throw Error('Expected incremental cache');
 try{
  for(const offset of [0,144,0]){
   w.camera.position.copy(camera);w.camera.position.x+=offset;w.controls.target.copy(target);w.controls.target.x+=offset;
   w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();
   let stable=0,frames=0;
   while(stable<10){await new Promise(requestAnimationFrame);stable=cache.queue.pending.size===0?stable+1:0;if(++frames>900)throw Error('Incremental cache did not settle');}
   const registered=[...cache.states.keys()].sort(),resident=[...w.chunks.keys()].sort();
   if(registered.join('|')!==resident.join('|'))throw Error('Incremental chunk registry mismatch');
   if([...cache.queue.entries.keys()].some(key=>!cache.states.has(key.split(':')[0])))throw Error('Non-resident cache retained');
   const ready=[...cache.states.values()].filter(s=>s.uniforms.uQaCacheReady.value===1).length;
   if(!ready||cache.queue.stats.peakBytes>32*1024*1024)throw Error('Cache generation or budget failed');
   samples.push({offset,frames,resident:resident.length,registered:registered.length,ready,entries:cache.queue.entries.size,pending:cache.queue.pending.size,queue:{...cache.queue.stats},added:cache.stats.added,removed:cache.stats.removed,memory:{...w.renderer.info.memory},glError:w.renderer.getContext().getError()});
  }
  return {samples,scope:'Real automatic cache regeneration across streamed chunks; settling waits exclude a continuous-motion performance claim'};
 }finally{w.camera.position.copy(camera);w.controls.target.copy(target);}
}

export async function verifyIncrementalTeardown(w){
 const cache=w.qaIncrementalGround;if(!cache)throw Error('Expected incremental cache');
 let stable=0,frames=0;while(stable<10){await new Promise(requestAnimationFrame);stable=cache.queue.pending.size===0?stable+1:0;if(++frames>900)throw Error('Cache failed to settle before teardown');}
 const before={memory:{...w.renderer.info.memory},entries:cache.queue.entries.size,states:cache.states.size,queue:{...cache.queue.stats}};
 cache.dispose();w.render(0);
 const after={memory:{...w.renderer.info.memory},entries:cache.queue.entries.size,states:cache.states.size,pending:cache.queue.pending.size,queue:{...cache.queue.stats},glError:w.renderer.getContext().getError()};
 if(after.entries||after.states||after.pending||after.queue.bytes||after.glError)throw Error('Incremental teardown state leak');
 if(before.memory.textures-after.memory.textures!==before.entries+1)throw Error('Cache/fallback texture leak');
 if(before.memory.geometries-after.memory.geometries!==1)throw Error('Bake geometry leak');
 return {before,after,scope:'Real complete owner teardown and original-shader restoration; no claim about whole-game resource lifecycle'};
}

export async function verifyFineVisibility(w){
 const cache=w.qaIncrementalGround,base=w.camera.position.clone(),samples=[];
 if(!cache?.stats.smooth)throw Error('Expected smooth cache');
 try{
  for(const extraHeight of [0,70,0]){
   w.camera.position.copy(base);w.camera.position.y+=extraHeight;
   for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);samples.push({extraHeight,frame:i,entries:cache.queue.entries.size,bytes:cache.queue.stats.bytes,regions:[...cache.states].filter(([,s])=>s.fine||s.uniforms.uQaFineOn.value>0).map(([key,s])=>({key,wanted:s.wantFine,visibility:s.uniforms.uQaFineOn.value}))});}
  }
  const intermediate=samples.flatMap(s=>s.regions).filter(r=>r.visibility>0&&r.visibility<1);
  if(!intermediate.some(r=>!r.wanted)||!intermediate.some(r=>r.wanted))throw Error('Fine entry/exit did not interpolate');
  return {samples,intermediateSamples:intermediate.length,peakBytes:cache.queue.stats.peakBytes,glError:w.renderer.getContext().getError()};
 }finally{w.camera.position.copy(base);}
}

export async function verifyMaterialEntry(w){
 const c=w.qaIncrementalGround,samples=[];
 for(let frame=0;frame<120;frame++){await new Promise(requestAnimationFrame);samples.push({frame,weights:[...c.states].filter(([,s])=>s.uniforms.uQaCacheReady.value===1).map(([key,s])=>({key,weight:s.uniforms.uQaEntryBlend.value})),bytes:c.queue.stats.bytes});}
 const intermediate=samples.flatMap(s=>s.weights).filter(s=>s.weight>0&&s.weight<1);
 if(!intermediate.length||samples.at(-1).weights.some(s=>s.weight!==1))throw Error('Material entry did not transition to completion');
 return {samples,intermediate:intermediate.length,glError:w.renderer.getContext().getError()};
}

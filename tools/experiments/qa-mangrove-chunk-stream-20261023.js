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

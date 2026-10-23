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

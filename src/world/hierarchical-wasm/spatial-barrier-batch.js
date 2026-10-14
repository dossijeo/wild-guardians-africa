// One topology transaction for a player-authorized wall chain. The WASM
// core validates every item before changing occupancy or refreshing sectors.
export function addSpatialBarriersBatch(wasm,barriers){
  if(!Array.isArray(barriers)||barriers.length<1||barriers.length>1024)
    throw Error('Expected 1–1024 spatial barriers');
  const pointer=wasm.spatial_barrier_batch_ptr(barriers.length);
  if(!pointer)throw Error('Could not allocate the spatial barrier batch');
  const input=new Float32Array(wasm.memory.buffer,pointer,barriers.length*6);
  barriers.forEach((barrier,index)=>{
    const offset=index*6;
    input[offset]=barrier.x;input[offset+1]=barrier.z;
    input[offset+2]=barrier.halfX;input[offset+3]=barrier.halfZ;
    input[offset+4]=barrier.yaw??0;input[offset+5]=barrier.passMask??0;
  });
  if(wasm.spatial_add_barriers_batch(barriers.length)!==barriers.length)
    throw Error('Invalid spatial barrier batch; no barrier was changed');
  return Array.from(new Int32Array(wasm.memory.buffer,
    wasm.spatial_barrier_batch_ids_ptr(),barriers.length));
}

export function applySpatialBarrierChanges(wasm,removeIds,barriers){
  if(!Array.isArray(removeIds)||!Array.isArray(barriers)||
     !removeIds.length&&!barriers.length||removeIds.length>1024||barriers.length>1024)
    throw TypeError('Expected 1–1024 barrier removals or additions');
  if(removeIds.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(removeIds).size!==removeIds.length)
    throw TypeError('Barrier removal IDs must be unique positive integers');
  const additions=barriers.length?wasm.spatial_barrier_batch_ptr(barriers.length):0;
  const removals=removeIds.length?wasm.spatial_barrier_removal_ptr(removeIds.length):0;
  if(barriers.length&&!additions||removeIds.length&&!removals)
    throw Error('Could not allocate spatial topology transaction');
  if(additions){
    const input=new Float32Array(wasm.memory.buffer,additions,barriers.length*6);
    barriers.forEach((barrier,index)=>{
      const offset=index*6;
      input[offset]=barrier.x;input[offset+1]=barrier.z;
      input[offset+2]=barrier.halfX;input[offset+3]=barrier.halfZ;
      input[offset+4]=barrier.yaw??0;input[offset+5]=barrier.passMask??0;
    });
  }
  if(removals)new Int32Array(wasm.memory.buffer,removals,removeIds.length).set(removeIds);
  if(wasm.spatial_apply_barrier_batch(removeIds.length,barriers.length)!==1)
    throw Error('Invalid spatial topology transaction; no barrier was changed');
  return barriers.length?Array.from(new Int32Array(wasm.memory.buffer,
    wasm.spatial_barrier_batch_ids_ptr(),barriers.length)):[];
}

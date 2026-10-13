// One topology transaction for a player-authorized wall chain. The WASM
// core validates every item before changing occupancy or refreshing sectors.
export function addSpatialBarriersBatch(wasm,barriers){
  if(!Array.isArray(barriers)||barriers.length<1||barriers.length>1024)
    throw Error('Expected 1–1024 spatial barriers');
  const pointer=wasm.spatial_barrier_batch_ptr(barriers.length);
  if(!pointer)throw Error('Could not allocate the spatial barrier batch');
  const input=new Float32Array(wasm.memory.buffer,pointer,barriers.length*5);
  barriers.forEach((barrier,index)=>{
    const offset=index*5;
    input[offset]=barrier.x;input[offset+1]=barrier.z;
    input[offset+2]=barrier.halfX;input[offset+3]=barrier.halfZ;
    input[offset+4]=barrier.passMask??0;
  });
  if(wasm.spatial_add_barriers_batch(barriers.length)!==barriers.length)
    throw Error('Invalid spatial barrier batch; no barrier was changed');
  return Array.from(new Int32Array(wasm.memory.buffer,
    wasm.spatial_barrier_batch_ids_ptr(),barriers.length));
}

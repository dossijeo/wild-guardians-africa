export async function verifyThreadPreparation(m,profiles){
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
 const wait=async predicate=>{const start=performance.now();while(!predicate()){if(performance.now()-start>15000)throw Error('Thread preparation timeout');await tick();}};
 const copy=(pointer,bytes)=>new Uint8Array(m.HEAPU8.buffer,pointer,bytes).slice();
 const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
 const reference=()=>[
  copy(m._spatial_heights_ptr(),49*49*4),copy(m._spatial_colors_ptr(),49*49*12),
  copy(m._spatial_ground_mask_ptr(),35*35*4),copy(m._spatial_water_ptr(),48*48),
  copy(m._spatial_water_levels_ptr(),48*48*4),copy(m._spatial_water_triangles_ptr(),m._spatial_water_vertex_count()*12),copy(m._spatial_props_ptr(),m._spatial_prop_count()*40)
 ];
 const rows=[];
 for(let biome=0;biome<6;biome++){
  m._spatial_generate_biome(712,biome,0,0);
  m._spatial_set_settlement(0,0,5,6);
  m._spatial_add_chunk(1,0);
  const raw=new Int32Array(m.HEAPU8.buffer,m._spatial_props_ptr(),m._spatial_prop_count()*10);
  let suppressed=false;for(let i=0;i<raw.length;i+=10)if(raw[i+7]>=0&&raw[i+7]<6){const key=[raw[i+7],raw[i+8],raw[i+9]];suppressed=m._spatial_remove_prop(...key)===1;break;}
  assert(suppressed,'No suppression fixture');m._spatial_remove_chunk(1,0);m._spatial_select_chunk(0,0);
  for(const p of profiles)m._spatial_build_nav_profile(p.index,p.radius,p.worker);
  const before=reference(),memoryBefore=m.HEAPU8.buffer.byteLength,start=performance.now();
  const job=m._spatial_prepare_start(1,0),admissionMs=performance.now()-start;
  assert(job>0,'Failed to enqueue');
  let queryBatches=0,maxQueryBatchMs=0;
  m._spatial_select_nav_profile_index(1);
  const wall=m._spatial_add_oriented_barrier(5,0,1,5,.25,0);
  const route=()=>{const n=m._lazy_route(-3,0,2,0);return {n,bytes:n>0?copy(m._lazy_route_ptr(),n*8):new Uint8Array()};};
  const expectedRoute=route();assert(expectedRoute.n>0,'Route fixture should remain traversable');
  while(m._spatial_prepare_status()!==3){
   assert(performance.now()-start<15000,'Preparation timeout');
   const q=performance.now();
   for(let i=0;i<32;i++){m._spatial_surface(i%16-8,i%7-3);m._spatial_walkable(i%16-8,i%7-3);}
   // Exercise the main thread's mutable sampling scratch while the worker uses its own.
   m._spatial_select_chunk(0,0);
   const actualRoute=route();assert(actualRoute.n===expectedRoute.n&&equal(actualRoute.bytes,expectedRoute.bytes),'Route changed during worker preparation');
   maxQueryBatchMs=Math.max(maxQueryBatchMs,performance.now()-q);queryBatches++;
   await tick();
  }
  assert(m._spatial_prepare_metric(0)===1,'Preparation did not run on a pthread');
  assert(m._spatial_chunk_count()===1,'Preparation published into the live world');
  const current=reference();assert(before.every((a,i)=>equal(a,current[i])),'Worker changed selected live buffers');
  assert(m._spatial_prepare_metric(2)===0,'Unexpected cancellation');
  const computedMs=m._spatial_prepare_metric(1),candidate=Array.from({length:7},(_,i)=>copy(m._spatial_prepare_buffer_ptr(i),m._spatial_prepare_buffer_bytes(i)));
  const rasters=profiles.map(p=>Array.from({length:3},(_,part)=>{const field=10+p.index*3+part;return copy(m._spatial_prepare_buffer_ptr(field),m._spatial_prepare_buffer_bytes(field));}));
  const snapshots={neighbors:m._spatial_prepare_metric(4),settlements:m._spatial_prepare_metric(5),removed:m._spatial_prepare_metric(6)};
  assert(snapshots.removed>0,'Suppression snapshot was not exercised');
  m._spatial_add_chunk(1,0);const generated=reference();
  assert(candidate.every((a,i)=>equal(a,generated[i])),`Payload mismatch biome ${biome}`);
  for(const [i,p]of profiles.entries())for(let part=0;part<3;part++)assert(equal(rasters[i][part],copy(m._spatial_prepare_reference_raster_ptr(p.index,1,0,part),48*48)),`Raster mismatch ${biome}/${p.index}/${part}`);
  assert(m._spatial_remove_barrier(wall)===1,'Concurrent wall edit was lost');
  assert(m._spatial_prepare_buffer_bytes(-2147483648)===0,'Invalid result field accepted');
  if(biome===0){m._spatial_prepare_cancel();assert(m._spatial_prepare_buffer_bytes(0)===0&&m._spatial_prepare_metric(2)===1,'Completed cancellation still exposes result');}
  assert(m._spatial_prepare_release()===1,'Could not release result');
  rows.push({biome,job,admissionMs,computedMs,queryBatches,maxQueryBatchMs,payloadEqual:true,rastersEqual:true,liveBuffersUnchanged:true,routeStable:true,suppressionPreserved:true,snapshots,memoryBefore,memoryAfter:m.HEAPU8.buffer.byteLength});
 }
 // Cancel a running calculation, rather than only cancelling queued input.
 assert(m._spatial_prepare_start(2,0)>0,'Cancel job admission failed');
 await wait(()=>m._spatial_prepare_status()===2||m._spatial_prepare_status()===3);
 const cancelState=m._spatial_prepare_status();m._spatial_prepare_cancel();
 await wait(()=>m._spatial_prepare_status()===3);
 assert(cancelState===2,'Cancellation did not overlap running work');
 assert(m._spatial_prepare_metric(2)===1&&m._spatial_prepare_buffer_bytes(0)===0,'Cancelled output remains readable');
 assert(m._spatial_prepare_release()===1,'Cancelled result not released');
 assert(m._spatial_prepare_start(3,0)>0,'Worker not reusable after cancellation');
 await wait(()=>m._spatial_prepare_status()===2||m._spatial_prepare_status()===3);
 m._spatial_prepare_shutdown();await wait(()=>m._spatial_prepare_status()===5);
 m._spatial_prepare_release();await wait(()=>m.PThread.unusedWorkers.length===1);
 return {rows,cancelState,lateCancellation:true,shutdownReturnedWorker:true,shared:m.HEAPU8.buffer instanceof SharedArrayBuffer,scope:'Actual pthread terrain + static navigation preparation in one WASM memory, concurrently with main-thread queries, selected-scratch regeneration and a wall edit. Byte equality against synchronous generation for six biomes/six authored profiles. No publication, live-game streaming, prepared overlays or distribution acceptance yet.'};
}

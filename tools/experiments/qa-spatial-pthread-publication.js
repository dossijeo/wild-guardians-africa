export async function verifyThreadPublication(m,profiles){
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const wait=async()=>{const t=performance.now();while(m._spatial_prepare_status()!==3){assert(performance.now()-t<15000,'Worker timeout');await new Promise(r=>setTimeout(r,0));}};
 const bytes=(ptr,n)=>Array.from(new Uint8Array(m.HEAPU8.buffer,ptr,n));
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const hash=a=>{let h=2166136261;for(const x of a)h=Math.imul(h^x,16777619);return h>>>0;};
 const setup=(biome,all=true)=>{m._spatial_generate_biome(712,biome,0,0);m._spatial_set_settlement(0,0,5,6);for(const p of all?profiles:[profiles[0]])m._spatial_build_nav_profile(p.index,p.radius,+p.worker);};
 const snapshot=()=>{
  const payload=[bytes(m._spatial_heights_ptr(),49*49*4),bytes(m._spatial_colors_ptr(),49*49*12),bytes(m._spatial_ground_mask_ptr(),35*35*4),bytes(m._spatial_water_triangles_ptr(),m._spatial_water_vertex_count()*12),bytes(m._spatial_props_ptr(),m._spatial_prop_count()*40)];
  const nav=profiles.map(p=>{
   m._spatial_select_nav_profile_index(p.index);const grid=[];
   for(let z=-25;z<=25;z++)for(let x=-25;x<=73;x++)grid.push(m._spatial_walkable(x,z),m._spatial_edge(x,z,x+1,z),m._spatial_edge(x,z,x,z+1));
   const n=m._lazy_route(-3,0,2,0),route=n>0?bytes(m._lazy_route_ptr(),n*8):[];return {grid,n,route};
  });
  return {chunks:m._spatial_chunk_count(),barriers:m._spatial_barrier_state_count(),payload,nav};
 };
 const rows=[];
 for(let biome=0;biome<6;biome++){
  setup(biome);m._spatial_add_oriented_barrier(24,0,1,8,.2,0);const id=m._spatial_prepare_start(1,0);assert(id>0,'Admission failed');
  await wait();
  const beforeRevision=m._lazy_route_revision(),start=performance.now(),published=m._spatial_prepare_publish(id),publishMs=performance.now()-start;
  assert(published>0,'Publication rejected valid job');assert(m._lazy_route_revision()>beforeRevision,'Publication failed to invalidate routes');
  assert(m._spatial_prepare_publish(id)===-1,'Result was applied twice');
  const async=snapshot();assert(m._spatial_prepare_release()===1,'Release failed');
  setup(biome);m._spatial_add_oriented_barrier(24,0,1,8,.2,0);m._spatial_add_chunk(1,0);const sync=snapshot();
  assert(equal(async,sync),`Publication diverged in biome ${biome}`);
  rows.push({biome,publishMs,payloadEqual:true,navigationEqual:true,barrierPreserved:true,payloadHashes:async.payload.map(hash),navigationHashes:async.nav.map(n=>hash(n.grid))});
 }
 const rejected=[];
 for(const kind of ['wrong-id','settlement','suppression','residency','world-reset','profile','wall','door','wall-removal']){
  setup(4,kind!=='profile');
  const wall=(kind==='door'||kind==='wall-removal')?m._spatial_add_oriented_barrier(24,0,1,8,.2,0):0;
  const id=m._spatial_prepare_start(1,0);assert(id>0,'Stale test admission failed');
  if(kind==='door')m._spatial_set_barrier_passability(wall,3);
  if(kind==='wall-removal')m._spatial_remove_barrier(wall);
  if(kind==='settlement')m._spatial_add_settlement(40,0,6,7);
  if(kind==='suppression'){
   const raw=new Int32Array(m.HEAPU8.buffer,m._spatial_props_ptr(),m._spatial_prop_count()*10);let removed=false;
   for(let i=0;i<raw.length;i+=10)if(raw[i+7]<6){removed=m._spatial_remove_prop(raw[i+7],raw[i+8],raw[i+9])===1;break;}
   assert(removed,'Suppression fixture missing');
  }
  if(kind==='wall')m._spatial_add_oriented_barrier(24,0,1,8,.2,0);
  if(kind==='residency')m._spatial_add_chunk(-1,0);
  if(kind==='world-reset')setup(0);
  if(kind==='profile'){const p=profiles[1];m._spatial_build_nav_profile(p.index,p.radius,+p.worker);}
  await wait();const before=snapshot(),result=m._spatial_prepare_publish(kind==='wrong-id'?id+1:id),after=snapshot();
  assert(result===(kind==='wrong-id'?-1:-2),`Wrong rejection for ${kind}: ${result}`);
  assert(equal(before,after),`Rejected ${kind} changed live world`);m._spatial_prepare_release();rejected.push({kind,result,worldUnchanged:true});
 }
 m._spatial_prepare_shutdown();const stop=performance.now();while(m._spatial_prepare_status()!==5||m.PThread.unusedWorkers.length!==1){assert(performance.now()-stop<15000,'Shutdown timeout');await new Promise(r=>setTimeout(r,0));}m._spatial_prepare_release();
 return {rows,rejected,scope:'Native publication of pthread-prepared terrain/static rasters, one shared world, six biomes and authored profiles. Dense navigation/visual comparison with synchronous path, prepared wall overlay retained, stale terrain/residency/profile/world/id rejection without mutation. Overlay filling runs on the pthread; no game-stream or FPS acceptance.'};
}

import {spatialProps,spatialInstances,spatialChunkPayload} from './spatial-savanna-payload.js';
import {addSpatialBarriersBatch} from './spatial-barrier-batch.js';
import {captureSpatialState,applySpatialState,validateSpatialState} from './spatial-state.js';
import {spatialWorldRoute} from './spatial-local-route.js';

// Synchronous world authority. The same WASM instance answers spatial queries
// and supplies visual buffers; rendering remains the caller's responsibility.
export function createSpatialWorld(module){
  const wasm=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}}}).exports;
  let chunk=null,navigationBuilt=false,chunks=[],generated=false;
  const heights=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_heights_ptr(),49*49);
  const colors=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_colors_ptr(),49*49*3);
  const water=()=>new Uint8Array(wasm.memory.buffer,wasm.spatial_water_ptr(),48*48);
  const groundMask=()=>new Uint8Array(wasm.memory.buffer,wasm.spatial_ground_mask_ptr(),35*35*4);
  const waterLevels=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_water_levels_ptr(),48*48);
  const waterTriangles=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_water_triangles_ptr(),wasm.spatial_water_vertex_count()*3);
  function generate(seed,cx,cz,biome='savanna'){
    if(!['savanna','desert','grand_river','volcanoes','mangrove','canyons'].includes(biome))throw RangeError('Unsupported spatial biome');
    const count=wasm.spatial_generate_biome(seed>>>0,biome==='desert'?1:biome==='grand_river'?2:biome==='volcanoes'?3:biome==='mangrove'?4:biome==='canyons'?5:0,cx|0,cz|0);
    chunk={cx:cx|0,cz:cz|0,count};chunks=[[cx|0,cz|0]];navigationBuilt=false;generated=true;
    return chunk;
  }
  function addChunk(cx,cz){
    if(!generated)throw Error('Generate the world before adding a chunk');
    const result=wasm.spatial_add_chunk(cx|0,cz|0);
    if(result>0){chunk={cx:cx|0,cz:cz|0,count:result-1};chunks.push([cx|0,cz|0]);}
    return result>0?result-1:result;
  }
  function selectChunk(cx,cz){
    if(!generated)throw Error('Generate the world before selecting a chunk');
    const result=wasm.spatial_select_chunk(cx|0,cz|0);
    if(result>0)chunk={cx:cx|0,cz:cz|0,count:result-1};
    return result>0?result-1:result;
  }
  function removeChunk(cx,cz){
    const removed=wasm.spatial_remove_chunk(cx|0,cz|0);
    if(removed){
      chunks=chunks.filter(([x,z])=>x!==(cx|0)||z!==(cz|0));
      if(chunk?.cx===(cx|0)&&chunk?.cz===(cz|0)){
        const last=chunks.at(-1);
        chunk=last?{cx:last[0],cz:last[1],count:wasm.spatial_prop_count()}:null;
      }
    }
    return removed;
  }
  function props(){
    return spatialProps(wasm);
  }
  function instances(){
    if(!chunk)throw Error('Generate a chunk before reading prop instances');
    return spatialInstances(wasm,chunk.cx,chunk.cz);
  }
  function chunkPayload(){
    if(!chunk)throw Error('Generate a chunk before reading its render payload');
    return spatialChunkPayload(wasm,chunk.cx,chunk.cz);
  }
  function route(start,end){
    if(![start?.x,start?.z,end?.x,end?.z].every(Number.isSafeInteger))
      throw RangeError('Grid routes require integer coordinates; use routeWorld for actor positions');
    if(!navigationBuilt)return {status:'unknown',points:[]};
    const count=wasm.lazy_route(start.x,start.z,end.x,end.z);
    if(count<0)return {status:'unknown',points:[]};
    if(!count)return {status:'blocked',points:[]};
    const pairs=new Int32Array(wasm.memory.buffer,wasm.lazy_route_ptr(),count*2),points=[];
    for(let i=0;i<count;i++)points.push({x:pairs[i*2],z:pairs[i*2+1]});
    return {status:'found',points};
  }
  const surface=(x,z)=>wasm.spatial_surface(x,z);
  const slope=(x,z)=>Math.hypot(surface(x+.8,z)-surface(x-.8,z),
    surface(x,z+.8)-surface(x,z-.8))/1.6;
  return {wasm,generate,addChunk,selectChunk,removeChunk,currentChunk:()=>chunk,
    heights,colors,water,groundMask,waterLevels,waterTriangles,props,instances,chunkPayload,route,
    routeWorld:(start,end)=>navigationBuilt?spatialWorldRoute(wasm,route,start,end):{status:'unknown',points:[]},
    localClear:(start,end)=>Boolean(wasm.spatial_local_clear(start.x,start.z,end.x,end.z)),
    setSettlement:(x,z,hx,hz)=>{
      if(!generated)throw Error('Generate the world before placing a settlement');
      return wasm.spatial_set_settlement(x,z,hx,hz);
    },
    addSettlement:(x,z,hx,hz)=>{
      if(!generated)throw Error('Generate the world before placing a settlement');
      return wasm.spatial_add_settlement(x,z,hx,hz);
    },
    buildNavigation:(radius,worker)=>{
      if(!chunk)throw Error('Generate a chunk before building its navigation');
      const loaded=wasm.spatial_build_nav(radius,worker?1:0);
      navigationBuilt=loaded>0;return loaded;
    },
    buildNavigationProfile:(index,radius,worker=false)=>{
      if(!chunk)throw Error('Generate a chunk before building its navigation');
      const loaded=wasm.spatial_build_nav_profile(index,radius,worker?1:0);
      navigationBuilt=loaded>0;return loaded;
    },
    selectNavigation:worker=>{
      const loaded=wasm.spatial_select_nav_profile(worker?1:0);
      navigationBuilt=loaded>0;return loaded;
    },
    selectNavigationProfile:index=>{
      const loaded=wasm.spatial_select_nav_profile_index(index);
      navigationBuilt=loaded>0;return loaded;
    },
    addWall:(x,z,halfX,halfZ)=>wasm.spatial_add_wall(x,z,halfX,halfZ),
    removeWall:id=>wasm.spatial_remove_wall(id),
    addBarrier:(x,z,halfX,halfZ,passMask=0)=>wasm.spatial_add_barrier(x,z,halfX,halfZ,passMask),
    removeProp:({group,gx,gz})=>wasm.spatial_remove_prop(group,gx,gz),
    addBarriersBatch:barriers=>addSpatialBarriersBatch(wasm,barriers),
    snapshot:()=>{
      if(!generated)throw Error('Generate the world before capturing spatial state');
      return captureSpatialState(wasm);
    },
    restoreState:(state,cx=0,cz=0)=>{
      validateSpatialState(state);
      generate(state.seed,cx,cz,state.biome??'savanna');
      applySpatialState(wasm,state);
      return chunk;
    },
    removeBarrier:id=>wasm.spatial_remove_barrier(id),
    setBarrierPassability:(id,passMask)=>wasm.spatial_set_barrier_passability(id,passMask),
    walkable:(x,z)=>Boolean(wasm.spatial_walkable(x,z)),
    edge:(x,z,nx,nz)=>Boolean(wasm.spatial_edge(x,z,nx,nz)),
    propBlocked:(x,z)=>Boolean(wasm.spatial_prop_blocked(x,z)),
    surface,slope,
    fluidLevel:(x,z)=>wasm.spatial_fluid_level(x,z),
    metrics:()=>({memoryBytes:wasm.memory.buffer.byteLength,loadedChunks:wasm.spatial_chunk_count(),
      residentPropRecords:wasm.spatial_resident_prop_count?.()??null,loadedSectors:wasm.lazy_loaded_sectors(),
      sectorSlots:wasm.spatial_sector_slots(),
      sectorUpdates:wasm.lazy_sector_updates(),haloProps:wasm.spatial_halo_prop_count()})};
}

import {spatialProps,spatialInstances,spatialChunkPayload} from './spatial-savanna-payload.js';
import {addSpatialBarriersBatch,applySpatialBarrierChanges} from './spatial-barrier-batch.js';
import {captureSpatialState,captureSpatialTerrainState,applySpatialState,validateSpatialState} from './spatial-state.js';
import {spatialWorldRoute,spatialWorldConnectivity,spatialWorldComponents} from './spatial-local-route.js';
import {BIOME_IDS,SPATIAL_BIOME_CODES} from '../biome-ids.js';
import {gatePortalPoints} from '../gate-passages.js';

// Synchronous world authority. The same WASM instance answers spatial queries
// and supplies visual buffers; rendering remains the caller's responsibility.
export function createSpatialWorld(module){
  const wasm=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}}}).exports;
  let chunk=null,navigationBuilt=false,chunks=[],generated=false;
  let workerPortalRoutes=[];
  const heights=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_heights_ptr(),49*49);
  const colors=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_colors_ptr(),49*49*3);
  const water=()=>new Uint8Array(wasm.memory.buffer,wasm.spatial_water_ptr(),48*48);
  const groundMask=()=>new Uint8Array(wasm.memory.buffer,wasm.spatial_ground_mask_ptr(),35*35*4);
  const waterLevels=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_water_levels_ptr(),48*48);
  const waterTriangles=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_water_triangles_ptr(),wasm.spatial_water_vertex_count()*3);
  function changedChunks(){
    const count=wasm.spatial_changed_chunk_count();
    if(!count)return [];
    const pairs=new Int32Array(wasm.memory.buffer,wasm.spatial_changed_chunks_ptr(),count*2);
    return Array.from({length:count},(_,i)=>({cx:pairs[i*2],cz:pairs[i*2+1]}));
  }
  function generate(seed,cx,cz,biome='savanna'){
    const name=BIOME_IDS[biome]??biome;
    if(!Object.hasOwn(SPATIAL_BIOME_CODES,name))throw RangeError('Unsupported spatial biome');
    const count=wasm.spatial_generate_biome(seed>>>0,SPATIAL_BIOME_CODES[name],cx|0,cz|0);
    chunk={cx:cx|0,cz:cz|0,count};chunks=[[cx|0,cz|0]];navigationBuilt=false;generated=true;
    workerPortalRoutes=[];
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
    // C returns 0 for an absent chunk and count+1 for a resident chunk.
    // Preserve the distinction when a resident chunk has zero props.
    return result>0?result-1:-1;
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
    for(let i=0;i<count;i++){
      if(pairs[i*2]===-2147483648){
        const crossing=workerPortalRoutes[pairs[i*2+1]];
        if(!crossing)return {status:'unknown',points:[]};
        points.push(...crossing);
      }else points.push({x:pairs[i*2],z:pairs[i*2+1]});
    }
    return {status:'found',points};
  }
  function connected(start,end){
    if(![start?.x,start?.z,end?.x,end?.z].every(Number.isSafeInteger))
      throw RangeError('Grid connectivity requires integer coordinates');
    if(!navigationBuilt)return 'unknown';
    const result=wasm.lazy_connected(start.x,start.z,end.x,end.z);
    return result<0?'unknown':result?'possible':'blocked';
  }
  function componentAt(point){
    if(![point?.x,point?.z].every(Number.isSafeInteger))
      throw RangeError('Grid component lookup requires integer coordinates');
    if(!navigationBuilt)return null;
    const result=wasm.lazy_component(point.x,point.z);
    return result===-1?null:result;
  }
  function componentsWorldBatch(points){
    if(!Array.isArray(points)||!points.every(point=>
      Number.isFinite(point?.x)&&Number.isFinite(point?.z)&&
      Math.abs(point.x)<2147483000&&Math.abs(point.z)<2147483000))
      throw RangeError('Region batch needs finite world coordinates');
    if(!navigationBuilt)return points.map(()=>({ids:[],unknown:true}));
    const result=[];
    for(let offset=0;offset<points.length;offset+=4096){
      const count=Math.min(4096,points.length-offset);
      const pointer=wasm.spatial_region_batch_input_ptr(count);
      if(!pointer)throw Error('Could not allocate native region batch');
      const input=new Float32Array(wasm.memory.buffer,pointer,count*2);
      for(let i=0;i<count;i++){
        input[i*2]=points[offset+i].x;
        input[i*2+1]=points[offset+i].z;
      }
      if(wasm.spatial_region_batch(count)!==count)throw Error('Native region batch failed');
      const rows=new Int32Array(wasm.memory.buffer,wasm.spatial_region_batch_output_ptr(),count*5);
      for(let i=0;i<count;i++){
        const ids=[];
        for(let slot=1;slot<=4;slot++)if(rows[i*5+slot]>=0)ids.push(rows[i*5+slot]);
        result.push({ids,unknown:rows[i*5]!==0});
      }
    }
    return result;
  }
  const surface=(x,z)=>wasm.spatial_surface(x,z);
  const slope=(x,z)=>Math.hypot(surface(x+.8,z)-surface(x-.8,z),
    surface(x,z+.8)-surface(x,z-.8))/1.6;
  function setWorkerGatePortals(gates){
    wasm.lazy_clear_portals();
    workerPortalRoutes=[];
    const clear=(a,b)=>{
      const length=Math.hypot(a.x-b.x,a.z-b.z),steps=Math.max(1,Math.ceil(length/1.25));
      for(let i=0;i<steps;i++){
        const p={x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps};
        const q={x:a.x+(b.x-a.x)*(i+1)/steps,z:a.z+(b.z-a.z)*(i+1)/steps};
        if(!wasm.spatial_local_clear(p.x,p.z,q.x,q.z))return false;
      }
      return true;
    };
    const connector=point=>{
      const candidates=[];
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const cell={x:Math.round(point.x)+dx,z:Math.round(point.z)+dz};
        if(wasm.spatial_walkable(cell.x,cell.z)&&clear(point,cell))
          candidates.push({cell,distance:Math.hypot(cell.x-point.x,cell.z-point.z)});
      }
      candidates.sort((a,b)=>a.distance-b.distance||a.cell.x-b.cell.x||a.cell.z-b.cell.z);
      return candidates[0]?.cell;
    };
    for(const gate of gates){
      if(!gate.gate||gate.status==='ruined')continue;
      const pair=gatePortalPoints(gate,.28);
      if(pair.length!==2||!clear(pair[0],pair[1])||!clear(pair[1],pair[0]))continue;
      const from=connector(pair[0]),to=connector(pair[1]);
      if(!from||!to)continue;
      const id=wasm.lazy_add_portal(from.x,from.z,to.x,to.z);
      workerPortalRoutes[id*2]=pair;
      workerPortalRoutes[id*2+1]=[pair[1],pair[0]];
    }
    wasm.lazy_commit_portals();
  }
  return {wasm,generate,addChunk,selectChunk,removeChunk,currentChunk:()=>chunk,
    heights,colors,water,groundMask,waterLevels,waterTriangles,props,instances,chunkPayload,changedChunks,route,connected,componentAt,
    routeWorld:(start,end)=>navigationBuilt?spatialWorldRoute(wasm,route,start,end):{status:'unknown',points:[]},
    connectedWorld:(start,end)=>navigationBuilt?spatialWorldConnectivity(wasm,connected,start,end):'unknown',
    componentsWorld:point=>navigationBuilt?spatialWorldComponents(wasm,componentAt,point):{ids:[],unknown:true},
    componentsWorldBatch,setWorkerGatePortals,
    localClear:(start,end)=>Boolean(wasm.spatial_local_clear(start.x,start.z,end.x,end.z)),
    localClearExcept:(start,end,ids)=>{
      if(!Array.isArray(ids)||ids.length<1||ids.length>4||
        ids.some(id=>!Number.isSafeInteger(id)||id<=0))
        throw TypeError('Expected 1–4 native barrier IDs');
      return Boolean(wasm.spatial_local_clear_except(start.x,start.z,end.x,end.z,
        ...Array.from({length:4},(_,i)=>ids[i]??0)));
    },
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
    addOrientedBarrier:(x,z,halfX,halfZ,yaw,passMask=0)=>
      wasm.spatial_add_oriented_barrier(x,z,halfX,halfZ,yaw,passMask),
    removeProp:({group,gx,gz})=>wasm.spatial_remove_prop(group,gx,gz),
    restoreRemovedProps:records=>{
      if(!Array.isArray(records)||records.length>100000||
         !records.every(p=>Number.isSafeInteger(p.group)&&p.group>=0&&p.group<=5&&
           Number.isInteger(p.gx)&&p.gx>=-2147483648&&p.gx<=2147483647&&
           Number.isInteger(p.gz)&&p.gz>=-2147483648&&p.gz<=2147483647))
        throw TypeError('Expected valid removed spatial prop records');
      const pointer=wasm.spatial_removed_prop_restore_ptr(records.length);
      if(records.length&&!pointer)throw Error('Could not allocate removed spatial props');
      if(records.length){
        const view=new Int32Array(wasm.memory.buffer,pointer,records.length*3);
        records.forEach((p,i)=>{view[i*3]=p.group;view[i*3+1]=p.gx;view[i*3+2]=p.gz;});
      }
      if(wasm.spatial_restore_removed_props(records.length)!==1)
        throw Error('Could not restore removed spatial props');
    },
    addBarriersBatch:barriers=>addSpatialBarriersBatch(wasm,barriers),
    applyBarrierChanges:(removeIds,barriers)=>applySpatialBarrierChanges(wasm,removeIds,barriers),
    snapshot:()=>{
      if(!generated)throw Error('Generate the world before capturing spatial state');
      return captureSpatialState(wasm);
    },
    terrainState:()=>{
      if(!generated)throw Error('Generate the world before capturing terrain state');
      return captureSpatialTerrainState(wasm);
    },
    restoreState:(state,cx=0,cz=0)=>{
      validateSpatialState(state);
      generate(state.seed,cx,cz,state.biome??'savanna');
      applySpatialState(wasm,state);
      return chunk;
    },
    removeBarrier:id=>wasm.spatial_remove_barrier(id),
    addPolygon:(points,passMask=0)=>{
      if(!Array.isArray(points)||points.length<3||points.length>64||
         !points.every(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z)))
        throw TypeError('Expected a finite 3–64 vertex spatial polygon');
      const pointer=wasm.spatial_polygon_input_ptr(points.length);
      if(!pointer)throw Error('Could not allocate spatial polygon');
      const input=new Float32Array(wasm.memory.buffer,pointer,points.length*2);
      points.forEach((point,i)=>{input[i*2]=point.x;input[i*2+1]=point.z;});
      const id=wasm.spatial_add_polygon(points.length,passMask);
      if(!id)throw Error('Invalid spatial polygon');
      return id;
    },
    removePolygon:id=>wasm.spatial_remove_polygon(id),
    setBarrierPassability:(id,passMask)=>wasm.spatial_set_barrier_passability(id,passMask),
    walkable:(x,z)=>Boolean(wasm.spatial_walkable(x,z)),
    edge:(x,z,nx,nz)=>Boolean(wasm.spatial_edge(x,z,nx,nz)),
    propBlocked:(x,z)=>Boolean(wasm.spatial_prop_blocked(x,z)),
    surface,slope,
    surfaceAnywhere:(x,z)=>wasm.spatial_surface_anywhere(x,z),
    fluidLevel:(x,z)=>wasm.spatial_fluid_level(x,z),
    fluidLevelAnywhere:(x,z)=>wasm.spatial_fluid_level_anywhere(x,z),
    waterShoreAnywhere:(x,z)=>wasm.spatial_water_shore_anywhere(x,z),
    riverCenter:z=>wasm.spatial_river_center(z),
    riverEdge:(z,direction)=>wasm.spatial_river_edge(z,direction),
    riverLevel:()=>wasm.spatial_river_level(),
    fluidSurfaceLevel:()=>wasm.spatial_fluid_surface_level(),
    wetlandMaskAnywhere:(x,z)=>wasm.spatial_wetland_mask_anywhere(x,z),
    groundColorsAnywhere:points=>{
      if(!(points instanceof Float32Array)||points.length===0||points.length%2||points.length>100000)
        throw TypeError('Expected 1–50,000 native ground-color coordinate pairs');
      const count=points.length/2,pointer=wasm.spatial_ground_color_input_ptr(count);
      if(!pointer)throw Error('Could not allocate ground-color query');
      new Float32Array(wasm.memory.buffer,pointer,points.length).set(points);
      if(wasm.spatial_ground_color_batch(count)!==count)
        throw RangeError('Invalid native ground-color coordinates');
      return new Float32Array(wasm.memory.buffer,wasm.spatial_ground_color_result_ptr(),count*3).slice();
    },
    horizon:(region,waterColor=[0,0,0],river=true)=>{
      if(!generated||![region?.cx,region?.cz,...(region?.bounds??[])].every(Number.isSafeInteger)||
         region.bounds.length!==4||!Array.isArray(waterColor)||waterColor.length!==3||
         !waterColor.every(v=>Number.isFinite(v)&&v>=0&&v<=1))
        throw TypeError('Expected a generated canyon or desert, integer region bounds and RGB water color');
      const count=wasm.spatial_build_horizon(region.cx,region.cz,...region.bounds,
        river?1:0,...waterColor);
      if(!count)throw Error('Native horizon could not be built');
      const terrain=new Float32Array(wasm.memory.buffer,wasm.spatial_horizon_terrain_ptr(),count*9).slice();
      const waterCount=wasm.spatial_horizon_water_count();
      const water=new Float32Array(wasm.memory.buffer,wasm.spatial_horizon_water_ptr(),waterCount*9).slice();
      return {terrain,water};
    },
    metrics:()=>({memoryBytes:wasm.memory.buffer.byteLength,loadedChunks:wasm.spatial_chunk_count(),
      residentPropRecords:wasm.spatial_resident_prop_count?.()??null,
      residentVisiblePropRecords:wasm.spatial_resident_visible_prop_count?.()??null,
      loadedSectors:wasm.lazy_loaded_sectors(),
      sectorSlots:wasm.spatial_sector_slots(),
      sectorUpdates:wasm.lazy_sector_updates(),haloProps:wasm.spatial_halo_prop_count()})};
}

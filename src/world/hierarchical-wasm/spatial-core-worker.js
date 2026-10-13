import wasmUrl from './spatial-savanna.wasm?url';
import {spatialChunkPayload,spatialChunkTransferables} from './spatial-savanna-payload.js';
import {addSpatialBarriersBatch} from './spatial-barrier-batch.js';
import {captureSpatialState,applySpatialState,validateSpatialState} from './spatial-state.js';

let wasm=null,compiledMs=0,seed=null,biome=null;
async function initialize(){
  if(wasm)return;
  const start=performance.now();
  const bytes=await fetch(wasmUrl).then(response=>{
    if(!response.ok)throw Error(`WASM HTTP ${response.status}`);
    return response.arrayBuffer();
  });
  const module=await WebAssembly.compile(bytes);
  wasm=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}}}).exports;
  compiledMs=performance.now()-start;
}
function visualBuffers(){
  const memory=wasm.memory.buffer,count=wasm.spatial_prop_count();
  return {heights:new Float32Array(memory,wasm.spatial_heights_ptr(),49*49).slice(),
    colors:new Float32Array(memory,wasm.spatial_colors_ptr(),49*49*3).slice(),
    water:new Uint8Array(memory,wasm.spatial_water_ptr(),48*48).slice(),
    groundMask:new Uint8Array(memory,wasm.spatial_ground_mask_ptr(),35*35*4).slice(),
    waterLevels:new Float32Array(memory,wasm.spatial_water_levels_ptr(),48*48).slice(),
    waterTriangles:new Float32Array(memory,wasm.spatial_water_triangles_ptr(),wasm.spatial_water_vertex_count()*3).slice(),
    props:new Uint8Array(memory,wasm.spatial_props_ptr(),count*40).slice(),count};
}
self.onmessage=async({data:request})=>{
  try{
    await initialize();
    if(request.op){
      if(seed===null&&request.op!=='restore')throw Error('Generate the spatial world before editing or routing');
      const started=performance.now();let value,routePoints;
      switch(request.op){
        case 'edge':value=Boolean(wasm.spatial_edge(request.x,request.z,request.nx,request.nz));break;
        case 'route':{
          const count=wasm.lazy_route(request.x,request.z,request.nx,request.nz);
          value=count<0?'unknown':count===0?'blocked':'found';
          if(count>0)routePoints=new Int32Array(wasm.memory.buffer,wasm.lazy_route_ptr(),count*2).slice();
          break;
        }
        case 'wall-add':value=wasm.spatial_add_wall(request.x,request.z,request.halfX,request.halfZ);break;
        case 'wall-remove':value=wasm.spatial_remove_wall(request.wallId);break;
        case 'barrier-add':value=wasm.spatial_add_barrier(request.x,request.z,request.halfX,request.halfZ,request.passMask);break;
        case 'barrier-batch-add':value=addSpatialBarriersBatch(wasm,request.barriers);break;
        case 'barrier-remove':value=wasm.spatial_remove_barrier(request.barrierId);break;
        case 'barrier-passability':value=wasm.spatial_set_barrier_passability(request.barrierId,request.passMask);break;
        case 'chunk-remove':value=wasm.spatial_remove_chunk(request.cx,request.cz);break;
        case 'settlement-add':value=wasm.spatial_add_settlement(request.x,request.z,request.hx,request.hz);break;
        case 'prop-remove':{
          if(request.cx!==undefined&&request.cz!==undefined&&
             !wasm.spatial_select_chunk(request.cx,request.cz))throw Error('Prop chunk is not resident');
          value=wasm.spatial_remove_prop(request.group,request.gx,request.gz);break;
        }
        case 'profile':value=wasm.spatial_select_nav_profile(request.worker?1:0);break;
        case 'surface':value=wasm.spatial_surface(request.x,request.z);break;
        case 'snapshot':value=captureSpatialState(wasm);break;
        case 'restore':{
          const state=validateSpatialState(request.state);
          seed=null;biome=null;
          wasm.spatial_generate_biome(state.seed,(state.biome??'savanna')==='desert'?1:
            state.biome==='grand_river'?2:state.biome==='volcanoes'?3:state.biome==='mangrove'?4:state.biome==='canyons'?5:0,
            request.cx??0,request.cz??0);
          applySpatialState(wasm,state);
          for(const profile of request.profiles??[{radius:.28,worker:true},{radius:1.1,worker:false}])
            wasm.spatial_build_nav(profile.radius,profile.worker?1:0);
          seed=state.seed;biome=state.biome??'savanna';value=true;break;
        }
        default:throw Error(`Unknown spatial operation: ${request.op}`);
      }
      self.postMessage({id:request.id,value,routePoints,
        timing:{operationMs:performance.now()-started},
        metrics:{loadedChunks:wasm.spatial_chunk_count(),loadedSectors:wasm.lazy_loaded_sectors(),
          sectorUpdates:wasm.lazy_sector_updates(),memoryBytes:wasm.memory.buffer.byteLength}},
        routePoints?[routePoints.buffer]:[]);
      return;
    }
    const started=performance.now();
    const requestedBiome=request.biome??biome??'savanna';
    if(!['savanna','desert','grand_river','volcanoes','mangrove','canyons'].includes(requestedBiome))throw Error('Unsupported spatial biome');
    if(request.read){
      if(seed!==request.seed||biome!==requestedBiome||!wasm.spatial_select_chunk(request.cx,request.cz))
        throw Error('Requested spatial chunk is not resident in this world');
    }else if(request.reset||seed!==request.seed||biome!==requestedBiome){
      seed=request.seed;biome=requestedBiome;
      wasm.spatial_generate_biome(seed,biome==='desert'?1:biome==='grand_river'?2:biome==='volcanoes'?3:biome==='mangrove'?4:biome==='canyons'?5:0,request.cx,request.cz);
      if(request.settlement){const {x,z,hx,hz}=request.settlement;wasm.spatial_set_settlement(x,z,hx,hz);}
      if(request.profiles){
        for(const profile of request.profiles)wasm.spatial_build_nav(profile.radius,profile.worker?1:0);
      }else wasm.spatial_build_nav(request.radius??1.1,0);
    }else wasm.spatial_add_chunk(request.cx,request.cz);
    const spatialMs=performance.now()-started,copyStarted=performance.now();
    const sceneFormat=request.format==='scene';
    const data=sceneFormat?spatialChunkPayload(wasm,request.cx,request.cz):visualBuffers();
    const copyMs=performance.now()-copyStarted;
    const transfer=sceneFormat?spatialChunkTransferables(data):
      [data.heights.buffer,data.colors.buffer,data.water.buffer,data.groundMask.buffer,
        data.waterLevels.buffer,data.waterTriangles.buffer,data.props.buffer];
    const transferBytes=transfer.reduce((sum,buffer)=>sum+buffer.byteLength,0);
    self.postMessage({id:request.id,cx:request.cx,cz:request.cz,data,
      timing:{compiledMs,spatialMs,copyMs,transferBytes},
      metrics:{loadedChunks:wasm.spatial_chunk_count(),loadedSectors:wasm.lazy_loaded_sectors(),
        sectorUpdates:wasm.lazy_sector_updates(),memoryBytes:wasm.memory.buffer.byteLength}},
    transfer);
  }catch(error){self.postMessage({id:request.id,error:String(error.stack??error)});}
};

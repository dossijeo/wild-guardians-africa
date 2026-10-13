import wasmUrl from '../../src/world/hierarchical-wasm/spatial-savanna.wasm?url';
import {spatialChunkPayload,spatialChunkTransferables} from '../../src/world/hierarchical-wasm/spatial-savanna-payload.js';

let wasm=null,compiledMs=0,seed=null;
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
    props:new Uint8Array(memory,wasm.spatial_props_ptr(),count*28).slice(),count};
}
self.onmessage=async({data:request})=>{
  try{
    await initialize();
    if(request.op){
      if(seed===null)throw Error('Generate the spatial world before editing or routing');
      const started=performance.now();let value;
      switch(request.op){
        case 'edge':value=Boolean(wasm.spatial_edge(request.x,request.z,request.nx,request.nz));break;
        case 'route':{
          const count=wasm.lazy_route(request.x,request.z,request.nx,request.nz);
          value=count<0?'unknown':count===0?'blocked':'found';break;
        }
        case 'wall-add':value=wasm.spatial_add_wall(request.x,request.z,request.halfX,request.halfZ);break;
        case 'wall-remove':value=wasm.spatial_remove_wall(request.wallId);break;
        default:throw Error(`Unknown spatial operation: ${request.op}`);
      }
      self.postMessage({id:request.id,value,
        timing:{operationMs:performance.now()-started},
        metrics:{loadedChunks:wasm.spatial_chunk_count(),loadedSectors:wasm.lazy_loaded_sectors(),
          sectorUpdates:wasm.lazy_sector_updates(),memoryBytes:wasm.memory.buffer.byteLength}});
      return;
    }
    const started=performance.now();
    if(request.reset||seed!==request.seed){
      seed=request.seed;
      wasm.spatial_generate(seed,request.cx,request.cz);
      if(request.settlement){const {x,z,hx,hz}=request.settlement;wasm.spatial_set_settlement(x,z,hx,hz);}
      wasm.spatial_build_nav(request.radius??1.1,0);
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
        memoryBytes:wasm.memory.buffer.byteLength}},
    transfer);
  }catch(error){self.postMessage({id:request.id,error:String(error.stack??error)});}
};

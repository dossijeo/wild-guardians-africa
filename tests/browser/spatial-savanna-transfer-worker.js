import wasmUrl from '../../src/world/hierarchical-wasm/spatial-savanna.wasm?url';

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
    waterLevels:new Float32Array(memory,wasm.spatial_water_levels_ptr(),48*48).slice(),
    props:new Uint8Array(memory,wasm.spatial_props_ptr(),count*28).slice(),count};
}
self.onmessage=async({data:request})=>{
  try{
    await initialize();
    const started=performance.now();
    if(request.reset||seed!==request.seed){
      seed=request.seed;
      wasm.spatial_generate(seed,request.cx,request.cz);
      wasm.spatial_build_nav(request.radius??1.1,0);
    }else wasm.spatial_add_chunk(request.cx,request.cz);
    const spatialMs=performance.now()-started,copyStarted=performance.now();
    const data=visualBuffers(),copyMs=performance.now()-copyStarted;
    const transferBytes=data.heights.byteLength+data.colors.byteLength+data.water.byteLength+data.waterLevels.byteLength+data.props.byteLength;
    self.postMessage({id:request.id,cx:request.cx,cz:request.cz,data,
      timing:{compiledMs,spatialMs,copyMs,transferBytes},
      metrics:{loadedChunks:wasm.spatial_chunk_count(),loadedSectors:wasm.lazy_loaded_sectors(),
        memoryBytes:wasm.memory.buffer.byteLength}},
    [data.heights.buffer,data.colors.buffer,data.water.buffer,data.waterLevels.buffer,data.props.buffer]);
  }catch(error){self.postMessage({id:request.id,error:String(error.stack??error)});}
};

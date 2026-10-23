import {createSpatialWorld} from './spatial-world.js';

// The Emscripten runtime must own pthread boot and imports. Raw Instance
// construction is reserved for the standalone fallback/preview module.
export async function createThreadedSpatialWorld(factory,{initialPages=256,maximumPages=8192,...options}={}){
  const memory=new WebAssembly.Memory({initial:initialPages,maximum:maximumPages,shared:true});
  const runtime=await factory({...options,wasmMemory:memory});
  const exports={memory};
  for(const [name,value] of Object.entries(runtime))
    if(name.startsWith('_')&&typeof value==='function')exports[name.slice(1)]=value;
  if(typeof exports.spatial_prepare_start!=='function'){
    runtime.PThread?.terminateAllThreads();
    throw Error('Wild Engine runtime does not expose pthread preparation');
  }
  const core=createSpatialWorld(null,{exports});
  const poolSize=runtime.PThread.unusedWorkers.length;
  let disposing;
  return {core,memory,runtime,dispose(){
    if(disposing)return disposing;
    core.preparation.shutdown();
    // Polling only observes completion. Native work runs on the shared-memory
    // pthread; never terminate its worker while it owns allocator/job state.
    disposing=new Promise(resolve=>{
      const poll=()=>{
        if(core.preparation.status()!==5||runtime.PThread.unusedWorkers.length<poolSize){setTimeout(poll,0);return;}
        core.preparation.release();runtime.PThread.terminateAllThreads();resolve();
      };
      poll();
    });
    return disposing;
  }};
}

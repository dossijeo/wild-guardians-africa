import {createSpatialWorld} from './spatial-world.js';
import wasmUrl from './spatial-savanna.wasm?url';

let modulePromise=null,core=null;
async function spatialCore(){
  modulePromise??=fetch(wasmUrl).then(response=>{
    if(!response.ok)throw Error(`Spatial WASM ${response.status}`);
    return response.arrayBuffer();
  }).then(bytes=>WebAssembly.compile(bytes));
  core??=createSpatialWorld(await modulePromise);
  return core;
}

self.onmessage=async({data:request})=>{
  try{
    const world=await spatialCore();
    world.restoreState(request.state,request.region.cx,request.region.cz);
    const data=world.horizon(request.region,request.waterColor,request.river);
    self.postMessage({id:request.id,data,metrics:world.metrics()},[data.terrain.buffer,data.water.buffer]);
  }catch(error){self.postMessage({id:request.id,error:String(error.stack??error)});}
};

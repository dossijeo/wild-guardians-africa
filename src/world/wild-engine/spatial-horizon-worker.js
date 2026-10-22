import {smoothHorizonNormals} from '../../rendering/horizon-normals.js';
import {createSpatialWorld} from './spatial-world.js';
import {validateSpatialTerrainState} from './spatial-state.js';
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
    const state=validateSpatialTerrainState(request.state);
    world.generate(state.seed,request.region.cx,request.region.cz,state.biome);
    for(const site of state.settlements)if(!Number.isFinite(
      world.addSettlement(site.x,site.z,site.hx,site.hz)))throw Error('Invalid horizon settlement');
    const data=world.horizon(request.region,request.waterColor,request.river);
    if(request.smoothNormals)data.normalBuild=smoothHorizonNormals(data.terrain);
    self.postMessage({id:request.id,data,metrics:world.metrics()},[data.terrain.buffer,data.water.buffer]);
  }catch(error){self.postMessage({id:request.id,error:String(error.stack??error)});}
};

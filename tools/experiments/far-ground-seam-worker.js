import {createFarSpatialReplica} from '../../src/rendering/spatial-far-data.js';
import {createSpatialTerrainView} from '../../src/world/wild-engine/spatial-terrain-view.js';
const wasmUrl=new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url);
import {TerrainField} from '../../src/world/terrain.js';
import {farGroundSeam} from './far-ground-seam.js';

self.onmessage=async({data:request})=>{
 try{
  const start=performance.now(),field=request.spatialTerrain?createSpatialTerrainView(createFarSpatialReplica(await WebAssembly.compile(await (await fetch(wasmUrl)).arrayBuffer()),request.spatialTerrain)):new TerrainField(request.config),seam=farGroundSeam(request.ground,request.nearBounds,{nativeHeightAt:(x,z)=>field.surface(x,z)});
  const data={positions:seam.positions,indices:seam.indices,nearBounds:seam.nearBounds,columns:seam.columns.length};
  self.postMessage({data,buildMs:performance.now()-start},[data.positions.buffer,data.indices.buffer]);
 }catch(error){self.postMessage({error:String(error.stack??error)});}
};

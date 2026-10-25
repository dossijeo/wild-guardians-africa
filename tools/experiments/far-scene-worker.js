import {buildFarSceneData,farSceneTransferables} from './far-scene-data.js';
import {createFarSpatialReplica,collectSpatialFarTrees} from '../../src/rendering/spatial-far-data.js';
import {createSpatialTerrainView} from '../../src/world/wild-engine/spatial-terrain-view.js';
const wasmUrl=new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url);
self.onmessage=async({data:request})=>{
 try{
  const start=performance.now();let native=null;
  if(request.spatialTerrain){
   const module=await WebAssembly.compile(await (await fetch(wasmUrl)).arrayBuffer());
   const core=createFarSpatialReplica(module,request.spatialTerrain),field=createSpatialTerrainView(core);
   const trees=collectSpatialFarTrees(core,request.treeBounds,{slots:request.slots??[0],suppressed:request.suppressed??[]});
   const colors=new Map();
   // Batch color sampling once for each proxy/map grid, never in the frame loop.
   if(!request.treesOnly)for(const step of new Set([request.step??4,request.colorMapStep].filter(v=>v!=null))){
    const b=request.groundBounds,nx=Math.ceil((b.maxX-b.minX)/step),nz=Math.ceil((b.maxZ-b.minZ)/step),coords=[];
    for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++)coords.push(b.minX+(b.maxX-b.minX)*x/nx,b.minZ+(b.maxZ-b.minZ)*z/nz);
    for(let offset=0;offset<coords.length;offset+=100000){const points=new Float32Array(coords.slice(offset,offset+100000).map(Math.round)),rgb=core.groundColorsAnywhere(points);for(let i=0;i<points.length/2;i++)colors.set(coords[offset+i*2]+','+coords[offset+i*2+1],Array.from(rgb.subarray(i*3,i*3+3)));}
   }
   native={field,trees,colorAt:(x,z)=>{const color=colors.get(x+','+z);if(!color)throw Error('Missing native far color sample');return color;}};
  }
  const data=buildFarSceneData(request,native);self.postMessage({data,buildMs:performance.now()-start},farSceneTransferables(data));
 }catch(error){self.postMessage({error:String(error.stack??error)});}
};

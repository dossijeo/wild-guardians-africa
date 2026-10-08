import {TerrainField} from '../../src/world/terrain.js';
import {farGroundSeam} from './far-ground-seam.js';

self.onmessage=({data:request})=>{
 try{
  const start=performance.now(),field=new TerrainField(request.config),seam=farGroundSeam(request.ground,request.nearBounds,{nativeHeightAt:(x,z)=>field.surface(x,z)});
  const data={positions:seam.positions,indices:seam.indices,nearBounds:seam.nearBounds,columns:seam.columns.length};
  self.postMessage({data,buildMs:performance.now()-start},[data.positions.buffer,data.indices.buffer]);
 }catch(error){self.postMessage({error:String(error.stack??error)});}
};

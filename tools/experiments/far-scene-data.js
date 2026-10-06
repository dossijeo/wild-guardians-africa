import {TerrainField} from '../../src/world/terrain.js';
import {groundColor} from '../../src/rendering/terrain-source.js';
import {sampleSavannaAcacias} from './far-tree-sampling.js';
import {farGroundData} from './far-ground-data.js';
export function buildFarSceneData({config,profile,treeBounds,groundBounds,step=4,suppressed=[]}){
 const field=new TerrainField(config);
 const trees=sampleSavannaAcacias(config,profile,treeBounds,{field,suppressed:new Set(suppressed)});
 const ground=farGroundData(field,groundBounds,{step,colorAt:(x,z)=>groundColor(field,profile,x,z)});
 return {trees,ground};
}
export function farSceneTransferables(data){return [data.ground.positions.buffer,data.ground.colors.buffer,data.ground.indices.buffer];}

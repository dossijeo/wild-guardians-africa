import {TerrainField} from '../../src/world/terrain.js';
import {groundColor} from '../../src/rendering/terrain-source.js';
import {sampleSavannaAcacias,treeAtlasAnchor} from './far-tree-sampling.js';
import {farGroundData} from './far-ground-data.js';
import {fitFarGroundContacts} from './far-ground-contacts.js';
export function buildFarSceneData({config,profile,treeBounds,groundBounds,step=4,suppressed=[],treesOnly=false,treeBase=null}){
 const field=new TerrainField(config);
 const trees=sampleSavannaAcacias(config,profile,treeBounds,{field,suppressed:new Set(suppressed)});
 let ground=treesOnly?null:farGroundData(field,groundBounds,{step,colorAt:(x,z)=>groundColor(field,profile,x,z)});
 if(ground&&treeBase)ground=fitFarGroundContacts(ground,trees.map(t=>treeAtlasAnchor(t,treeBase)));
 return {trees,ground};
}
export function farSceneTransferables(data){return data.ground?[data.ground.positions.buffer,data.ground.colors.buffer,data.ground.indices.buffer]:[];}

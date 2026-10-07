import {farGroundColorMap} from './far-ground-color-map.js';
import {TerrainField,hex} from '../../src/world/terrain.js';
import {groundColor} from '../../src/rendering/terrain-source.js';
import {sampleSavannaAcacias,sampleFarTrees,treeAtlasAnchor} from './far-tree-sampling.js';
import {farGroundData} from './far-ground-data.js';
import {fitFarGroundContacts} from './far-ground-contacts.js';
export function buildFarSceneData({config,profile,treeBounds,groundBounds,step=4,suppressed=[],treesOnly=false,treeBase=null,treeBases=null,slots=null,waterSurface=false,colorMapStep=null}){
 const field=new TerrainField(config);
 const trees=slots?sampleFarTrees(config,profile,treeBounds,{field,suppressed:new Set(suppressed),slots}):sampleSavannaAcacias(config,profile,treeBounds,{field,suppressed:new Set(suppressed)});
 const colorAt=(x,z)=>waterSurface&&field.waterInfo(x,z).inside?hex(profile.colors.water):groundColor(field,profile,x,z);
 let ground=treesOnly?null:farGroundData(field,groundBounds,{step,colorAt,heightAt:waterSurface?(x,z)=>{const water=field.waterInfo(x,z);return water.inside?Math.max(field.surface(x,z),water.level):field.surface(x,z);}:null});
 if(ground&&(treeBase||treeBases))ground=fitFarGroundContacts(ground,trees.map(t=>treeAtlasAnchor(t,treeBases?.[t.slot]??treeBase)));
 if(ground&&colorMapStep!==null)ground.colorMap=farGroundColorMap(groundBounds,{step:colorMapStep,colorAt});
 return {trees,ground};
}
export function farSceneTransferables(data){return data.ground?[data.ground.positions.buffer,data.ground.colors.buffer,data.ground.indices.buffer,...(data.ground.colorMap?[data.ground.colorMap.data.buffer]:[])]:[];}

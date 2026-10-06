import {TerrainField,scatterWorld} from '../../src/world/terrain.js';

// First species experiment only. Queries logical candidates and their native
// special-prop separation, never GLBs, ground/water buffers or navigation.
export function sampleSavannaAcacias(config,profile,bounds,{field=new TerrainField(config),suppressed=new Set()}={}){
 if(config.biome!=='savanna')throw Error('Acacia prototype requires savanna');
 if(![bounds.minX,bounds.minZ,bounds.maxX,bounds.maxZ].every(Number.isFinite)||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('Invalid sampling bounds');
 return scatterWorld({...config,bounds},profile,field,false,{groups:[0],ponds:false}).instances[0].filter(tree=>!suppressed.has(tree.id));
}
export function treeAtlasAnchor(tree,localBase){
 const c=Math.cos(tree.yaw),s=Math.sin(tree.yaw),[x,y,z]=localBase;
 return {...tree,origin:{x:tree.x,y:tree.y,z:tree.z},x:tree.x+x*tree.sx*c+z*tree.sz*s,y:tree.y+y*tree.sy,z:tree.z-x*tree.sx*s+z*tree.sz*c};
}

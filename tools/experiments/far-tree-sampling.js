import {TerrainField,scatterWorld} from '../../src/world/terrain.js';

// Lightweight queries use the same placement/separation rules as native chunks.
// Canyon/desert use their specialized scatter functions, preserving exact IDs.
export function sampleFarTrees(config,profile,bounds,{field=null,suppressed=new Set(),slots=config.biome==='canyons'?[0,1]:[0,1,2,3]}={}){
 if(!['savanna','grand_river','mangrove','volcanoes','canyons','desert'].includes(config.biome))throw Error('Unknown far vegetation biome');
 if(![bounds.minX,bounds.minZ,bounds.maxX,bounds.maxZ].every(Number.isFinite)||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('Invalid sampling bounds');
 if(!Array.isArray(slots)||new Set(slots).size!==slots.length||slots.some(slot=>!Number.isInteger(slot)||slot<0||slot>(config.biome==='canyons'?1:3)))throw Error('Invalid far tree slots');
 field??=new TerrainField(config);
 // Wetland candidates move in X and Z towards a habitat. Native chunks own
 // their candidate enumeration; sampling one larger rectangle changes that
 // enumeration at chunk edges. Query each canonical rectangle (data only) so
 // the far representation exactly matches the world that will replace it.
 let instances;
 if(config.biome==='mangrove'){
  instances=Array.from({length:20},()=>[]);
  for(let cz=Math.floor((bounds.minZ+24)/48);cz<=Math.floor((bounds.maxZ+24-1e-9)/48);cz++)for(let cx=Math.floor((bounds.minX+24)/48);cx<=Math.floor((bounds.maxX+24-1e-9)/48);cx++){
   const native=scatterWorld({...config,bounds:undefined,cx,cz,n:1},profile,field,false,{groups:[0],ponds:false}).instances;
   for(const slot of slots)instances[slot].push(...native[slot].filter(t=>t.x>=bounds.minX&&t.x<bounds.maxX&&t.z>=bounds.minZ&&t.z<bounds.maxZ));
  }
  for(const rows of instances)rows.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 }else instances=scatterWorld({...config,bounds},profile,field,false,{groups:[0],ponds:false}).instances;
 return slots.flatMap(slot=>instances[slot].filter(tree=>!suppressed.has(tree.id)).map(tree=>({...tree,slot})));
}

export function sampleSavannaAcacias(config,profile,bounds,{field=new TerrainField(config),suppressed=new Set()}={}){
 if(config.biome!=='savanna')throw Error('Acacia prototype requires savanna');
 if(![bounds.minX,bounds.minZ,bounds.maxX,bounds.maxZ].every(Number.isFinite)||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('Invalid sampling bounds');
 return scatterWorld({...config,bounds},profile,field,false,{groups:[0],ponds:false}).instances[0].filter(tree=>!suppressed.has(tree.id));
}
export function treeAtlasAnchor(tree,localBase){
 const c=Math.cos(tree.yaw),s=Math.sin(tree.yaw),[x,y,z]=localBase;
 return {...tree,origin:{x:tree.x,y:tree.y,z:tree.z},x:tree.x+x*tree.sx*c+z*tree.sz*s,y:tree.y+y*tree.sy,z:tree.z-x*tree.sx*s+z*tree.sz*c};
}

// QA correspondence across region replacement, outside the per-frame render path.
export function compareTreeInstances(previous,next){
 const before=new Map(previous.map(t=>[t.id,t])),after=new Map(next.map(t=>[t.id,t]));
 let shared=0,changed=0;const fields=['x','y','z','yaw','scale','sx','sy','sz'];
 for(const [id,t] of after){const old=before.get(id);if(!old)continue;shared++;
  if(fields.some(key=>!Object.is(old[key],t[key]))||['x','y','z'].some(key=>!Object.is(old.origin?.[key],t.origin?.[key])))changed++;
 }
 return {shared,changed,added:after.size-shared,removed:before.size-shared};
}

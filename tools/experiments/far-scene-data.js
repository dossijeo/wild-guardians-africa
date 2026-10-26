import {createRegionalWetlandBed} from './regional-wetland-bed.js';
import {nativeSavannaPalette} from './far-ground-native-palette.js';
import {farGroundColorMap} from './far-ground-color-map.js';
import {TerrainField,hex} from '../../src/world/terrain.js';
import {groundColor} from '../../src/rendering/terrain-source.js';
import {sampleSavannaAcacias,sampleFarTrees,treeAtlasAnchor} from './far-tree-sampling.js';
import {farGroundData} from './far-ground-data.js';
import {fitFarGroundContacts} from './far-ground-contacts.js';
export function buildFarSceneData({config,profile,treeBounds,groundBounds,step=4,suppressed=[],treesOnly=false,treeBase=null,treeBases=null,slots=null,waterSurface=false,regionalWaterBed=false,nativeWaterSamples=false,colorMapStep=null,groundWash=.25,groundPalette=null},native=null){
 if(!Number.isFinite(groundWash)||groundWash<0||groundWash>1)throw Error('Invalid far ground wash');
 const palette=groundPalette===null?null:nativeSavannaPalette(groundPalette);if(palette&&config.biome!=='savanna')throw Error('Native far palette QA only supports Sabana');
 const field=native?.field??new TerrainField(config);
 const landColorAt=(x,z)=>{const original=native?native.colorAt(x,z):groundColor(field,profile,x,z);return palette?palette(field,profile,x,z,original):original;};
 const trees=native?native.trees:slots?sampleFarTrees(config,profile,treeBounds,{field,suppressed:new Set(suppressed),slots}):sampleSavannaAcacias(config,profile,treeBounds,{field,suppressed:new Set(suppressed)});
 const colorAt=(x,z)=>waterSurface&&!regionalWaterBed&&field.waterInfo(x,z).inside?hex(profile.colors.water):landColorAt(x,z);
 let ground=treesOnly?null:farGroundData(field,groundBounds,{step,colorAt,wash:groundWash,heightAt:waterSurface&&!regionalWaterBed?(x,z)=>{const water=field.waterInfo(x,z);return water.inside?Math.max(field.surface(x,z),water.level):field.surface(x,z);}:null});
 if(ground&&(treeBase||treeBases))ground=fitFarGroundContacts(ground,trees.map(t=>{
  const anchor=treeAtlasAnchor(t,treeBases?.[t.slot]??treeBase);
  // Water-rooted trees keep their authored placement; do not lift the bed
  // to their water-level feet and make it coplanar with transparent water.
  if(regionalWaterBed&&waterSurface&&field.wetland&&field.waterInfo(anchor.x,anchor.z).inside)anchor.y=Math.min(anchor.y,field.surface(anchor.x,anchor.z));
  return anchor;
 }));
 if(ground&&nativeWaterSamples){ground.water=new Float32Array(ground.positions.length/3);for(let i=0;i<ground.water.length;i++)ground.water[i]=field.waterInfo(ground.positions[i*3],ground.positions[i*3+2]).inside?1:0;}
 let bedEncoder=null;
 if(ground&&regionalWaterBed&&waterSurface&&colorMapStep!==null&&field.wetland)bedEncoder=createRegionalWetlandBed(groundBounds,Math.ceil((groundBounds.maxX-groundBounds.minX)/colorMapStep)+1,Math.ceil((groundBounds.maxZ-groundBounds.minZ)/colorMapStep)+1,field.wetlandLevel());
 if(ground&&colorMapStep!==null)ground.colorMap=farGroundColorMap(groundBounds,{step:colorMapStep,wash:groundWash,colorAt:landColorAt,...(waterSurface?{maskAt:(x,z)=>{const info=field.waterInfo(x,z);return bedEncoder?bedEncoder.sample(info):info.inside?1:0;},waterColor:hex(profile.colors.water)}:{})});
 if(bedEncoder)ground.waterBed=bedEncoder.finish();
 return {trees,ground};
}
export function farSceneTransferables(data){return data.ground?[data.ground.positions.buffer,data.ground.colors.buffer,data.ground.indices.buffer,...(data.ground.waterBed?[data.ground.waterBed.bytes.buffer]:[]),...(data.ground.water?[data.ground.water.buffer]:[]),...(data.ground.colorMap?[data.ground.colorMap.data.buffer]:[])]:[];}

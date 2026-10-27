import {smoothHorizonNormals} from './horizon-normals.js';
import {makeCanyonHorizon,makeDesertHorizon} from './horizon-source.js';

export function buildHorizonData({config,profile,region,smoothNormals=false}){
  const make=config.biome==='desert'?makeDesertHorizon:makeCanyonHorizon;
  const data=make(config,profile,region.cx,region.cz,region.bounds);
  if(smoothNormals&&config.biome==='canyons')data.normalBuild=smoothHorizonNormals(data.terrain);
  return data;
}

export const horizonTransferables=data=>[data.terrain.buffer,data.water.buffer];

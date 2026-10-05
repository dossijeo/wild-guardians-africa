import {makeCanyonHorizon,makeDesertHorizon} from './horizon-source.js';

export function buildHorizonData({config,profile,region}){
  const make=config.biome==='desert'?makeDesertHorizon:makeCanyonHorizon;
  return make(config,profile,region.cx,region.cz,region.bounds);
}

export const horizonTransferables=data=>[data.terrain.buffer,data.water.buffer];

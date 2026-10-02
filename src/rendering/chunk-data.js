import {TerrainField,scatterWorld} from '../world/terrain.js';
import {buildGroundData} from './terrain-source.js';
import {nativeChunkWaterData} from './water-data.js';
import {chunkBounds} from './water-source.js';

// Same deterministic native recipes as the local renderer and navigation.
// Suppression is applied at installation using the current logical state.
export function buildNativeChunk(config,profile,cx,cz){
  const field=new TerrainField(config),bounds=chunkBounds(cx,cz);
  const terrain=buildGroundData(field,profile,cx,cz),water=nativeChunkWaterData(field,cx,cz,profile);
  const {instances}=scatterWorld({...config,bounds},profile,field);
  return {cx,cz,terrain,water,instances};
}
export const chunkTransferables=data=>[data.terrain.buffer,data.water.buffer];

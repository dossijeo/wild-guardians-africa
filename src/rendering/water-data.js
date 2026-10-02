import {buildChunkWater,chunkBounds} from './water-source.js';

// Pure CPU recipe: worker bundles need no Three geometry or GPU resources.
export function nativeChunkWaterData(field,cx,cz,profile){
  const positions=[],water={tri(a,b,c){positions.push(...a,...b,...c);}};
  buildChunkWater(field,chunkBounds(cx,cz),profile,water);return new Float32Array(positions);
}

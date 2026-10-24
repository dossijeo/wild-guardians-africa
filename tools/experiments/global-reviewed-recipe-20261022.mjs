import {globalNativeQuery} from './global-native-recipe-20261022.mjs';
// Reviewed composite only. Keep the historical base recipe stable for A/B controls.
export function globalReviewedQuery(biome){
 if(!['sabana','gran-rio','manglares','desierto','volcanes','gran-canon'].includes(biome))throw Error('Unknown review biome');
 const q=new URLSearchParams(globalNativeQuery);
 for(const [key,value]of Object.entries({spatialFar:'1',farTransitions:'smooth',waterEdges:'natural',waterPalette:'regional',riverBank:'soil',mangroveShore:'sediment'}))q.set(key,value);
 if(biome==='manglares')q.set('mangroveLeaves','cupped');
 if(biome==='gran-canon')q.set('waterCore','opaque');
 return q.toString();
}

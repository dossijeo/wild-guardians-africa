import {globalReviewedQuery} from './global-reviewed-recipe-20261022.mjs';
// Frozen closure candidate: historical A/B recipes remain untouched.
export function globalClosureQuery(biome){
 const q=new URLSearchParams(globalReviewedQuery(biome));
 if(biome==='gran-canon')q.set('canyonBank','balanced');
 return q.toString();
}

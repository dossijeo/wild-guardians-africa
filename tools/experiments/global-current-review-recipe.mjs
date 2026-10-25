import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
// Current artistic review selection, not game defaults or a completion claim.
// Historical recipes remain immutable controls for earlier reports.
export function globalCurrentReviewQuery(biome){
 const q=new URLSearchParams(globalClosureQuery(biome));
 if(biome==='manglares'){q.set('mangroveFerns','holly');q.set('groundCache','fixed512');}
 if(biome==='gran-canon')q.set('canyonWater','calm');
 return q.toString();
}

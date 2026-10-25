import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
// Native artistic selections; excludes all unpromoted prelit/composite LOD studies.
export function globalAcceptedQuery(biome){
 const q=new URLSearchParams(globalClosureQuery(biome));
 if(biome==='manglares')q.set('mangroveFerns','holly');
 if(biome==='gran-canon')q.set('canyonWater','calm');
 if(biome==='sabana'||biome==='gran-rio')q.set('mountainBase','raised');
 return q.toString();
}

import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
// Current artistic review selection, not game defaults or a completion claim.
// Historical recipes remain immutable controls for earlier reports.
export function globalCurrentReviewQuery(biome){
 const q=new URLSearchParams(globalClosureQuery(biome));
 // Keep native worker data alive when its graphical chunk leaves the camera.
 q.set('workerResidency','actors');
 // Keep coarse ground visible until the corresponding graphical chunk exists.
 if(['sabana','gran-rio','manglares','volcanes'].includes(biome))q.set('groundResidentMask','1');
 if(biome==='manglares'){q.set('mangroveFerns','holly');q.set('groundCache','fixed512');}
 if(biome==='sabana')q.set('savannaGround','fine');
 if(biome==='volcanes')q.set('volcanicGround','fine');
 if(biome==='gran-canon'){q.set('canyonWater','calm');q.set('horizonHandoff','atomic');}
 return q.toString();
}

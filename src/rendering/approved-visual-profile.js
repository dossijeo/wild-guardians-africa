// Production selection under integration. Callers supply the world biome; never
// derive it from a process-global active world or import historical QA recipes.
const COMMON=Object.freeze({
 visualLab:'global-lighting',skyAtmosphere:'clouds',grassCoverage:'continuous',
 riverSoil:'1',riverYards:'islands',mangroveSubstrate:'full',mangroveMoss:'layered',
 canyonSand:'full',canyonSandBlend:'soft',canyonNormals:'smooth',canyonFloor:'warm',canyonShadows:'horizon',
 sandRelief:'1',sandWear:'residual',sandMeso:'1',volcanicAsh:'mask',volcanicRock:'layered',volcanicNight:'spectrum',
 spatialFar:'1',farTransitions:'smooth',waterEdges:'natural',waterPalette:'regional',riverBank:'soil',mangroveShore:'sediment',workerResidency:'actors'
});
const BIOMES=Object.freeze({
 sabana:Object.freeze({groundResidentMask:'1',savannaGround:'fine'}),
 'gran-rio':Object.freeze({groundResidentMask:'1',riverGround:'fine'}),
 manglares:Object.freeze({groundResidentMask:'1',mangroveFerns:'holly',groundCache:'fixed512'}),
 desierto:Object.freeze({}),
 volcanes:Object.freeze({groundResidentMask:'1',volcanicGround:'fine'}),
 'gran-canon':Object.freeze({waterCore:'opaque',canyonBank:'balanced',canyonWater:'calm',horizonHandoff:'atomic'})
});
export function approvedVisualProfile(biome){
 if(!Object.hasOwn(BIOMES,biome))throw new Error('Unknown visual profile biome: '+biome);
 return Object.freeze({...COMMON,...BIOMES[biome]});
}
export function approvedVisualSearch(biome,search=''){
 const explicit=new URLSearchParams(search);
 // An explicit laboratory/legacy selection remains a complete QA control.
 if(explicit.has('visualLab'))return explicit.toString();
 const result=new URLSearchParams(approvedVisualProfile(biome));
 for(const [key,value]of explicit)result.set(key,value);
 return result.toString();
}

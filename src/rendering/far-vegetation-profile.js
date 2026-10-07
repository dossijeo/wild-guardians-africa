// Configurable first integration profile. Terrain residency stays unchanged;
// only native tree color representations fade into the procedural far layers.
export const FAR_TREE_DISTANCES=Object.freeze({muy_baja:Object.freeze([70,100]),baja:Object.freeze([80,110]),media:Object.freeze([90,120]),alta:Object.freeze([120,160])});
export function farVegetationProfile({quality,biome},overrides={}){
 const distances=FAR_TREE_DISTANCES[quality];if(!distances)throw Error('Unknown far vegetation quality');
 if(!['savanna','grand_river','mangrove','volcanoes','canyons','desert'].includes(biome))throw Error('Unknown far vegetation biome');
 const authoredSize={minimumHeight:24,start:200,end:240};
 return {...{qualityDriven:true,backdropHQ:true,start:distances[0],end:distances[1],visualRange:quality==='alta'?2:1,preserveTerrain:true,logicalStandbyPreload:true,logicalPreloadMargin:16,logicalSizePreload:true,transitionHeight:authoredSize,cullZeroImpostors:true,densityStart:270,densityEnd:280,densityMinimum:.04,fadeStart:280,fadeEnd:330,importanceHeight:16,importanceMaxBoost:4,groundStep:32,groundColorStep:4,groundWash:0,nativeWaterMask:true,groundSeam:true,simplifiedFarGround:false,includeFarGround:!['canyons','desert'].includes(biome),fogStart:90,fogEnd:480,fogDayColor:'#b3b5c0',fogNightColor:'#3f4140'},...overrides};
}

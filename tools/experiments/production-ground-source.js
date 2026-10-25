// Candidate: exclude an unreachable historical recipe from driver input.
// Keep the authored source intact for historical laboratory reproduction.
export function withoutLegacyGroundRecipe(source,{biome}={}){
 if(biome==='desert')return source;
 if(!['savanna','grand_river','mangrove','volcanoes','canyons'].includes(biome))throw Error('Unknown ground biome');
 const guard='if((uBiome>4.5?1.:0.)>.5){groundMaterialLegacy419(worldP,Ng,color,N,rough,wet);return;}';
 if(!source.includes(guard))throw Error('Legacy ground guard missing');
 // Preserve the fixed512 composition boundary used by downstream patches.
 source=source.replace(guard,'if((uBiome>4.5?1.:0.)>.5){return;}');
 const name='groundMaterialLegacy419',marker='void '+name+'(';
 const start=source.indexOf(marker);
 if(start<0||source.indexOf(name,start+marker.length)!==-1)throw Error('Legacy ground recipe missing or referenced');
 const open=source.indexOf('{',start);let depth=1,end=open+1;
 if(open<0)throw Error('Legacy ground recipe body missing');
 for(;end<source.length&&depth;end++){
  if(source[end]==='{')depth++;
  else if(source[end]==='}')depth--;
 }
 if(depth)throw Error('Legacy ground recipe body incomplete');
 return source.slice(0,start)+source.slice(end);
}

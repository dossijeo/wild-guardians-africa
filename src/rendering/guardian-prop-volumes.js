import {guardianPropBounds} from './guardian-prop-bounds.js';

// Uses native propsAt: an unavailable chunk throws rather than inventing
// empty ground. Strict mode is intended for an authoritative Worker that has
// received the complete biome pack metadata.
export function guardianPropVolumes(nav,assets,target,{strict=false}={}){
 const props=nav.propsAt?.(target.x,target.z,12);
 if(strict&&!Array.isArray(props))throw Error('Guardian prop coverage unavailable');
 const volumes=[];
 for(const p of props??[]){const asset=assets?.[p.slot];if(strict&&(!asset||!Array.isArray(asset.min)||!Array.isArray(asset.max)||asset.min.length!==3||asset.max.length!==3||![...asset.min,...asset.max].every(Number.isFinite)))throw Error('Guardian biome bounds unavailable');const bounds=guardianPropBounds(p,asset,nav.field.surface(p.x,p.z));if(bounds)volumes.push({id:'prop:'+p.id+':'+p.x+':'+p.z,...bounds});}
 return volumes;
}

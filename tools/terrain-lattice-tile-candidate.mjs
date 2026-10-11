// Isolated exact-value CPU experiment. Production TerrainField is unchanged.
import {TerrainField} from '../src/world/terrain.js';
export function installTerrainLatticeTiles(field,{side=32,capacity=16}={}){
 if(!field||typeof field.lattice!=='function'||typeof field.height!=='function'||!Number.isSafeInteger(side)||side<4||side>64||!Number.isSafeInteger(capacity)||capacity<1||capacity>64)throw Error('Invalid lattice tile candidate');
 if(field.lattice!==TerrainField.prototype.lattice)throw Error('Custom lattice adapters are not supported by the tile candidate');
 const original=field.lattice,hadOwn=Object.hasOwn(field,'lattice'),tiles=new Map(),area=side*side;
 let last=null,heightFunction=field.height,heightCache=field.heightCache,requests=0,hits=0,misses=0,evictions=0,fallbacks=0,invalidations=0;
 const invalidate=()=>{tiles.clear();last=null;heightFunction=field.height;heightCache=field.heightCache;invalidations++;};
 function lattice(x,z){
  requests++;
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z)){fallbacks++;return original.call(field,x,z);}
  if(heightFunction!==field.height||heightCache!==field.heightCache)invalidate();
  const tx=Math.floor(x/side),tz=Math.floor(z/side);let tile=last;
  if(!tile||tile.x!==tx||tile.z!==tz){
   const key=tx+','+tz;tile=tiles.get(key);
   if(!tile){
    if(tiles.size>=capacity){tiles.delete(tiles.keys().next().value);evictions++;}
    tile={x:tx,z:tz,values:new Float64Array(area),present:new Uint8Array(area)};tiles.set(key,tile);
   }
   last=tile;
  }
  const index=(z-tz*side)*side+(x-tx*side);
  if(tile.present[index]){hits++;return tile.values[index];}
  misses++;const value=field.height(x,z);
  // Native heights are numbers (including diagnostic NaN). Preserve custom
  // undefined/non-number adapters rather than converting them through Float64.
  if(typeof value==='number'){tile.values[index]=value;tile.present[index]=1;}
  return value;
 }
 field.lattice=lattice;
 return {invalidate,stats:()=>({side,capacity,tiles:tiles.size,requests,hits,misses,evictions,fallbacks,invalidations,
  typedArrayBytes:tiles.size*area*9,maximumTypedArrayBytes:capacity*area*9}),restore(){
  if(field.lattice!==lattice)throw Error('Lattice candidate ownership changed');
  if(hadOwn)field.lattice=original;else delete field.lattice;
  tiles.clear();last=null;
 }};
}

// Opt-in exact-value QA candidate. No running campaign imports this adapter.
import {TerrainField} from '../src/world/terrain.js';
export function installTerrainLatticeTiles(field,{side=32,capacity=16}={}){
 if(!field||typeof field.lattice!=='function'||typeof field.height!=='function'||!Number.isSafeInteger(side)||side<4||side>64||!Number.isSafeInteger(capacity)||capacity<1||capacity>64)throw Error('Invalid lattice tile candidate');
 if(field.lattice!==TerrainField.prototype.lattice)throw Error('Custom lattice adapters are not supported by the tile candidate');
 const original=field.lattice,hadOwn=Object.hasOwn(field,'lattice'),tiles=new Map(),area=side*side;
 let last=null,heightFunction=field.height,heightCache=field.heightCache,requests=0,hits=0,misses=0,evictions=0,fallbacks=0,invalidations=0,lastTileHits=0,tileLookups=0;
 const invalidate=()=>{tiles.clear();last=null;heightFunction=field.height;heightCache=field.heightCache;invalidations++;};
 function lattice(x,z){
  requests++;
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z)){fallbacks++;return original.call(field,x,z);}
  if(heightFunction!==field.height||heightCache!==field.heightCache)invalidate();
  let tile=last,localX=tile?x-tile.ox:NaN,localZ=tile?z-tile.oz:NaN;
  // Unsafe tile origins near integer representation limits retain the exact
  // original division/floor lookup, including its arithmetic conventions.
  if(!tile||!tile.safeOrigin||localX<0||localX>=side||localZ<0||localZ>=side){
   tileLookups++;
   const tx=Math.floor(x/side),tz=Math.floor(z/side),key=tx+','+tz;
   tile=tiles.get(key);
   if(!tile){
    if(tiles.size>=capacity){tiles.delete(tiles.keys().next().value);evictions++;}
    const ox=tx*side,oz=tz*side;
    tile={ox,oz,safeOrigin:Number.isSafeInteger(ox)&&Number.isSafeInteger(oz),values:new Float64Array(area),present:new Uint8Array(area)};tiles.set(key,tile);
   }
   last=tile;localX=x-tile.ox;localZ=z-tile.oz;
  }else lastTileHits++;
  const index=localZ*side+localX;
  if(tile.present[index]){hits++;return tile.values[index];}
  misses++;const value=field.height(x,z);
  if(typeof value==='number'){tile.values[index]=value;tile.present[index]=1;}
  return value;
 }
 field.lattice=lattice;
 return {invalidate,stats:()=>({side,capacity,tiles:tiles.size,requests,hits,misses,evictions,fallbacks,invalidations,lastTileHits,tileLookups,
  typedArrayBytes:tiles.size*area*9,maximumTypedArrayBytes:capacity*area*9}),restore(){
  if(field.lattice!==lattice)throw Error('Lattice candidate ownership changed');
  if(hadOwn)field.lattice=original;else delete field.lattice;
  tiles.clear();last=null;
 }};
}

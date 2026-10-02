import * as THREE from 'three';
import {buildAssetWater} from './water-source.js';
import {nativeChunkWaterData} from './water-data.js';
export {nativeChunkWaterData} from './water-data.js';

// The source recipes emit local chunk coordinates and local asset coordinates.
// Keep that ownership; instance/model matrices supply world coordinates once.
class WaterPositions {
  constructor(){this.positions=[];}
  tri(a,b,c){this.positions.push(...a,...b,...c);}
  geometry(){
    return nativeWaterBuffer(new Float32Array(this.positions));
  }
}
export function nativeChunkWater(field,cx,cz,profile){
  return nativeWaterBuffer(nativeChunkWaterData(field,cx,cz,profile));
}
export function nativeWaterBuffer(positions){
  if(!positions.length)return null;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
export function nativeAssetWater(asset){
  if(!asset.water)return null;
  const water=new WaterPositions();buildAssetWater(asset,water);return water.geometry();
}

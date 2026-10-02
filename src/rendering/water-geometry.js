import * as THREE from 'three';
import {buildChunkWater,buildAssetWater,chunkBounds} from './water-source.js';

// The source recipes emit local chunk coordinates and local asset coordinates.
// Keep that ownership; instance/model matrices supply world coordinates once.
class WaterPositions {
  constructor(){this.positions=[];}
  tri(a,b,c){this.positions.push(...a,...b,...c);}
  geometry(){
    if(!this.positions.length)return null;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(this.positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
  }
}
export function nativeChunkWater(field,cx,cz,profile){
  const water=new WaterPositions();buildChunkWater(field,chunkBounds(cx,cz),profile,water);return water.geometry();
}
export function nativeAssetWater(asset){
  if(!asset.water)return null;
  const water=new WaterPositions();buildAssetWater(asset,water);return water.geometry();
}

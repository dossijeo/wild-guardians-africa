import * as THREE from 'three';
import {makeCanyonHorizon,makeDesertHorizon} from './horizon-source.js';
import {nativeTerrainBuffer} from './terrain-geometry.js';
import {nativeGroundMaterial,updateGroundQuality} from './render-quality.js';
import {activeChunkRegion} from '../world/active-region.js';

// ChunkManager.plan centers resident terrain on the eye, not the point of interest.
export const nativeNearRegion=activeChunkRegion;

export class NativeHorizon{
  constructor(scene,waterMaterial,onMaterialChange=null,groundMaterial=null){this.scene=scene;this.waterMaterial=waterMaterial;this.onMaterialChange=onMaterialChange;this.groundMaterial=groundMaterial;this.group=null;this.key=null;}
  update(config,profile,region,quality,force=false){
    const key=JSON.stringify([config.biome,config.seed,config.relief,config.river,region.cx,region.cz,region.range]);
    if(!force&&this.key===key){if(this.group)updateGroundQuality(this.group.children.filter(o=>o.userData.nativeHorizon==='terrain'),quality,this.onMaterialChange);return;}
    this.dispose();this.key=key;
    if(!['canyons','desert'].includes(config.biome))return;
    const make=config.biome==='desert'?makeDesertHorizon:makeCanyonHorizon;
    const data=make(config,profile,region.cx,region.cz,region.bounds),group=new THREE.Group();group.name='native-horizon';group.position.set(region.cx*48,0,region.cz*48);
    const material=nativeGroundMaterial(quality);
    this.groundMaterial?.(material,region.cx,region.cz);
    // Canyon batches discard the resident rectangle; desert's seam apron remains.
    if(config.biome==='canyons')material.userData.horizonBounds=new THREE.Vector4(...region.bounds);
    const ground=new THREE.Mesh(nativeTerrainBuffer(data.terrain),material);ground.userData.nativeHorizon='terrain';group.add(ground);
    if(data.water.length){const water=new THREE.Mesh(nativeTerrainBuffer(data.water),this.waterMaterial(region.bounds,true));water.userData.nativeHorizon='water';group.add(water);}
    this.group=group;this.scene.add(group);
  }
  dispose(){
    if(this.group){this.scene.remove(this.group);this.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});this.group=null;}
    this.key=null;
  }
}

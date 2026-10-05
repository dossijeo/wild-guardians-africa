import * as THREE from 'three';
import {buildHorizonData} from './horizon-data.js';
import {HorizonGenerator} from './horizon-generator.js';
import {nativeTerrainBuffer} from './terrain-geometry.js';
import {nativeGroundMaterial,updateGroundQuality} from './render-quality.js';
import {activeChunkRegion} from '../world/active-region.js';

// ChunkManager.plan centers resident terrain on the eye, not the point of interest.
export const nativeNearRegion=activeChunkRegion;

export class NativeHorizon{
  constructor(scene,waterMaterial,onMaterialChange=null,groundMaterial=null,options={}){this.scene=scene;this.waterMaterial=waterMaterial;this.onMaterialChange=onMaterialChange;this.groundMaterial=groundMaterial;this.group=null;this.key=null;this.region=null;this.generator=new HorizonGenerator(options);}
  update(config,profile,region,quality,force=false){
    const key=JSON.stringify([config.biome,config.seed,config.relief,config.river,region.cx,region.cz,region.range]);
    const materialKey=JSON.stringify([config.biome,config.seed,config.relief,config.river,quality==='muy_baja']);
    if(!['canyons','desert'].includes(config.biome)){this.generator.cancel();this.clear();return region;}
    const ready=this.generator.take(key);
    if(!ready&&!force&&this.key===key){this.generator.cancel();if(this.group)updateGroundQuality(this.group.children.filter(o=>o.userData.nativeHorizon==='terrain'),quality,this.onMaterialChange);this.materialKey=materialKey;return this.region;}
    let data=ready;
    if(!data){if(this.generator.plan({key,config,profile,region},force))return this.region??region;data=buildHorizonData({config,profile,region});}
    const retained=this.materialKey===materialKey?this.group?.children.find(o=>o.userData.nativeHorizon==='terrain')?.material:null;
    this.clear(retained);this.key=key;this.materialKey=materialKey;this.region=structuredClone(region);
    const group=new THREE.Group();group.name='native-horizon';group.position.set(region.cx*48,0,region.cz*48);
    // Keep the only horizon shader owner alive while replacing its geometry.
    // Disposing it on every camera-region change deletes the GPU program and
    // makes the next horizon draw compile that shader synchronously again.
    const material=retained??nativeGroundMaterial(quality);
    if(!retained)this.groundMaterial?.(material,region.cx,region.cz);
    // Canyon batches discard the resident rectangle; desert's seam apron remains.
    if(config.biome==='canyons'){material.userData.horizonBounds??=new THREE.Vector4();material.userData.horizonBounds.set(...region.bounds);}
    const ground=new THREE.Mesh(nativeTerrainBuffer(data.terrain),material);ground.userData.nativeHorizon='terrain';group.add(ground);
    if(data.water.length){const water=new THREE.Mesh(nativeTerrainBuffer(data.water),this.waterMaterial(region.bounds,true));water.userData.nativeHorizon='water';group.add(water);}
    this.group=group;this.scene.add(group);
    return this.region;
  }
  whenReady(){return this.generator.whenReady();}
  clear(retained=null){
    if(this.group){this.scene.remove(this.group);this.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.material!==retained)o.material.dispose();}});this.group=null;}
    this.key=null;this.region=null;
  }
  dispose(){this.generator.dispose();this.clear();}
}

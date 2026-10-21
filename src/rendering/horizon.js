import * as THREE from 'three';
import {buildHorizonData} from './horizon-data.js';
import {HorizonGenerator} from './horizon-generator.js';
import {nativeTerrainBuffer} from './terrain-geometry.js';
import {nativeGroundMaterial,updateGroundQuality} from './render-quality.js';
import {activeChunkRegion} from '../world/active-region.js';

// ChunkManager.plan centers resident terrain on the eye, not the point of interest.
export const nativeNearRegion=activeChunkRegion;
const spatialHorizonWorker=()=>typeof Worker==='undefined'?null:
  new Worker(new URL('../world/wild-engine/spatial-horizon-worker.js',import.meta.url),{type:'module'});
const waterRgb=value=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255);

export class NativeHorizon{
  constructor(scene,waterMaterial,onMaterialChange=null,groundMaterial=null,options={}){
    this.scene=scene;this.waterMaterial=waterMaterial;this.onMaterialChange=onMaterialChange;
    const visualOptions=new URLSearchParams(globalThis.location?.search??'');
    this.canyonShadowCaster=visualOptions.get('visualLab')==='global-lighting'&&visualOptions.get('canyonShadows')==='horizon';
    this.groundMaterial=groundMaterial;this.group=null;this.key=null;this.region=null;
    this.spatial=options.spatial??null;
    this.generator=new HorizonGenerator({...options,
      workerFactory:options.workerFactory??(this.spatial?spatialHorizonWorker:undefined)});
  }
  update(config,profile,region,quality,force=false){
    const revision=this.spatial?.revision();
    if(this.spatial&&!Number.isSafeInteger(revision))throw TypeError('Spatial horizon needs an integer terrain revision');
    const key=JSON.stringify([config.biome,config.seed,config.relief,config.river,region.cx,region.cz,region.range,revision]);
    const materialKey=JSON.stringify([config.biome,config.seed,config.relief,config.river,quality==='muy_baja']);
    if(!['canyons','desert'].includes(config.biome)){this.generator.cancel();this.clear();return region;}
    const ready=this.generator.take(key);
    if(!ready&&!force&&this.key===key){this.generator.cancel();if(this.group)updateGroundQuality(this.group.children.filter(o=>o.userData.nativeHorizon==='terrain'),quality,this.onMaterialChange);this.materialKey=materialKey;return this.region;}
    if(!ready&&!force&&this.spatial&&this.generator.latest?.key===key)return this.region??region;
    let data=ready;
    if(!data){
      if(this.spatial&&(this.generator.disabled||this.generator.dead))return this.region??region;
      const task=this.spatial?{key,region,state:this.spatial.snapshot(),
        waterColor:waterRgb(profile.colors.water),river:config.river}:{key,config,profile,region};
      if(this.generator.plan(task,force)||this.spatial)return this.region??region;
      data=buildHorizonData({config,profile,region});
    }
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
    const ground=new THREE.Mesh(nativeTerrainBuffer(data.terrain),material);ground.userData.nativeHorizon='terrain';ground.castShadow=config.biome==='canyons'&&this.canyonShadowCaster;group.add(ground);
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

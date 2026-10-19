import * as THREE from 'three';
import {json} from './assets.js';
import {hashCell,hex} from '../world/terrain.js';
import {buildGroundMask417} from './ground-mask.js';
import {chunkBounds} from './water-source.js';

// Texture uploads in the lab are raw RGBA8. Color conversion happens once in
// its lighting recipe; normal and packed AO/roughness/height remain raw too.
export class BiomeGround {
  constructor(){this.textures=[];this.layerTextures=[];this.masks=new Set();this.loading=new AbortController();this.disposed=false;}
  async load(assets,biome,profile,field){
    this.assertOpen();this.profile=profile;this.field=field;
    const tiles=await json('/content/ground-materials.json',{signal:this.loading.signal});
    this.layeredSavanna=biome==='savanna'&&['layer','layer-relief','layer-grass','layer-grass-sculpted'].includes(new URLSearchParams(globalThis.location?.search??'').get('visualLab'));
    this.layeredRelief=this.layeredSavanna&&new URLSearchParams(globalThis.location?.search??'').get('visualLab')==='layer-relief';
    this.tile=tiles[biome];this.assertOpen();
    try{
      for(const role of ['base','normal','arh']){
        const texture=this.tile[role]?await assets.texture(this.tile[role],false):new THREE.DataTexture(new Uint8Array([255,230,128,255]),1,1);
        this.assertOpen();
        // Borrowed asset cache textures need independent wrap/filter ownership.
        const map=this.tile[role]?texture.clone():texture;
        map.wrapS=map.wrapT=THREE.RepeatWrapping;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.generateMipmaps=true;map.anisotropy=8;map.needsUpdate=true;
        this.textures.push(map);
      }
      if(this.layeredSavanna)for(const role of ['base','normal','arh']){
        const source=await assets.texture(tiles.canyons[role],false);
        this.assertOpen();
        const map=source.clone();map.wrapS=map.wrapT=THREE.RepeatWrapping;
        map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;
        map.generateMipmaps=true;map.anisotropy=8;map.needsUpdate=true;
        this.layerTextures.push(map);
      }
    }catch(error){this.dispose();throw error;}
  }
  uniforms(cx,cz,bytes=null,{mapped=true}={}){
    this.assertOpen();
    const bo=chunkBounds(cx,cz);
    let mask;
    if(mapped){
      const data=bytes??buildGroundMask417(this.field.c,this.profile,this.field,bo);
      mask=new THREE.DataTexture(data,35,35,THREE.RGBAFormat);
      mask.minFilter=mask.magFilter=THREE.LinearFilter;mask.generateMipmaps=false;
      mask.needsUpdate=true;this.masks.add(mask);
    }else{
      // The far shader replaces this sample with a constant. Reuse one valid
      // sampler instead of generating a discarded JavaScript terrain mask.
      this.unmappedMask??=new THREE.DataTexture(new Uint8Array([0,128,0,0]),1,1,THREE.RGBAFormat);
      this.unmappedMask.needsUpdate=true;mask=this.unmappedMask;
    }
    const tile=this.tile,colors=this.profile.colors,soil=hex(colors.soil),grass=hex(colors.grass),foliage=hex(colors.foliage),blend=this.field.c.biome==='grand_river'?.32:.20;
    return {uGroundPureMoss:{value:this.tile.pureMoss?1:0},uGroundMask:{value:mask},uGroundRect:{value:new THREE.Vector4(bo.minX,bo.minZ,1.5,35)},uGroundMapped:{value:mapped?1:0},uGroundOn:{value:1},uGroundStrength:{value:1},uGroundMicro:{value:1},uGroundLayered:{value:this.layeredSavanna?(this.layeredRelief?2:1):0},uGroundDebug:{value:0},uGroundRelief:{value:1},uGroundParams:{value:new THREE.Vector4(tile.scale,tile.blend,this.layeredRelief?1.6:tile.normalBoost,this.layeredRelief?.12:(tile.relief??tile.jitter??0))},uGroundSeed:{value:new THREE.Vector2(hashCell(this.field.seed,0,1,417)/4294967296,hashCell(this.field.seed,1,0,417)/4294967296)},uGroundSoil:{value:new THREE.Vector3(...soil)},uGroundGrass:{value:new THREE.Vector3(...grass.map((v,i)=>v+(foliage[i]-v)*blend))},uGroundDetailMap:{value:this.textures[0]},uGroundNormal:{value:this.textures[1]},uGroundARH:{value:this.textures[2]},uLayerSandBase:{value:this.layerTextures[0]??this.textures[0]},uLayerSandNormal:{value:this.layerTextures[1]??this.textures[1]},uLayerSandARH:{value:this.layerTextures[2]??this.textures[2]}};
  }
  attach(material,cx,cz,bytes=null,options){
    const uniforms=this.uniforms(cx,cz,bytes,options);material.userData.biomeGround=uniforms;material.userData.groundBiome=this.field.c.biome;
    const mask=uniforms.uGroundMask.value;let owners=0;
    material.userData.retainBiomeGround=next=>{owners++;next.addEventListener('dispose',()=>{
      if(--owners===0&&mask!==this.unmappedMask&&this.masks.delete(mask))mask.dispose();
    });};
    material.userData.retainBiomeGround(material);
  }
  assertOpen(){if(this.disposed)throw new Error('Ground load cancelled');}
  dispose(){if(this.disposed)return;this.disposed=true;this.loading.abort();for(const texture of [...this.textures,...this.layerTextures,...this.masks,this.unmappedMask].filter(Boolean))texture.dispose();this.textures=[];this.layerTextures=[];this.masks.clear();this.unmappedMask=null;}
}

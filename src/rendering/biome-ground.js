import * as THREE from 'three';
import {json} from './assets.js';
import {hashCell,hex} from '../world/terrain.js';
import {buildGroundMask417} from './ground-mask.js';
import {chunkBounds} from './water-source.js';

// Texture uploads in the lab are raw RGBA8. Color conversion happens once in
// its lighting recipe; normal and packed AO/roughness/height remain raw too.
export class BiomeGround {
  constructor(){this.textures=[];this.masks=new Set();}
  async load(assets,biome,profile,field){
    this.profile=profile;this.field=field;
    this.tile=(await json('/content/ground-materials.json'))[biome];
    try{
      for(const role of ['base','normal','arh']){
        const texture=this.tile[role]?await assets.texture(this.tile[role],false):new THREE.DataTexture(new Uint8Array([255,230,128,255]),1,1);
        // Borrowed asset cache textures need independent wrap/filter ownership.
        const map=this.tile[role]?texture.clone():texture;
        map.wrapS=map.wrapT=THREE.RepeatWrapping;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.generateMipmaps=true;map.anisotropy=8;map.needsUpdate=true;
        this.textures.push(map);
      }
    }catch(error){this.dispose();throw error;}
  }
  uniforms(cx,cz,bytes=null){
    const bo=chunkBounds(cx,cz),data=bytes??buildGroundMask417(this.field.c,this.profile,this.field,bo);
    const mask=new THREE.DataTexture(data,35,35,THREE.RGBAFormat);mask.minFilter=mask.magFilter=THREE.LinearFilter;mask.generateMipmaps=false;mask.needsUpdate=true;this.masks.add(mask);
    const tile=this.tile,colors=this.profile.colors,soil=hex(colors.soil),grass=hex(colors.grass),foliage=hex(colors.foliage),blend=this.field.c.biome==='grand_river'?.32:.20;
    return {uGroundPureMoss:{value:this.tile.pureMoss?1:0},uGroundMask:{value:mask},uGroundRect:{value:new THREE.Vector4(bo.minX,bo.minZ,1.5,35)},uGroundMapped:{value:1},uGroundOn:{value:1},uGroundStrength:{value:1},uGroundMicro:{value:1},uGroundDebug:{value:0},uGroundRelief:{value:1},uGroundParams:{value:new THREE.Vector4(tile.scale,tile.blend,tile.normalBoost,tile.relief??tile.jitter??0)},uGroundSeed:{value:new THREE.Vector2(hashCell(this.field.seed,0,1,417)/4294967296,hashCell(this.field.seed,1,0,417)/4294967296)},uGroundSoil:{value:new THREE.Vector3(...soil)},uGroundGrass:{value:new THREE.Vector3(...grass.map((v,i)=>v+(foliage[i]-v)*blend))},uGroundDetailMap:{value:this.textures[0]},uGroundNormal:{value:this.textures[1]},uGroundARH:{value:this.textures[2]}};
  }
  attach(material,cx,cz,bytes=null){
    const uniforms=this.uniforms(cx,cz,bytes);material.userData.biomeGround=uniforms;
    const mask=uniforms.uGroundMask.value;let owners=0;
    material.userData.retainBiomeGround=next=>{owners++;next.addEventListener('dispose',()=>{if(--owners===0&&this.masks.delete(mask))mask.dispose();});};
    material.userData.retainBiomeGround(material);
  }
  dispose(){for(const texture of [...this.textures,...this.masks])texture.dispose();this.textures=[];this.masks.clear();}
}

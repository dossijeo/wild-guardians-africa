import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createWebGpuDesertGround} from '../src/rendering/webgpu-desert-ground.js';
import {createWebGpuMangroveGround} from '../src/rendering/webgpu-mangrove-ground.js';
import {createWebGpuSavannaGround} from '../src/rendering/webgpu-savanna-ground.js';
import {createWebGpuVolcanicGround} from '../src/rendering/webgpu-volcanic-ground.js';

test('all biome ground atlases use the original anisotropic mip filtering before upload',async()=>{
 const catalogue=JSON.parse(await readFile(new URL('../public/content/ground-materials.json',import.meta.url),'utf8'));
 const uploaded=[],renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:async()=>{}}}},initTexture(texture){uploaded.push({anisotropy:texture.anisotropy,min:texture.minFilter,mag:texture.magFilter,mipmaps:texture.generateMipmaps,wrapS:texture.wrapS,wrapT:texture.wrapT});}};
 const options={renderer,fetchImpl:async()=>({ok:true,json:async()=>catalogue}),imageLoader:async()=>({width:1,height:1,close(){}})};
 for(const [name,create,count] of [['desert',()=>createWebGpuDesertGround(options),2],['mangrove',()=>createWebGpuMangroveGround(options),3],['volcanoes',()=>createWebGpuVolcanicGround(options),3],...['savanna','grand_river','canyons'].map(biome=>[biome,()=>createWebGpuSavannaGround({...options,biome}),3])]){
  const start=uploaded.length,provider=await create();try{const atlases=uploaded.slice(start);assert.equal(atlases.length,count,name);for(const atlas of atlases)assert.deepEqual(atlas,{anisotropy:8,min:THREE.LinearMipmapLinearFilter,mag:THREE.LinearFilter,mipmaps:true,wrapS:THREE.RepeatWrapping,wrapT:THREE.RepeatWrapping},name);}finally{provider.dispose();}
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createContinuousGrass} from '../src/rendering/continuous-grass.js';
import {emit} from '../src/simulation/game.js';
test('crop soil follows confirmed events, replaces chunks and restores borrowed masks',async()=>{
 const fetch=globalThis.fetch,location=globalThis.location;
 globalThis.fetch=async()=>({json:async()=>JSON.parse(await readFile(new URL('../public/assets/visual-lab/continuous-grass/modules.json',import.meta.url),'utf8'))});
 globalThis.location={search:'?visualLab=global-lighting&riverSoil=1&cropSoil=local'};
 const make=()=>{const data=new Uint8Array(35*35*4);for(let i=0;i<data.length;i+=4){data[i]=255;data[i+2]=255;}const texture={image:{data}};const positions=[];for(let z=-24;z<=24;z++)for(let x=-24;x<=24;x++)positions.push(x,0,z);const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));mesh.userData.ground=true;mesh.material.userData.biomeGround={uGroundMask:{value:texture},uGroundDetailMap:{value:new THREE.Texture()},uGroundSeed:{value:new THREE.Vector2()},uGroundParams:{value:new THREE.Vector4(.2,0,0,0)}};const group=new THREE.Group();group.add(mesh);return {data,texture,mesh,group};};
 const a=make(),b=make(),state={biome:'gran-rio',elapsed:2,plants:[{id:1,x:0,z:0,alive:true}],structures:[],events:[],sequence:0};
 const world={biomeGround:{},state,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),quality:'media',toon:{uniforms:{},shadowUniforms:{}},terrainMeshes:[a.mesh],chunks:new Map([['0,0',a.group]]),objects:new Map(),nav:{obstacles:[],field:{seed:712}}};let q;
 try{
  q=await createContinuousGrass(world);assert.notDeepEqual(a.texture.image.data,a.data);assert.equal(q.chunks.get('0,0').mask.data,a.texture.image.data);
  state.plants=[];emit(state,'CropDestroyed',{cropId:1});assert.equal(q.occupancyDirty,true,'removal works even after record deleted');q.flush();assert.deepEqual(a.texture.image.data,a.data);assert.equal(q.chunks.get('0,0').mask.data,a.texture.image.data);
  state.plants=[{id:2,x:0,z:0,alive:true}];emit(state,'CropPlaced',{cropId:2});q.flush();assert.notDeepEqual(a.texture.image.data,a.data);
  world.chunks.set('0,0',b.group);q.chunk(0,0);assert.equal(a.texture.image.data,a.data,'replaced mask restored');assert.notDeepEqual(b.texture.image.data,b.data);
  q.release('0,0');assert.equal(b.texture.image.data,b.data);q.dispose();q.dispose();q.occupancyDirty=false;emit(state,'CropPlaced',{cropId:2});assert.equal(q.occupancyDirty,false);
 }finally{q?.dispose();globalThis.fetch=fetch;if(location===undefined)delete globalThis.location;else globalThis.location=location;for(const x of [a,b]){x.mesh.geometry.dispose();x.mesh.material.dispose();}}
});

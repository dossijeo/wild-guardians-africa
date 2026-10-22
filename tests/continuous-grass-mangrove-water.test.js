import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createContinuousGrass,continuousGrassEnabled} from '../src/rendering/continuous-grass.js';

test('mangrove coverage keeps neighboring water clear and invalidates shore tiles on release',async()=>{
 assert.equal(continuousGrassEnabled('manglares','?visualLab=global-lighting&grassCoverage=continuous'),true);
 const modules=JSON.parse(await readFile(new URL('../public/assets/visual-lab/mangrove-leaf-fill-20261021/modules.json',import.meta.url),'utf8'));
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>({json:async()=>structuredClone(modules)});
 const mask=new Uint8Array(35*35*4);for(let i=0;i<mask.length;i+=4){mask[i]=255;mask[i+1]=128;mask[i+2]=255;}
 const ground={uGroundDetailMap:{value:new THREE.Texture()},uGroundSeed:{value:new THREE.Vector2()},uGroundParams:{value:new THREE.Vector4(.2,0,0,0)},uGroundMask:{value:{image:{data:mask}}}};
 const positions=[];for(let z=-24;z<=24;z++)for(let x=-24;x<=24;x++)positions.push(x,0,z);
 const chunks=new Map();for(const cx of [0,1]){const group=new THREE.Group(),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial());m.userData.ground=true;m.material.userData.biomeGround=ground;group.add(m);chunks.set(cx+',0',group);}
 const waterGeometry=new THREE.BufferGeometry();waterGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-24,0,-8,-20,0,-8,-20,0,8,-24,0,-8,-20,0,8,-24,0,8],3));const water=new THREE.Mesh(waterGeometry,new THREE.MeshBasicMaterial());water.userData.nativeFluid='chunk';chunks.get('1,0').add(water);
 const diagonalGeometry=new THREE.BufferGeometry();diagonalGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-8,0,-8,8,0,-8,-8,0,8],3));const diagonal=new THREE.Mesh(diagonalGeometry,new THREE.MeshBasicMaterial());diagonal.userData.nativeFluid='chunk';chunks.get('0,0').add(diagonal);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,500);camera.position.set(12,30,28);camera.lookAt(12,0,0);camera.updateMatrixWorld();
 const world={biomeGround:{},state:{biome:'manglares',elapsed:2,plants:[],structures:[]},scene,camera,quality:'media',toon:{uniforms:{},shadowUniforms:{}},terrainMeshes:[chunks.get('0,0').children[0]],chunks,objects:new Map(),nav:{obstacles:[],field:{seed:712}}};
 let q;
 try{
  q=await createContinuousGrass(world);scene.onBeforeRender();assert.equal(q.edgePadding,.6);assert.equal(q.chunks.get('1,0').waterTriangleCount,2);
  const shoreItems=()=>[...q.tiles.values()].flatMap(t=>t.items).filter(p=>p[0]>23.4&&p[0]<24&&Math.abs(p[2])<7);
  assert.equal(shoreItems().length,0,'water in next chunk excludes blades across the boundary');
  const oldTile=q.tiles.get('2,0');assert.ok(oldTile);chunks.delete('1,0');q.release('1,0');assert.equal(q.tiles.has('2,0'),false,'neighbor shore cache invalidated');scene.onBeforeRender();assert.ok(shoreItems().length>0,'removing water restores eligible resident coverage');
  assert.equal(q.chunks.get('0,0').water.length,0);const items=[...q.tiles.values()].flatMap(t=>t.items);assert.ok(items.some(p=>p[0]>2&&p[0]<7&&p[2]>2&&p[2]<7),'dry corner inside the water bounding rectangle retains leaves');assert.equal(items.filter(p=>p[0]>-7&&p[0]<-2&&p[2]>-7&&p[2]<-2).length,0,'actual triangular water remains clear');
 }finally{q?.dispose();for(const group of chunks.values())group.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});globalThis.fetch=originalFetch;}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {uniform,float} from 'three/tsl';
import {createWebGpuGrassOwner} from '../src/rendering/webgpu-grass-owner.js';

test('unpublished hidden fluid does not mask grass; visible fluid invalidates coverage',async()=>{
 const modules=JSON.parse(await readFile(new URL('../public/assets/visual-lab/continuous-grass/modules.json',import.meta.url),'utf8'));
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),atlas=new THREE.Texture(),mask=new Uint8Array(35*35*4),positions=new Float32Array(49*49*3);
 for(let i=0;i<mask.length;i+=4)mask.set([255,128,255,0],i);
 for(let z=0;z<49;z++)for(let x=0;x<49;x++){const i=(z*49+x)*3;positions[i]=x-24;positions[i+2]=z-24;}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const terrainMaterial=new THREE.MeshBasicMaterial(),terrain=new THREE.Mesh(geometry,terrainMaterial);terrain.userData.checkpointGroundMask=mask;scene.add(terrain);
 const waterGeometry=new THREE.BoxGeometry(100,1,100),waterMaterial=new THREE.MeshBasicMaterial(),water=new THREE.Mesh(waterGeometry,waterMaterial),provisional=new THREE.Group();water.userData.nativeFluid='asset';water.userData.spatialChunk='0,0';provisional.visible=false;provisional.add(water);scene.add(provisional);
 let jobs=0;const ground={acquireGrassResources:()=>({atlas,seed:uniform(new THREE.Vector2()),scale:uniform(.1),night:uniform(0),nightLight:uniform(1),exposure:uniform(1),sunDirection:uniform(new THREE.Vector3(0,1,0)),shadowVisibility:float(1),release(){}})};
 const owner=createWebGpuGrassOwner({scene,camera,residency:{getVisible:()=>terrain},biome:'sabana',state:{seed:123,structures:[],villages:[],plants:[]},ground,clock:uniform(0),admission:{async prepareAndPublish(_group,{signal},publish){jobs++;if(!signal.aborted)publish();}},quality:'baja',fetchImpl:async()=>({ok:true,json:async()=>structuredClone(modules)})});
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 try{owner.syncState();owner.syncChunk('0,0');await owner.ready;await flush();assert.equal(owner.status().visible,1);assert.equal(jobs,1);provisional.visible=true;owner.syncChunk('0,0');await flush();assert.equal(owner.status().visible,0);assert.equal(jobs,1);provisional.visible=false;owner.syncChunk('0,0');await flush();assert.equal(owner.status().visible,1);assert.equal(jobs,2);}finally{owner.dispose();geometry.dispose();terrainMaterial.dispose();waterGeometry.dispose();waterMaterial.dispose();atlas.dispose();}
});

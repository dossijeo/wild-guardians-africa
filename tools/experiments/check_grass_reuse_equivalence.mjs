import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import * as THREE from 'three';
import {uniform,float} from 'three/tsl';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {createWebGpuGrassOwner as createCandidate} from '../../src/rendering/webgpu-grass-owner.js';

// The baseline module must live next to the owner because its imports are
// relative. A unique, exclusively created file is always removed afterwards.
const scratch=path.resolve('src/rendering',`__qa_grass_baseline_${process.pid}.mjs`),baselineSource=execFileSync('git',['show','d539d86ef:src/rendering/webgpu-grass-owner.js'],{encoding:'utf8'});
await writeFile(scratch,baselineSource,{flag:'wx'});
try {
 const {createWebGpuGrassOwner:createBaseline}=await import(pathToFileURL(scratch));
 const modules={grass:JSON.parse(await readFile('public/assets/visual-lab/continuous-grass/modules.json','utf8')),mangrove:JSON.parse(await readFile('public/assets/visual-lab/mangrove-leaf-fill-20261021/modules.json','utf8'))};
 const wasm=new WebAssembly.Module(await readFile('src/world/wild-engine/spatial-savanna.wasm'));
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 function setup(create,biome,fern,realTerrain,reuseOnResume=true,requireTerrainRevision=true){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),atlas=new THREE.Texture(),mask=new Uint8Array(35*35*4);camera.position.x=48;for(let i=0;i<mask.length;i+=4)mask.set([255,128,255,0],i);
  const meshes=new Map(),versions=new Map(),core=realTerrain?createSpatialWorld(wasm):null;for(const [cx,cz] of [[0,0],[1,0],[2,0]]){let p,chunkMask,water;if(core){const nativeBiome=biome==='sabana'?'savanna':biome==='gran-rio'?'grand_river':'mangrove';core.generate(123,cx,cz,nativeBiome,{mangroveNetwork:biome==='manglares'});const payload=core.chunkPayload();p=payload.terrain.positions.slice();chunkMask=payload.groundMask.slice();water=payload.water.slice();}else{p=new Float32Array(49*49*3);for(let z=0;z<49;z++)for(let x=0;x<49;x++){const i=(z*49+x)*3;p[i]=x-24;p[i+2]=z-24;}chunkMask=mask.slice();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial());mesh.userData.checkpointGroundMask=chunkMask;const parent=new THREE.Group();parent.add(mesh);if(water?.length){const fluidGeometry=new THREE.BufferGeometry();fluidGeometry.setAttribute('position',new THREE.BufferAttribute(water,3));const fluid=new THREE.Mesh(fluidGeometry,new THREE.MeshBasicMaterial());fluid.userData.nativeFluid='chunk';parent.add(fluid);}scene.add(parent);meshes.set(`${cx},${cz}`,mesh);versions.set(`${cx},${cz}`,1);}
  const state={seed:123,structures:[],villages:[],plants:[]},errors=[],jobs=[],residency={getVisible:(x,z)=>meshes.get(`${x},${z}`)??null,revisionAt:(x,z)=>versions.has(`${x},${z}`)?{epoch:'e',revision:versions.get(`${x},${z}`)}:null,forEachVisibleGround:fn=>{for(const [key,mesh] of meshes)fn(mesh,key);}},ground={acquireGrassResources:()=>({atlas,seed:uniform(new THREE.Vector2()),scale:uniform(.1),night:uniform(0),nightLight:uniform(1),exposure:uniform(1),sunDirection:uniform(new THREE.Vector3(0,1,0)),shadowVisibility:float(1),release(){}})},admission={prepareAndPublish(group,{signal},publish){jobs.push(group);if(!signal.aborted)publish();return Promise.resolve();},deferRelease(_group,release){release();},deferCompilations(release){release();}};
  const renderer=fern?{backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>Promise.resolve()}}},initTexture(){}}:null;
  const owner=create({scene,camera,residency,state,ground,clock:uniform(0),admission,biome,fern,renderer,imageLoader:fern?async()=>({close(){}}):null,quality:'baja',initiallySuspended:true,requireTerrainRevision,reuseOnResume,fetchImpl:async()=>({ok:true,json:async()=>structuredClone(biome==='manglares'?modules.mangrove:modules.grass)}),onError:error=>errors.push(error)});
  return {scene,owner,meshes,versions,state,jobs,errors,close(){owner.dispose();for(const mesh of meshes.values()){mesh.geometry.dispose();mesh.material.dispose();}atlas.dispose();}};
 }
 function visibleGeometry(fixture){const result=new Map();for(const group of fixture.scene.children){const mesh=group.isGroup&&group.visible?group.children.find(c=>c.geometry?.isInstancedBufferGeometry):null;if(!mesh)continue;const g=mesh.geometry,a=g.getAttribute('coverageAnchor').array;assert.ok(a.length);const cx=Math.floor((a[0]+24)/48),cz=Math.floor((a[2]+24)/48);result.set(`${cx},${cz}`,{count:g.instanceCount,anchor:Array.from(a),data:Array.from(g.getAttribute('coverageData').array),slope:Array.from(g.getAttribute('coverageSlope').array)});}return result;}
 for(const [biome,fern] of [['sabana',false],['gran-rio',false],['manglares',false],['manglares',true]])for(const realTerrain of [false,true]){
 const a=setup(createBaseline,biome,fern,realTerrain),b=setup(createCandidate,biome,fern,realTerrain),rollback=setup(createCandidate,biome,fern,realTerrain,false),unversioned=setup(createCandidate,biome,fern,realTerrain,true,false),both=[a,b,rollback,unversioned];
 const compare=phase=>{const expected=visibleGeometry(a);assert.deepEqual(visibleGeometry(b),expected,phase);assert.deepEqual(visibleGeometry(rollback),expected,phase+' rollback');assert.deepEqual(visibleGeometry(unversioned),expected,phase+' unversioned');};
 try{
  for(const f of both){f.owner.syncChunk('0,0');f.owner.syncChunk('1,0');f.owner.syncChunk('2,0');await f.owner.ready;f.owner.resume();}await flush();assert.ok(visibleGeometry(a).size>0,'reference must draw grass');if(!realTerrain)assert.equal(visibleGeometry(a).size,3,'reference must draw all three controlled chunks');compare('initial');
  const originalJobs=b.jobs.length,rollbackJobs=rollback.jobs.length,unversionedJobs=unversioned.jobs.length;for(const f of both){f.owner.suspend();f.owner.resume();}await flush();assert.equal(b.jobs.length,originalJobs,'candidate must actually reuse the geometry');assert.ok(rollback.jobs.length>rollbackJobs,'rollback must rebuild');assert.ok(unversioned.jobs.length>unversionedJobs,'unversioned terrain must rebuild');compare('unchanged resume');
  for(const f of both){f.owner.suspend();const terrain=f.meshes.get('0,0');terrain.geometry.attributes.position.array[3*(24*49+24)+1]=.2;terrain.geometry.attributes.position.needsUpdate=true;f.versions.set('0,0',2);f.owner.syncChunk('0,0');f.owner.resume();}await flush();compare('terrain revision');
  for(const f of both){f.owner.suspend();const terrain=f.meshes.get('1,0');for(let z=14;z<20;z++)for(let x=14;x<20;x++)terrain.userData.checkpointGroundMask[(z*35+x)*4+3]=255;f.versions.set('1,0',2);f.owner.syncChunk('1,0');f.owner.resume();}await flush();compare('ground mask revision');
  for(const f of both){f.owner.suspend();const waterGeometry=new THREE.BoxGeometry(4,1,4);waterGeometry.translate(23,0,0);const water=new THREE.Mesh(waterGeometry,new THREE.MeshBasicMaterial());water.userData.nativeFluid='asset';water.userData.spatialChunk='0,0';f.scene.add(water);f.owner.syncChunk('0,0');f.owner.resume();}await flush();compare('water change');
  for(const f of both){f.owner.suspend();f.state.plants.push({x:2,z:2,alive:true});f.owner.resume();}await flush();compare('occupancy change');
  for(const f of [a,unversioned]){f.owner.suspend();const mask=f.meshes.get('2,0').userData.checkpointGroundMask;for(let z=14;z<20;z++)for(let x=14;x<20;x++)mask[(z*35+x)*4+3]=255;f.owner.resume();}await flush();assert.deepEqual(visibleGeometry(unversioned),visibleGeometry(a),'unversioned in-place mutation');
  for(const f of both)assert.deepEqual(f.errors,[]);console.log(JSON.stringify({ok:true,biome,fern,realTerrain,phases:['initial','unchanged resume','terrain revision','ground mask revision','water change','occupancy change','unversioned in-place mutation'],baselineAdmissions:a.jobs.length,candidateAdmissions:b.jobs.length,rollbackAdmissions:rollback.jobs.length}));
 }finally{a.close();b.close();rollback.close();unversioned.close();}
 }
}finally{await unlink(scratch);}

import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import * as THREE from 'three';
import {uniform,float} from 'three/tsl';
import {createWebGpuGrassOwner as createCandidate} from '../../src/rendering/webgpu-grass-owner.js';

// The baseline module must live next to the owner because its imports are
// relative. A unique, exclusively created file is always removed afterwards.
const scratch=path.resolve('src/rendering',`__qa_grass_baseline_${process.pid}.mjs`),baselineSource=execFileSync('git',['show','d539d86ef:src/rendering/webgpu-grass-owner.js'],{encoding:'utf8'});
await writeFile(scratch,baselineSource,{flag:'wx'});
try {
 const {createWebGpuGrassOwner:createBaseline}=await import(pathToFileURL(scratch));
 const modules=JSON.parse(await readFile('public/assets/visual-lab/continuous-grass/modules.json','utf8'));
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 function setup(create){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),atlas=new THREE.Texture(),mask=new Uint8Array(35*35*4);camera.position.x=48;for(let i=0;i<mask.length;i+=4)mask.set([255,128,255,0],i);
  const meshes=new Map(),versions=new Map();for(const [cx,cz] of [[0,0],[1,0],[2,0]]){const p=new Float32Array(49*49*3);for(let z=0;z<49;z++)for(let x=0;x<49;x++){const i=(z*49+x)*3;p[i]=x-24;p[i+2]=z-24;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial());mesh.userData.checkpointGroundMask=mask.slice();scene.add(mesh);meshes.set(`${cx},${cz}`,mesh);versions.set(`${cx},${cz}`,1);}
  const state={seed:123,structures:[],villages:[],plants:[]},errors=[],jobs=[],residency={getVisible:(x,z)=>meshes.get(`${x},${z}`)??null,revisionAt:(x,z)=>versions.has(`${x},${z}`)?{epoch:'e',revision:versions.get(`${x},${z}`)}:null,forEachVisibleGround:fn=>{for(const [key,mesh] of meshes)fn(mesh,key);}},ground={acquireGrassResources:()=>({atlas,seed:uniform(new THREE.Vector2()),scale:uniform(.1),night:uniform(0),nightLight:uniform(1),exposure:uniform(1),sunDirection:uniform(new THREE.Vector3(0,1,0)),shadowVisibility:float(1),release(){}})},admission={prepareAndPublish(group,{signal},publish){jobs.push(group);if(!signal.aborted)publish();return Promise.resolve();},deferRelease(_group,release){release();},deferCompilations(release){release();}};
  const owner=create({scene,camera,residency,state,ground,clock:uniform(0),admission,biome:'sabana',quality:'baja',initiallySuspended:true,requireTerrainRevision:true,fetchImpl:async()=>({ok:true,json:async()=>structuredClone(modules)}),onError:error=>errors.push(error)});
  return {scene,owner,meshes,versions,state,jobs,errors,close(){owner.dispose();for(const mesh of meshes.values()){mesh.geometry.dispose();mesh.material.dispose();}atlas.dispose();}};
 }
 function visibleGeometry(fixture){const result=new Map();for(const group of fixture.scene.children){const mesh=group.isGroup&&group.visible?group.children.find(c=>c.geometry?.isInstancedBufferGeometry):null;if(!mesh)continue;const g=mesh.geometry,a=g.getAttribute('coverageAnchor').array;assert.ok(a.length);const cx=Math.floor((a[0]+24)/48),cz=Math.floor((a[2]+24)/48);result.set(`${cx},${cz}`,{count:g.instanceCount,anchor:Array.from(a),data:Array.from(g.getAttribute('coverageData').array),slope:Array.from(g.getAttribute('coverageSlope').array)});}return result;}
 const a=setup(createBaseline),b=setup(createCandidate),both=[a,b];
 try{
  for(const f of both){f.owner.syncChunk('0,0');f.owner.syncChunk('1,0');f.owner.syncChunk('2,0');await f.owner.ready;f.owner.resume();}await flush();assert.equal(visibleGeometry(a).size,3,'reference must draw all three chunks');assert.deepEqual(visibleGeometry(b),visibleGeometry(a),'initial');
  const originalJobs=b.jobs.length;for(const f of both){f.owner.suspend();f.owner.resume();}await flush();assert.equal(b.jobs.length,originalJobs,'candidate must actually reuse the geometry');assert.deepEqual(visibleGeometry(b),visibleGeometry(a),'unchanged resume');
  for(const f of both){f.owner.suspend();const terrain=f.meshes.get('0,0');terrain.geometry.attributes.position.array[3*(24*49+24)+1]=.2;terrain.geometry.attributes.position.needsUpdate=true;f.versions.set('0,0',2);f.owner.syncChunk('0,0');f.owner.resume();}await flush();assert.deepEqual(visibleGeometry(b),visibleGeometry(a),'terrain revision');
  for(const f of both){f.owner.suspend();const waterGeometry=new THREE.BoxGeometry(4,1,4);waterGeometry.translate(23,0,0);const water=new THREE.Mesh(waterGeometry,new THREE.MeshBasicMaterial());water.userData.nativeFluid='asset';water.userData.spatialChunk='0,0';f.scene.add(water);f.owner.syncChunk('0,0');f.owner.resume();}await flush();assert.deepEqual(visibleGeometry(b),visibleGeometry(a),'water change');
  for(const f of both){f.owner.suspend();f.state.plants.push({x:2,z:2,alive:true});f.owner.resume();}await flush();assert.deepEqual(visibleGeometry(b),visibleGeometry(a),'occupancy change');
  for(const f of both)assert.deepEqual(f.errors,[]);console.log(JSON.stringify({ok:true,phases:['initial','unchanged resume','terrain revision','water change','occupancy change'],baselineAdmissions:a.jobs.length,candidateAdmissions:b.jobs.length}));
 }finally{a.close();b.close();}
}finally{await unlink(scratch);}

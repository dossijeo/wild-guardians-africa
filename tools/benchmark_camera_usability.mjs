// CPU-only cost of the production camera resolver in a static, dense world.
// No renderer/gameplay, so this is not GPU or physical mobile acceptance.
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import * as THREE from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {protectTerrainCamera,focusTerrainCamera} from '../src/rendering/terrain-camera.js';
const rows=[];
for(const count of [100,1000,5000]){
 const camera=new THREE.PerspectiveCamera(),controls={target:new THREE.Vector3(),maxDistance:65},field={surface:()=>0};
 const geometry=new THREE.BoxGeometry(3,12,3);geometry.computeBoundingBox();const instances=Array.from({length:count},(_,i)=>({id:i,x:(i%100)*10+100,y:0,z:Math.floor(i/100)*10+100,sx:1,sy:1,sz:1,yaw:i*.01}));
 const group=new THREE.Group();group.userData.lodBatches=[{group:0,chunkOrigin:[0,0],levels:[{geometry}],instances}];
 const world={camera,controls,nav:{field},objects:new Map(),chunks:new Map([['qa',group]]),chunkRevision:1,state:{villages:[],structures:[]}};
 for(const arm of ['A1','B1','B2','A2']){
  const active=arm.startsWith('B'),before=performance.now();WorldScene.prototype.setCameraExclusion.call(world,active,{trees:true});focusTerrainCamera(camera,controls,field,{x:0,z:0,distance:25});const preparationMs=performance.now()-before;
  const update=i=>{const angle=i*.015;camera.position.set(Math.sin(angle)*25,8,Math.cos(angle)*25);protectTerrainCamera(camera,controls,field);};
  for(let i=0;i<500;i++)update(i);
  const samples=[];for(let i=0;i<5000;i++){const start=performance.now();update(i);samples.push(performance.now()-start);}
  samples.sort((a,b)=>a-b);rows.push({count,arm,active,preparationMs,p50Ms:samples[2500],p95Ms:samples[4750],p99Ms:samples[4950],maxMs:samples.at(-1),volumes:world.cameraExclusion?.registry.index.records.size??0,localCandidates:world.cameraExclusion?.registry.index.lastCandidates??0,cpuOnly:true,isolatedHostedRunner:!!process.env.GITHUB_ACTIONS});
 }
 WorldScene.prototype.setCameraExclusion.call(world,false);geometry.dispose();
}
// Structural refresh paths, not just the cached clear-path resolver. All
// wall geometry/hinges use the production registry, but remain synthetic inputs.
for(const count of [100,1000])for(const scenario of ['walls-stable','walls-dirty','gate-changing','multiple-destructions']){
 const camera=new THREE.PerspectiveCamera(),controls={target:new THREE.Vector3(),maxDistance:65},field={surface:()=>0},geometry=new THREE.BoxGeometry(3,4,.4);geometry.computeBoundingBox();
 const objects=new Map(),structures=[],originals=new Map();
 for(let i=0;i<count;i++){const root=new THREE.Group(),mesh=new THREE.Mesh(geometry);root.userData.nativeWall=true;root.stageKey='still';root.gateOpen=0;root.visual=0;root.position.set((i%40)*4-80,0,Math.floor(i/40)*4+8);root.add(mesh);root.parts=[{mesh}];objects.set(i,root);originals.set(i,root);structures.push({id:i,kind:'wall'});}
 const world={camera,controls,nav:{field},objects,chunks:new Map(),chunkRevision:1,state:{villages:[],structures}};
 for(const arm of ['A1','B1','B2','A2']){
  for(const [id,root] of originals)objects.set(id,root);let removed=[];
  const active=arm.startsWith('B'),before=performance.now();WorldScene.prototype.setCameraExclusion.call(world,active,{trees:true});focusTerrainCamera(camera,controls,field,{x:0,z:0,distance:25});const preparationMs=performance.now()-before;
  const update=i=>{if(scenario!=='walls-stable')world.cameraVolumesDirty=true;if(scenario==='gate-changing'){const root=objects.get(i%count);root.gateOpen=1-root.gateOpen;root.parts[0].mesh.rotation.y=root.gateOpen*Math.PI/2;world.cameraDirtyEntities?.set(i%count,structures[i%count]);}if(scenario==='multiple-destructions'){for(const id of removed){objects.set(id,originals.get(id));world.cameraDirtyEntities?.set(id,structures[id]);}removed=Array.from({length:10},(_,k)=>(i*10+k)%count);for(const id of removed){objects.delete(id);world.cameraDirtyEntities?.set(id,null);}}camera.position.set(Math.sin(i*.015)*25,8,Math.cos(i*.015)*25);protectTerrainCamera(camera,controls,field);};
  for(let i=0;i<500;i++)update(i);const samples=[];for(let i=0;i<2000;i++){const t=performance.now();update(i);samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);
  rows.push({count,scenario,arm,active,preparationMs,p50Ms:samples[1000],p95Ms:samples[1900],p99Ms:samples[1980],maxMs:samples.at(-1),volumes:world.cameraExclusion?.registry.index.records.size??0,localCandidates:world.cameraExclusion?.registry.index.lastCandidates??0,cpuOnly:true,isolatedHostedRunner:!!process.env.GITHUB_ACTIONS});
 }
 WorldScene.prototype.setCameraExclusion.call(world,false);geometry.dispose();
}
const report={schema:3,limits:'Synthetic dense native tree/wall descriptors, cached resolver, forced dirty refresh, and changing gate hinges and ten-piece destruction/reappearance; no GPU, renderer, physical Android, live streaming or simulation.',rows};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2));else console.log(JSON.stringify(report,null,2));

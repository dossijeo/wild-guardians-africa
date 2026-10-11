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
const report={schema:1,limits:'Synthetic dense resident native tree descriptors and production resolver; no GPU, renderer, physical Android, live streaming or simulation.',rows};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2));else console.log(JSON.stringify(report,null,2));

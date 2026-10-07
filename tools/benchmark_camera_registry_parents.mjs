import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CameraBuildingRegistry as Baseline} from '../docs/qa/camera-volume-foundation/parent-cache-baseline.mjs';
import {CameraBuildingRegistry as Candidate} from '../src/rendering/camera-building-registry.js';
const percentile=(values,p)=>values.toSorted((a,b)=>a-b)[Math.floor((values.length-1)*p)];
for(const count of [30,1000])for(const depth of [0,1,4])for(const mode of ['idle','move-one']){
 let expected;
 for(const arm of ['A1','B1','B2','A2']){
  const registry=new (arm.startsWith('A')?Baseline:Candidate)(),objects=new Map(),entities=[];
  const bounds=new THREE.Box3(new THREE.Vector3(-2,0,-2),new THREE.Vector3(2,5,2));let parent=null;
  for(let level=0;level<depth;level++){const node=new THREE.Group();node.position.y=.1;parent?.add(node);parent=node;}
  for(let i=0;i<count;i++){
   const root=new THREE.Group();root.userData.nativeBuilding=true;root.damage=0;root.template={culling:{boxes:{still:bounds,fall:bounds,ash:bounds}}};root.position.set((i%32)*12,0,Math.floor(i/32)*12);root.rotation.y=i*.137;parent?.add(root);objects.set(i,root);entities.push({id:i});
  }
  const samples=[],signature=[];
  for(let frame=0;frame<2000;frame++){
   if(mode==='move-one')objects.get(0).position.x=(frame%2)*.15;
   const before=performance.now();registry.sync(objects,entities);const elapsed=performance.now()-before;
   if(frame>=1000){samples.push(elapsed);const hit=registry.index.sweep([-10,3,0],[10,3,0],.45);signature.push(hit?`${hit.id}:${hit.fraction}`:'none');}
  }
  signature.push(JSON.stringify([...registry.index.records].map(([id,b])=>[id,b.min,b.max,b.yaw])));
  const hash=createHash('sha256').update(signature.join('\n')).digest('hex');expected??=hash;assert.equal(hash,expected);
  console.log(JSON.stringify({count,depth,mode,arm,warmupFrames:1000,frames:1000,p50Ms:percentile(samples,.5),p95Ms:percentile(samples,.95),maxMs:Math.max(...samples),resultHash:hash,cpuOnly:true}));registry.clear();
 }
}

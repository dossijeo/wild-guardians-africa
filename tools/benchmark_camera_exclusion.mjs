// Synthetic CPU measurements only: no renderer, actual frame or mobile claims.
import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CameraBuildingRegistry} from '../src/rendering/camera-building-registry.js';
import {CameraExclusionMotion} from '../src/rendering/camera-exclusion-motion.js';
const quantile=(values,q)=>values.toSorted((a,b)=>a-b)[Math.floor((values.length-1)*q)];
for(const count of [30,200,1000])for(const mode of ['idle','orbit','move-one','collapse-one']){
 const columns=Math.ceil(Math.sqrt(count)),objects=new Map(),entities=[];
 const still=new THREE.Box3(new THREE.Vector3(-2,0,-2),new THREE.Vector3(2,5,2)),boxes={still,fall:still.clone().expandByScalar(2),ash:new THREE.Box3(new THREE.Vector3(-3,0,-3),new THREE.Vector3(3,1,3))};
 for(let i=0;i<count;i++){
  const root=new THREE.Group();root.userData.nativeBuilding=true;root.template={culling:{boxes}};root.damage=0;root.rotation.y=i*.137;root.position.set((i%columns-Math.floor(columns/2))*14,0,(Math.floor(i/columns)-Math.floor(columns/2))*14);objects.set(i,root);entities.push({id:i});
 }
 const changed=[...objects.values()].toSorted((a,b)=>a.position.lengthSq()-b.position.lengthSq())[0],baseX=changed.position.x;
 const registry=new CameraBuildingRegistry(),motion=new CameraExclusionMotion(registry.index);registry.sync(objects,entities);
 const initialRevisions=registry.revisions,total=[],sync=[],solve=[],poses=[],lastCandidates=[];let previous=null,contacts=0;
 for(let frame=0;frame<500;frame++){
  if(mode==='move-one')changed.position.x=baseX+(frame%2)*.15;
  if(mode==='collapse-one')changed.damage=Math.floor(frame/20)%2?.9:0;
  const angle=frame*.009,eye=mode==='idle'?[-8,3,0]:[Math.sin(angle)*3,3,Math.cos(angle)*3];
  const begin=performance.now();registry.sync(objects,entities);const middle=performance.now();const point=motion.resolve(eye,previous,1/60);const end=performance.now();previous=point;
  assert.equal(motion.stats.unresolved,false);assert.equal(registry.index.sweep(point,point,motion.radius),null);
  if(frame>=100){total.push(end-begin);sync.push(middle-begin);solve.push(end-middle);contacts+=motion.stats.contacts;lastCandidates.push(registry.index.lastCandidates);poses.push(point.map(x=>x.toFixed(8)).join(','));}
 }
 if(mode==='idle'||mode==='orbit')assert.equal(registry.revisions,initialRevisions);
 const summary=values=>({p50Ms:quantile(values,.5),p95Ms:quantile(values,.95),maxMs:Math.max(...values)});
 console.log(JSON.stringify({count,mode,frames:400,cpuOnly:true,total:summary(total),registrySync:summary(sync),motionSolve:summary(solve),revisions:registry.revisions-initialRevisions,contacts,meanFinalSafetyQueryCandidates:lastCandidates.reduce((a,b)=>a+b,0)/400,resultHash:createHash('sha256').update(poses.join('\n')).digest('hex')}));
 registry.clear();assert.equal(registry.index.records.size,0);
}

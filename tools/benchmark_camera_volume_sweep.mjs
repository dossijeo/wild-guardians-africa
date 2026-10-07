// Synthetic CPU query cost; not a renderer, authored-asset or mobile benchmark.
import {performance} from 'node:perf_hooks';
import {firstCameraVolumeHit} from '../src/rendering/camera-volume-sweep.js';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const start=[0,3,0],end=[0,3,0];
for(const count of [50,500,2000]){
 const columns=Math.ceil(Math.sqrt(count)),volumes=Array.from({length:count},(_,i)=>{
  const x=(i%columns-columns/2)*8,z=(Math.floor(i/columns)-columns/2)*8;
  return {id:i,min:[x-2,0,z-2],max:[x+2,5+i%4,z+2]};
 });
 const index=new CameraVolumeIndex();for(const volume of volumes)index.set(volume.id,volume);
 let indexed=false;
 const update=frame=>{const angle=frame*.017;start[0]=Math.sin(angle)*20;start[2]=Math.cos(angle)*20;end[0]=start[0]+Math.cos(angle)*12;end[2]=start[2]-Math.sin(angle)*12;return indexed?index.sweep(start,end,.5):firstCameraVolumeHit(start,end,volumes,.5);};
 let baselineHash;
 for(const arm of ['A1','B1','B2','A2']){
 indexed=arm.startsWith('B');
 for(let i=0;i<100;i++)update(i);
 const samples=[],signature=[];let hits=0,candidates=0;
 for(let i=0;i<600;i++){const before=performance.now();const hit=update(i+100);samples.push(performance.now()-before);if(hit)hits++;candidates+=indexed?index.lastCandidates:count;signature.push(hit?`${hit.id}:${hit.fraction}`:'none');}
 const sorted=samples.toSorted((a,b)=>a-b);
 const resultHash=createHash('sha256').update(signature.join('\n')).digest('hex');baselineHash??=resultHash;assert.equal(resultHash,baselineHash);
 console.log(JSON.stringify({arm,count,frames:600,hits,meanCandidates:candidates/600,p50Ms:sorted[299],p95Ms:sorted[569],maxMs:sorted.at(-1),resultHash,cpuOnly:true}));
 }
 index.clear();
}

import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';
import {CameraExclusionMotion} from '../src/rendering/camera-exclusion-motion.js';
import {constrainCameraToTerrain} from '../src/rendering/camera-terrain-exclusion.js';
for(const count of [1,30,1000])for(const mode of ['clear','flat-recovery','cliff-recovery']){
 const index=new CameraVolumeIndex();
 for(let i=0;i<count;i++)index.set(i,{min:[(i%32)*100-20,0,Math.floor(i/32)*100-20],max:[(i%32)*100+20,30,Math.floor(i/32)*100+20]});
 const motion=new CameraExclusionMotion(index),field={surface:(x,z)=>mode==='cliff-recovery'&&(Math.abs(x)>20||Math.abs(z)>20)?50:0};
 const input=mode==='clear'?[0,10,-50]:[0,2,0],samples=[];let expected,iterations=0;
 for(let frame=0;frame<1100;frame++){
  const before=performance.now(),result=constrainCameraToTerrain(input,motion,field),elapsed=performance.now()-before;
  assert.equal(result.resolved,true);assert.equal(index.sweep(result.point,result.point,motion.radius),null);
  const height=result.point[1]-field.surface(result.point[0],result.point[2]);assert.ok(height>=2&&height<=20);
  expected??=result.point;assert.deepEqual(result.point,expected);
  if(frame>=100){samples.push(elapsed);iterations+=result.iterations;}
 }
 samples.sort((a,b)=>a-b);
 console.log(JSON.stringify({count,mode,frames:samples.length,p50Ms:samples[499],p95Ms:samples[949],maxMs:samples.at(-1),recoveryIterations:iterations,result:expected,cpuOnly:true}));
}

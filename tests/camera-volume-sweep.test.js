import test from 'node:test';
import assert from 'node:assert/strict';
import {sweepCameraVolume,firstCameraVolumeHit} from '../src/rendering/camera-volume-sweep.js';
const box={id:'house',min:[-2,0,-2],max:[2,5,2]};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} versus ${b}`);
test('fast movement cannot tunnel through a finite building',()=>{
 const hit=sweepCameraVolume([-10,2,0],[10,2,0],box,.5);
 near(hit.fraction,.375);assert.deepEqual(hit.point,[-2.5,2,0]);assert.deepEqual(hit.normal,[-1,0,0]);
});
test('overflight is allowed above the finite roof, and a descent detects that roof',()=>{
 assert.equal(sweepCameraVolume([-10,6,0],[10,6,0],box,.5),null);
 const hit=sweepCameraVolume([0,10,0],[0,2,0],box,.5);near(hit.fraction,4.5/8);assert.deepEqual(hit.normal,[0,1,0]);
});
test('rounded sphere corners preserve a diagonal path rejected by an expanded AABB',()=>{
 assert.equal(sweepCameraVolume([-3,5.9,2.9],[3,5.9,2.9],box,1),null);
 const hit=sweepCameraVolume([-3,5.6,2.6],[3,5.6,2.6],box,1);
 near(hit.point[0],-2-Math.sqrt(.28));near(Math.hypot(...hit.normal),1);
});
test('starting inside a newly loaded volume returns a finite nearest exit direction',()=>{
 const hit=sweepCameraVolume([1.9,2,0],[1.9,2,0],box,.5);assert.equal(hit.fraction,0);assert.deepEqual(hit.normal,[1,0,0]);
});
test('stationary safe camera and outward movement remain unobstructed',()=>{
 assert.equal(sweepCameraVolume([3,2,0],[3,2,0],box,.5),null);
 assert.equal(sweepCameraVolume([3,2,0],[10,2,0],box,.5),null);
});
test('selection uses the nearest obstacle rather than collection order',()=>{
 const far={id:'far',min:[6,0,-2],max:[8,5,2]};
 const hit=firstCameraVolumeHit([-10,2,0],[10,2,0],[far,box],.5);assert.equal(hit.id,'house');near(hit.fraction,.375);
});
test('zero radius ray and tangent sphere contact are included',()=>{
 near(sweepCameraVolume([-10,2,0],[10,2,0],box).fraction,.4);
 near(sweepCameraVolume([-10,6,0],[10,6,0],box,1).fraction,.4);
});
test('translated buildings and camera trajectories preserve the collision fraction',()=>{
 const offset=[1000000,37,-1000000],shift=p=>p.map((x,i)=>x+offset[i]);
 const moved={id:box.id,min:shift(box.min),max:shift(box.max)};
 const hit=sweepCameraVolume(shift([-10,2,0]),shift([10,2,0]),moved,.5);near(hit.fraction,.375);assert.deepEqual(hit.normal,[-1,0,0]);
});
test('invalid geometry and radii are rejected',()=>{
 for(const radius of [-1,Infinity,NaN])assert.throws(()=>sweepCameraVolume([0,0,0],[1,1,1],box,radius));
 assert.throws(()=>sweepCameraVolume([0,0,0],[1,1,1],{min:[2,0,0],max:[1,1,1]}));
});
test('seeded trajectories agree with an independent convex-distance oracle',()=>{
 let seed=712;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 for(let trial=0;trial<1000;trial++){
  const center=Array.from({length:3},()=>random()*40-20),half=center.map(()=>.2+random()*6),volume={min:center.map((x,i)=>x-half[i]),max:center.map((x,i)=>x+half[i])};
  const start=center.map(x=>x+random()*80-40),end=trial%3===0?center:center.map(x=>x+random()*80-40),radius=.1+random()*3;
  const distance=t=>start.reduce((sum,x,i)=>{const p=x+(end[i]-x)*t;const d=Math.max(volume.min[i]-p,0,p-volume.max[i]);return sum+d*d;},0),radius2=radius*radius;
  // Squared distance to a convex box along a line is convex. Locate its
  // minimum numerically, then bisect the first crossing, without using the
  // production face intervals, coefficients or quadratic roots.
  let lo=0,hi=1;for(let i=0;i<120;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(distance(a)<distance(b))hi=b;else lo=a;}
  const minimum=(lo+hi)/2,hit=sweepCameraVolume(start,end,volume,radius);
  if(distance(minimum)>radius2+1e-10){assert.equal(hit,null,`trial ${trial}`);continue;}
  assert.ok(hit,`trial ${trial}`);
  if(distance(0)<=radius2){assert.equal(hit.fraction,0);continue;}
  lo=0;hi=minimum;for(let i=0;i<90;i++){const t=(lo+hi)/2;if(distance(t)<=radius2)hi=t;else lo=t;}
  near(hit.fraction,hi);near(Math.hypot(...hit.normal),1);
 }
});

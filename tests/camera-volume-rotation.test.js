import test from 'node:test';
import assert from 'node:assert/strict';
import {sweepCameraVolume} from '../src/rendering/camera-volume-sweep.js';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} versus ${b}`);
const rotate=(p,center,yaw)=>{const c=Math.cos(yaw),s=Math.sin(yaw),x=p[0]-center[0],z=p[2]-center[2];return [center[0]+c*x+s*z,p[1],center[2]-s*x+c*z];};

test('oriented finite volumes preserve collision fractions and world-space normals',()=>{
 const plain={id:'long-house',min:[17,4,-13],max:[23,9,-11]},center=[20,6.5,-12];
 for(const yaw of [0,.17,Math.PI/4,Math.PI/2,Math.PI,5.7]){
  const start=[10,7,-12],end=[30,7,-12],expected=sweepCameraVolume(start,end,plain,.5);
  const actual=sweepCameraVolume(rotate(start,center,yaw),rotate(end,center,yaw),{...plain,yaw},.5);
  near(actual.fraction,expected.fraction);
  const point=rotate(expected.point,center,yaw),normal=rotate(expected.normal,[0,0,0],yaw);
  for(let i=0;i<3;i++){near(actual.point[i],point[i]);near(actual.normal[i],normal[i]);}
  assert.equal(actual.id,plain.id);
 }
});

test('rotated narrow house permits empty corners of its conservative world bounds',()=>{
 const volume={id:'house',min:[-4,0,-.5],max:[4,5,.5],yaw:Math.PI/4};
 assert.equal(sweepCameraVolume([2.7,2,2.7],[2.9,2,2.9],volume,.1),null);
 assert.equal(sweepCameraVolume([-10,6,0],[10,6,0],volume,.5),null);
 const hit=sweepCameraVolume([0,10,0],[0,2,0],volume,.5);near(hit.fraction,4.5/8);assert.deepEqual(hit.normal,[0,1,0]);
});

test('index uses rotated bounds and removes their memberships when rotation changes',()=>{
 const index=new CameraVolumeIndex({cellSize:1}),volume={min:[-8,0,-.5],max:[8,5,.5],yaw:Math.PI/2};
 index.set('house',volume);volume.yaw=0;
 assert.equal(index.sweep([-2,2,7],[2,2,7],.1).id,'house');
 index.set('house',volume);assert.equal(index.sweep([-2,2,7],[2,2,7],.1),null);
 index.delete('house');assert.equal(index.cells.size,0);
});

test('indexed and direct oriented sweeps agree for a rotated multi-house settlement',()=>{
 const index=new CameraVolumeIndex({cellSize:3}),volumes=[];
 for(let i=0;i<70;i++){
  const x=(i%10)*13-60,z=Math.floor(i/10)*11-30;
  const volume={id:i,min:[x-4,0,z-1],max:[x+4,5,z+1],yaw:i*.317};index.set(i,volume);volumes.push(volume);
 }
 for(let i=0;i<300;i++){
  const start=[Math.sin(i)*70,i%9,Math.cos(i)*45],end=[start[0]+12,start[1]-2,start[2]-10];
  let expected=null;
  for(const volume of volumes){const hit=sweepCameraVolume(start,end,volume,.5);if(hit&&(!expected||hit.fraction<expected.fraction))expected=hit;}
  const actual=index.sweep(start,end,.5);assert.equal(actual?.id,expected?.id);
  if(actual)near(actual.fraction,expected.fraction);
 }
});

test('invalid rotation cannot replace an existing valid volume',()=>{
 const index=new CameraVolumeIndex(),volume={min:[-2,0,-2],max:[2,5,2]};index.set('house',volume);
 for(const yaw of [NaN,Infinity,-Infinity]){
  assert.throws(()=>index.set('house',{...volume,yaw}));
  assert.throws(()=>sweepCameraVolume([-10,2,0],[10,2,0],{...volume,yaw}));
 }
 assert.equal(index.sweep([-10,2,0],[10,2,0]).id,'house');
});

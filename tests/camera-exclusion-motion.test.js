import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';
import {CameraExclusionMotion} from '../src/rendering/camera-exclusion-motion.js';
const fixture=()=>{const index=new CameraVolumeIndex();index.set('house',{min:[-2,0,-2],max:[2,5,2]});return {index,motion:new CameraExclusionMotion(index)};};
test('fast pan cannot tunnel through a house and oblique pan slides beside it',()=>{
 const {index,motion}=fixture();
 let point=motion.resolve([10,2,0],[-10,2,0],1/60);assert.equal(index.sweep(point,point,.45),null);
 for(let i=0;i<100;i++)point=motion.resolve([10,2,0],point,1/60);
 assert.ok(point[0]<-2.45);assert.equal(index.sweep(point,point,.45),null);
 for(let i=0;i<100;i++)point=motion.resolve([10,2,10],point,1/60);
 assert.ok(point[0]>9.9&&point[2]>9.9);assert.equal(motion.stats.unresolved,false);
});
test('approach decelerates while retreat converges smoothly to raw intent',()=>{
 const {motion}=fixture();let p=[-5,2,0];
 const next=motion.resolve([-3,2,0],p,1/60);assert.ok(next[0]>p[0]&&next[0]<-3);
 p=next;const retreat=motion.resolve([-8,2,0],p,1/60);assert.ok(retreat[0]>-8&&retreat[0]<p[0]);
 for(let i=0;i<150;i++)p=motion.resolve([-8,2,0],p,1/60);
 assert.ok(Math.abs(p[0]+8)<.001);
});
test('finite roof allows overflight and upward recovery from a loaded volume',()=>{
 const {index,motion}=fixture();assert.deepEqual(motion.resolve([10,8,0],[-10,8,0],1/60),[10,8,0]);
 const p=motion.resolve([0,4.9,0],null,0);assert.ok(p[1]>5.45);assert.equal(index.sweep(p,p,.45),null);
});
test('opposing faces of overlapping houses cannot trap recovery in an oscillation',()=>{
 const index=new CameraVolumeIndex();index.set('left',{min:[-4,0,-2],max:[1,5,2]});index.set('right',{min:[-1,0,-2],max:[4,5,2]});
 const motion=new CameraExclusionMotion(index),point=motion.resolve([0,2,0],null,0);
 assert.equal(index.sweep(point,point,.45),null);assert.equal(motion.stats.unresolved,false);
});
test('focus reset chooses safe destination rather than sweeping through intervening buildings',()=>{
 const {motion}=fixture();assert.deepEqual(motion.resolve([10,2,0],[-10,2,0],0,{reset:true}),[10,2,0]);
});
test('rotated volumes and deletion preserve safety without trapping an idle camera',()=>{
 const {index,motion}=fixture();index.set('house',{min:[-2,0,-2],max:[2,5,2],yaw:.7});
 let p=[-10,2,0];for(let i=0;i<120;i++)p=motion.resolve([0,2,0],p,1/60);
 assert.equal(index.sweep(p,p,.45),null);index.delete('house');for(let i=0;i<120;i++)p=motion.resolve([0,2,0],p,1/60);
 assert.ok(Math.hypot(...p.map((x,i)=>x-[0,2,0][i]))<.001);
});

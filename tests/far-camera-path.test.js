import test from 'node:test';
import assert from 'node:assert/strict';
import {farCameraPath} from '../tools/experiments/far-camera-path.js';
test('approach reverses through the whole transition without changing height',()=>{
 const start=farCameraPath('approach',0),mid=farCameraPath('approach',6),end=farCameraPath('approach',12);
 assert.equal(start.z,60);assert.equal(mid.z,40);assert.ok(Math.abs(end.z-60)<1e-12);assert.equal(mid.y,10);assert.equal(end.done,true);
});
test('orbit keeps distance and completes a full turn around a rotated starting direction',()=>{
 for(let t=0;t<=12;t+=.25){const p=farCameraPath('orbit',t,{yaw:45});assert.ok(Math.abs(Math.hypot(p.x,p.z)-50)<1e-12);}
 const a=farCameraPath('orbit',0,{yaw:45}),b=farCameraPath('orbit',12,{yaw:45});assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-12);
});
test('lateral sweep visits both sides and returns to its starting pose',()=>{
 assert.equal(farCameraPath('lateral',3).x,25);assert.equal(farCameraPath('lateral',9).x,-25);assert.ok(Math.abs(farCameraPath('lateral',12).x)<1e-12);
 assert.throws(()=>farCameraPath('unknown',0));assert.throws(()=>farCameraPath('orbit',-1));
});
test('native far paths traverse the configured 100–140 band and keep rotated orbital distance',()=>{
 const options={near:100,far:140,height:27,yaw:45};
 for(const [time,distance] of [[0,140],[6,100],[12,140]]){
  const p=farCameraPath('approach',time,options);assert.ok(Math.abs(Math.hypot(p.x,p.z)-distance)<1e-10);assert.equal(p.y,27);
 }
 for(let t=0;t<=12;t+=.25){const p=farCameraPath('orbit',t,options);assert.ok(Math.abs(Math.hypot(p.x,p.z)-120)<1e-10);}
 const left=farCameraPath('lateral',3,options),right=farCameraPath('lateral',9,options);assert.ok(Math.abs(Math.hypot(left.x-right.x,left.z-right.z)-120)<1e-10);
 for(const invalid of [{near:140,far:100},{near:-1},{far:Infinity},{duration:Infinity},{height:NaN}])assert.throws(()=>farCameraPath('approach',0,invalid));
});

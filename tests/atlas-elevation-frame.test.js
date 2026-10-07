import test from 'node:test';
import assert from 'node:assert/strict';
import {Float32BufferAttribute} from 'three';
import {atlasElevationFrame} from '../tools/experiments/atlas-elevation-frame.js';
test('horizontal captures preserve the original frame and bottom pivot',()=>{
 const positions=new Float32BufferAttribute([0,0,0,1,7.5,1],3);
 assert.deepEqual(atlasElevationFrame(positions,[0,0,0],7.5,0),{elevationDegrees:0,projectedBottom:0,projectedTop:7.5*1.04,impostorHeight:7.5*1.04,baseV:0});
});
test('elevated captures cover every view while keeping the logical trunk foot at world zero',()=>{
 const base=[2,3,4],positions=new Float32BufferAttribute([2,3,4,0,3,1,5,10,8],3),angle=8*Math.PI/180;
 const frame=atlasElevationFrame(positions,base,7,8);
 assert.ok(frame.baseV>0&&frame.baseV<1);
 assert.ok(Math.abs(frame.projectedBottom+frame.baseV*frame.impostorHeight*Math.cos(angle))<1e-12);
 for(let view=0;view<8;view++)for(let i=0;i<positions.count;i++){
  const yaw=view*Math.PI/4,up=(positions.getY(i)-3)*Math.cos(angle)-((positions.getX(i)-2)*Math.sin(yaw)+(positions.getZ(i)-4)*Math.cos(yaw))*Math.sin(angle);
  assert.ok(up>frame.projectedBottom&&up<frame.projectedTop);
  const uv=(up-frame.projectedBottom)/(frame.projectedTop-frame.projectedBottom),worldY=(uv-frame.baseV)*frame.impostorHeight;
  assert.ok(Math.abs(worldY*Math.cos(angle)-up)<1e-12);
 }
});
test('invalid capture angles and dimensions are rejected',()=>{
 const positions=new Float32BufferAttribute([0,0,0],3);
 for(const angle of [-1,46,NaN])assert.throws(()=>atlasElevationFrame(positions,[0,0,0],1,angle));
 assert.throws(()=>atlasElevationFrame(positions,[0,0,0],0,8));
});
test('22-degree pilot keeps projected framing and the bottom pivot consistent',()=>{
 const positions=new Float32BufferAttribute([-4,0,-3,4,0,3,-3,10,2,4,7,-2],3),base=[.27,0,.027],angle=22*Math.PI/180;
 const frame=atlasElevationFrame(positions,base,10,22);
 assert.ok(Math.abs(frame.projectedBottom+frame.baseV*frame.impostorHeight*Math.cos(angle))<1e-12);
 for(let view=0;view<8;view++)for(let i=0;i<positions.count;i++){
  const yaw=view*Math.PI/4,up=(positions.getY(i)-base[1])*Math.cos(angle)-((positions.getX(i)-base[0])*Math.sin(yaw)+(positions.getZ(i)-base[2])*Math.cos(yaw))*Math.sin(angle);
  const uv=(up-frame.projectedBottom)/(frame.projectedTop-frame.projectedBottom);
  assert.ok(uv>0&&uv<1);
  assert.ok(Math.abs((uv-frame.baseV)*frame.impostorHeight*Math.cos(angle)-up)<1e-12);
 }
});

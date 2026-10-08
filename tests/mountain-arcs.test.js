import test from 'node:test';
import assert from 'node:assert/strict';
import {createMountainArcGeometry} from '../src/rendering/mountain-arcs.js';
const arc={angle:.4,height:110,aspect:4,baseY:-35,baseline:.18,uv:[32/2048,264/512,992/2048,504/512]};
test('one batched arc preserves radius, source aspect, foot anchor and padded atlas bounds',()=>{
 const geometry=createMountainArcGeometry(430,[arc]),p=geometry.attributes.position,u=geometry.attributes.uv,h=geometry.attributes.backdropHeight;
 for(let i=0;i<p.count;i++){
  assert.ok(Math.abs(Math.hypot(p.getX(i),p.getZ(i))-430)<.0001);
  assert.ok(u.getX(i)>=arc.uv[0]-1e-7&&u.getX(i)<=arc.uv[2]+1e-7);
  assert.ok(u.getY(i)>=arc.uv[1]-1e-7&&u.getY(i)<=arc.uv[3]+1e-7);
  assert.ok(Math.abs(p.getY(i)-(arc.baseY+110*(h.getX(i)-arc.baseline)))<.0001);
 }
 const first=p.getX(0),firstZ=p.getZ(0),last=p.getX(12),lastZ=p.getZ(12);
 assert.ok(Math.abs(Math.acos((first*last+firstZ*lastZ)/(430*430))*430/110-4)<1e-6);
 assert.equal(geometry.index.count,72);assert.equal(geometry.groups.length,0);geometry.dispose();
});
test('several distinct decorative sectors share a renderable without mirroring source UVs',()=>{
 const geometry=createMountainArcGeometry(430,[arc,{...arc,angle:2.9,uv:[.515625,.515625,.984375,.984375]}]);
 assert.equal(geometry.index.count,144);assert.equal(geometry.groups.length,0);
 assert.equal(geometry.attributes.backdropHeight.count,geometry.attributes.position.count);
 assert.ok(Number.isFinite(geometry.boundingSphere.radius));geometry.dispose();
});
test('invalid layout cannot allocate a partial batch',()=>{
 for(const change of [{baseline:2},{height:0},{aspect:20},{uv:[0,0,1,2]}])assert.throws(()=>createMountainArcGeometry(430,[arc,{...arc,...change}]),/Invalid mountain arc/);
 assert.throws(()=>createMountainArcGeometry(430,Array(17).fill(arc)),/Invalid mountain arc layout/);
});

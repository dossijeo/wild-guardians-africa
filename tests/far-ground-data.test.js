import test from 'node:test';import assert from 'node:assert/strict';
import {farGroundData,farGroundHeight} from '../tools/experiments/far-ground-data.js';
import {TerrainField} from '../src/world/terrain.js';
test('far ground samples native surface once per indexed vertex and preserves triangle orientation and anchors',()=>{
 let samples=0;const field={surface(x,z){samples++;return 3+x*.1-z*.2;}},bounds={minX:-16,maxX:16,minZ:-12,maxZ:12},data=farGroundData(field,bounds);
 assert.equal(samples,(data.nx+1)*(data.nz+1));assert.equal(data.indices.length,data.nx*data.nz*6);
 for(const [x,z] of [[-16,-12],[16,12],[0,0],[-3.1,7.8],[15.99,11.99]])assert.ok(Math.abs(farGroundHeight(data,x,z)-(3+x*.1-z*.2))<1e-6);
 assert.equal(farGroundHeight(data,17,0),null);
 const [a,d,b]=data.indices,point=i=>[data.positions[i*3],data.positions[i*3+2]],aa=point(a),dd=point(d),bb=point(b);assert.ok((dd[1]-aa[1])*(bb[0]-aa[0])>0);
 assert.throws(()=>farGroundData(field,bounds,{step:0}),/Invalid/);assert.throws(()=>farGroundData(field,bounds,{step:.001}),/budget/);
});
test('height proxy retains deterministic real terrain relief and uses far fewer triangles than metre grid',()=>{
 const config={seed:'712',biome:'savanna',relief:1,river:true},bounds={minX:-180,maxX:180,minZ:-230,maxZ:48};
 const data=farGroundData(new TerrainField(config),bounds),repeat=farGroundData(new TerrainField(config),bounds);assert.deepEqual(data,repeat);
 assert.ok(data.indices.length/3<360*278*2/10);
 let lo=Infinity,hi=-Infinity;for(let i=1;i<data.positions.length;i+=3){lo=Math.min(lo,data.positions[i]);hi=Math.max(hi,data.positions[i]);}assert.ok(hi-lo>5);
});

test('proxy samples source colours per vertex and washes detail without shifting terrain',()=>{
 const calls=[],bounds={minX:0,maxX:8,minZ:0,maxZ:4};
 const data=farGroundData({surface:(x,z)=>x+z},bounds,{colorAt:(x,z)=>{calls.push([x,z]);return [.2,.4,.8];},wash:.25});
 assert.equal(calls.length,data.positions.length/3);
 for(let i=0;i<data.colors.length;i+=3)for(let c=0;c<3;c++)assert.ok(Math.abs(data.colors[i+c]-([.2,.4,.8][c]*.75+.65*.25))<1e-6);
 assert.equal(farGroundHeight(data,3,2),5);
});

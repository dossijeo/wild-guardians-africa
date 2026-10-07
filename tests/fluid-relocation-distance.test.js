import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveFluidPlacement,footprintFluidSample} from '../src/world/fluid-placement.js';
import {centerFootprint} from '../src/world/centers.js';
import {CENTER_GEOMETRIES} from '../src/world/center-geometries.js';

for(const culture of Object.keys(CENTER_GEOMETRIES))test(`${culture}: centre relocation radius uses authored hull axes at every rotation`,()=>{
 const hull=CENTER_GEOMETRIES[culture].hull;
 const length=Math.max(Math.max(...hull.map(p=>p[0]))-Math.min(...hull.map(p=>p[0])),Math.max(...hull.map(p=>p[1]))-Math.min(...hull.map(p=>p[1])));
 for(const yaw of [0,Math.PI/4,Math.PI/2,2.3,-.67]){
  const nav={placementFootprint:()=>({valid:false,fluid:true})};
  const result=resolveFluidPlacement(nav,(x,z)=>[centerFootprint({kind:'center',culture,x,z,yaw})],123,-87);
  assert.equal(result.valid,false);assert.ok(Math.abs(result.shiftLimit-length*.2)<1e-12);
 }
});

function square(x,z){const yaw=Math.PI/4,c=Math.cos(yaw),s=Math.sin(yaw);return {kind:'center',x,z,yaw,footprint:[[-2,-2],[2,-2],[2,2],[-2,2]].map(([px,pz])=>({x:x+px*c+pz*s,z:z-px*s+pz*c}))};}
function shore(overlap){const field={waterInfo:x=>({inside:x>Math.SQRT2*2-overlap})};return {placementFootprint:shape=>footprintFluidSample(field,shape.footprint)?{valid:false,fluid:true}:{valid:true}};}
test('rotation cannot enlarge the allowed relocation to escape excessive shore overlap',()=>{
 const result=resolveFluidPlacement(shore(.95),(x,z)=>[square(x,z)],0,0);
 assert.equal(result.valid,false);assert.ok(Math.abs(result.shiftLimit-.8)<1e-12);
 assert.equal(result.x,0);assert.equal(result.z,0);
});
test('a slightly overlapping rotated hull still moves onto dry ground inside the authored limit',()=>{
 const nav=shore(.1),result=resolveFluidPlacement(nav,(x,z)=>[square(x,z)],0,0);
 assert.equal(result.valid,true);assert.equal(result.shifted,true);assert.ok(result.shiftDistance<=.8+1e-12);
 assert.equal(nav.placementFootprint(result.shapes[0]).valid,true);
});

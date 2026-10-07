import test from 'node:test';
import assert from 'node:assert/strict';
import {wallCollisionFrame,wallCollisionPolygon} from '../src/world/wall-collision-frame.js';
import {Navigation} from '../src/world/navigation.js';
import {sweptFootprintDistance} from '../src/world/footprints.js';

function original(wall,radius){
 const scale=wall.gate?(wall.material==='reforzado'?1.6:['adobe','piedra'].includes(wall.material)?1.4:1):1;
 const width=1.09*(wall.baseScaleX??1)*scale+radius,depth=.22*scale+radius,c=Math.cos(wall.yaw??0),s=Math.sin(wall.yaw??0);
 return [[-width,-depth],[width,-depth],[width,depth],[-width,depth]].map(([x,z])=>({x:wall.x+x*c+z*s,z:wall.z-x*s+z*c}));
}
test('cached wall polygons exactly retain original corners and swept collision decisions',()=>{
 const nav=new Navigation(712,'sabana');nav.terrainValid=()=>true;nav.propsAt=()=>[];
 for(let i=0;i<2000;i++){
  const wall={kind:'wall',x:i%17-8,z:i%13-6,yaw:i*.037,baseScaleX:.3+i%9*.2,gate:i%2===0,material:['madera','adobe','piedra','reforzado'][i%4]},radius=[0,.28,.3,.6,1.2][i%5];
  const polygon=wallCollisionPolygon(wall,radius);assert.deepEqual(polygon,original(wall,radius));assert.equal(wallCollisionPolygon(wall,radius),polygon);
  nav.obstacles=[wall];
  const start={x:i%23-11,z:i%19-9},end={x:i%29-14,z:i%31-15};
  assert.equal(nav.testSegmentClear(start,end,radius,null,false),sweptFootprintDistance(start,end,original(wall,radius))>=1e-9);
  const frame=wallCollisionFrame(wall),dx=start.x-wall.x,dz=start.z-wall.z;
  assert.equal(nav.testWalkable(start.x,start.z,radius,null,false),!(Math.abs(dx*frame.c-dz*frame.s)<frame.width+radius&&Math.abs(dx*frame.s+dz*frame.c)<frame.depth+radius));
 }
});
test('editing every geometry input invalidates cached wall geometry; gate pose does not change rigid animal envelope',()=>{
 const wall={x:2,z:-4,yaw:undefined,baseScaleX:undefined,material:'madera',gate:false};
 for(const change of [{x:3},{z:5},{yaw:1.2},{baseScaleX:1.8},{gate:true},{material:'reforzado'},{material:'adobe'},{gate:false}]){
  const before=wallCollisionPolygon(wall,.28);Object.assign(wall,change);
  const after=wallCollisionPolygon(wall,.28);assert.notEqual(after,before);assert.deepEqual(after,original(wall,.28));
 }
 const before=wallCollisionPolygon(wall,.28);wall.gateOpen=.5;assert.equal(wallCollisionPolygon(wall,.28),before);
});
test('arbitrary radii cannot accumulate an unbounded per-wall polygon cache',()=>{
 const wall={x:0,z:0};for(let i=0;i<100;i++)assert.deepEqual(wallCollisionPolygon(wall,i*.01),original(wall,i*.01));
 assert.ok(wallCollisionFrame(wall).polygons.size<=8);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {installProofWallBroadphase} from '../tools/proof-wall-broadphase-candidate.mjs';
function fixture(){
 const nav=new Navigation(712,'sabana',{});nav.terrainValid=()=>true;nav.propsAt=()=>[];
 nav.obstacles=[{id:'a',kind:'wall',x:0,z:0,yaw:Math.PI/4,material:'adobe',baseScaleX:1.3},{id:'b',kind:'wall',x:4,z:-2,yaw:.2,material:'piedra'},
 {id:'g',kind:'wall',gate:true,x:-4,z:2,yaw:.5,material:'adobe'},{id:'house',x:6,z:5,radius:2,kind:'house'}];
 nav.obstacleBounds=new WeakMap();return nav;
}
test('conservative proof bounds retain exact native point and segment results, including larger radii and gates',()=>{
 const a=fixture(),b=fixture();installProofWallBroadphase(b,1.5);let compared=0;
 for(const radius of [.01,.28,.7,1.5,2.6])for(const worker of [false,true])for(let x=-8;x<=8;x+=1.9)for(let z=-8;z<=8;z+=2.1){
  const start={x,z},end={x:-x*.8,z:4-z*.6};
  assert.equal(b.testWalkable(x,z,radius,null,worker),a.testWalkable(x,z,radius,null,worker));
  assert.equal(b.coarseSegmentClear(start,end,radius,null,worker),a.coarseSegmentClear(start,end,radius,null,worker));compared+=2;
 }
 assert(compared>1000);
});
test('moving, rotating, scaling and converting a wall to a gate retain native answers',()=>{
 const a=fixture(),b=fixture();installProofWallBroadphase(b,1.5);
 for(const mutate of [w=>{w.x=8;},w=>{w.yaw=1.7;},w=>{w.baseScaleX=2;},w=>{w.material='reforzado';},w=>{w.gate=true;}]){
  for(const nav of [a,b])mutate(nav.obstacles[0]);
  for(let x=-6;x<=12;x+=.7){const start={x,z:0},end={x,z:6};
   for(const worker of [false,true])assert.equal(b.coarseSegmentClear(start,end,.7,null,worker),a.coarseSegmentClear(start,end,.7,null,worker));
  }
 }
});

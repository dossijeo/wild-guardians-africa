import test from 'node:test';
import assert from 'node:assert/strict';
import {containsPoint,footprintDistance,footprintsOverlap} from '../src/world/footprints.js';
import {Navigation} from '../src/world/navigation.js';
import {findInitialLocation,findInitialLocationAsync,findVillageEntry} from '../src/world/villages.js';
const rect=(x,z,w,h)=>[{x,z},{x:x+w,z},{x:x+w,z:z+h},{x,z:z+h}];
test('Native footprint preserves walkable space outside its building edges',()=>{
  const shape=rect(-3,-1,6,2);
  assert.equal(containsPoint(shape,0,0),true);
  assert.equal(footprintDistance(shape,0,2),1);
  assert.equal(footprintDistance(shape,3,0),0);
  assert.equal(footprintDistance(shape,0,0),0);
});
test('Building overlap includes crossing edges and containment',()=>{
  const horizontal=rect(-4,-1,8,2),vertical=rect(-1,-4,2,8);
  assert.equal(footprintsOverlap(horizontal,vertical),true);
  assert.equal(footprintsOverlap(horizontal,rect(-.1,-.1,.2,.2)),true);
  assert.equal(footprintsOverlap(horizontal,rect(7,7,1,1)),false);
});
function navStub(){
  const nav=Object.create(Navigation.prototype);nav.obstacles=[];nav.propsAt=()=>[];
  nav.terrainValid=()=>true;return nav;
}
test('Full occupied interior is checked for water, not just building bounds',()=>{
  const nav=navStub(),building={x:0,z:0,radius:3,footprint:rect(-2,-2,4,4)};
  nav.terrainValid=(x,z)=>!(x===0&&z===0);
  assert.equal(nav.placementFootprint(building).valid,false);
});
test('Large props beside the native footprint survive; occupied props block placement',()=>{
  const nav=navStub(),building={x:0,z:0,radius:5,footprint:rect(-4,-1,8,2)};
  nav.propsAt=()=>[{id:'tree',slot:0,x:0,z:3,radius:1},{id:'grass',slot:7,x:0,z:0,radius:.2}];
  assert.deepEqual(nav.placementFootprint(building),{valid:true,suppress:['grass']});
  nav.propsAt=()=>[{id:'tree',slot:0,x:0,z:1.5,radius:1}];
  assert.equal(nav.placementFootprint(building).valid,false);
});
test('Asynchronous initial search preserves deterministic positions and suppression',async()=>{
  const makeNav=()=>({obstacles:[],walkCache:new Map(),placementFootprint:()=>({valid:true,suppress:['grass']}),placement:()=>({valid:true}),walkable:()=>true,path:()=>[{}]});
  const payload={units:[{key:'house',kind:'Edificio',min:[0,0,0],max:[.1,.1,.1],hull:[[0,0],[.1,0],[.1,.1],[0,.1]]}]};
  assert.deepEqual(await findInitialLocationAsync(makeNav(),payload),findInitialLocation(makeNav(),payload));
});
test('Departure search restores existing obstacles even if route evaluation fails',()=>{
  const original=[{id:'wall'}],nav={obstacles:original,walkCache:new Map(),walkable:()=>true,path:()=>{throw Error('route failed');}};
  assert.throws(()=>findVillageEntry(nav,[],0,0,{x:10,z:0}),/route failed/);
  assert.equal(nav.obstacles,original);
});

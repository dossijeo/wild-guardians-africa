import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {repairRoute} from '../src/world/work-points.js';
function flat(props=[],obstacles=[]){
  const nav=Object.create(Navigation.prototype);nav.field={blocked:()=>false,slope:()=>0};
  nav.obstacles=obstacles;nav.walkCache=new Map();nav.propsAt=()=>props;return nav;
}
function checkRoute(nav,start,end,radius=.1){
  const path=nav.path(start,end,radius,null,true);assert.ok(path);let previous=start;
  for(const point of path){assert.ok(nav.segmentClear(previous,point,radius,null,true));previous=point;}
  assert.deepEqual(path.at(-1),end);return path;
}
test('A direct segment cannot tunnel through a small prop between valid sampled endpoints',()=>{
  const nav=flat([{slot:0,x:1.5,z:0,radius:.01}]),start={x:0,z:0},end={x:3,z:0};
  assert.ok(nav.walkable(start.x,start.z,.1,null,true));assert.ok(nav.walkable(end.x,end.z,.1,null,true));
  assert.equal(nav.segmentClear(start,end,.1,null,true),false);assert.ok(checkRoute(nav,start,end).length>1);
});
test('A diagonal grid edge with valid corners still detours around an intervening prop',()=>{
  const nav=flat([{slot:0,x:.5,z:.5,radius:.1}]);
  for(const [x,z] of [[0,0],[1,1],[0,1],[1,0]])assert.ok(nav.walkable(x,z,.1,null,true));
  assert.equal(nav.segmentClear({x:0,z:0},{x:1,z:1},.1,null,true),false);
  checkRoute(nav,{x:0,z:0},{x:3,z:3});
});
test('Fractional positions connect to a valid grid point even when their rounded start cell is blocked',()=>{
  const nav=flat([{slot:0,x:0,z:0,radius:.3},{slot:0,x:1.5,z:1.5,radius:.2}]);
  const start={x:.49,z:.49};assert.ok(nav.walkable(start.x,start.z,.1,null,true));assert.equal(nav.walkable(0,0,.1,null,true),false);
  const path=checkRoute(nav,start,{x:3,z:3});assert.notDeepEqual(path[0],{x:0,z:0});
});
test('Swept paths respect native polygon edges, rotated walls and worker-only gate passage',()=>{
  const polygon=[{x:-.2,z:-.2},{x:.2,z:-.2},{x:.2,z:.2},{x:-.2,z:.2}];
  const house=flat([],[{id:'house',kind:'house',footprint:polygon}]);
  assert.equal(house.segmentClear({x:-1,z:0},{x:1,z:0},.1,null,true),false);
  const nav=flat([],[{id:'gate',kind:'wall',gate:true,material:'reforzado',yaw:Math.PI/2,x:0,z:0}]);
  assert.equal(nav.segmentClear({x:-2,z:0},{x:2,z:0},.28,null,true),true);
  assert.equal(nav.segmentClear({x:-2,z:0},{x:2,z:0},.28,null,false),false);
});
test('Every repair waypoint remains outside rotated native wall footprints and wider gates',()=>{
  for(const yaw of [0,Math.PI/4,Math.PI/2])for(const [material,gate] of [['adobe',false],['adobe',true],['reforzado',true],['piedra',true]]){
    const target={id:'wall',kind:'wall',material,gate,yaw,x:0,z:0};
    // Use animal obstacle semantics here so the gate frame also remains solid.
    const nav=flat([],[target]),physical={path:(a,b,radius,ignore)=>{assert.equal(ignore,null);return nav.path(a,b,radius,null,false);}};
    const worker={x:5,z:5},route=repairRoute(worker,target,physical);assert.ok(route);
    assert.ok(nav.walkable(route.destination.x,route.destination.z,.28,null,false));let previous=worker;
    for(const point of route.path){assert.ok(nav.segmentClear(previous,point,.28,null,false));previous=point;}
  }
});
test('Center repair paths go around the center footprint and reject a completely inaccessible destination',()=>{
  const target={id:'center',kind:'center',radius:2.6,x:0,z:0},nav=flat([],[target]);
  const route=repairRoute({x:-5,z:0},target,nav);assert.ok(route);
  assert.ok(Math.hypot(route.destination.x,route.destination.z)>=3.2-1e-9);
  assert.equal(repairRoute({x:-5,z:0},target,{path:()=>null}),null);
});

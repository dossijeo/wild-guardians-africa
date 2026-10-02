import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {repairRoute} from '../src/world/work-points.js';
function flat(props=[],obstacles=[]){
  const nav=Object.create(Navigation.prototype);nav.field={blocked:()=>false,slope:()=>0};
  nav.obstacles=obstacles;nav.walkCache=new Map();nav.segmentCache=new Map();nav.failedPaths=new Set();nav.closedRegions=new Map();nav.searchedRegions=[];nav.propsAt=()=>props;return nav;
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
test('Directed edge caches retain collision semantics and invalidate when structures or shields change',()=>{
  const nav=flat(),state={structures:[],villages:[],spells:[],suppressed:[]};
  const a={x:-3,z:0},b={x:3,z:0};nav.setState(state);
  assert.equal(nav.segmentClear(a,b,.28,null,false),true);assert.equal(nav.segmentCache.size,1);
  assert.equal(nav.segmentClear(a,b,.28,null,false),true);assert.equal(nav.segmentCache.size,1);
  state.spells=[{id:'shield',kind:'shield',x:0,z:0,radius:1,remaining:20}];nav.setState(state);
  assert.equal(nav.segmentCache.size,0);assert.equal(nav.segmentClear(a,b,.28,null,false),false);
  assert.equal(nav.segmentClear(a,b,.28,null,true),true);assert.equal(nav.segmentClear(a,b,.28,'shield',false),true);
  state.spells=[];nav.setState(state);assert.equal(nav.segmentClear(a,b,.28,null,false),true);
  nav.segmentClear({x:-3.1,z:0},b,.28,null,false);assert.equal(nav.segmentCache.size,1);
});
test('Failed routes are reused only for identical endpoints and clear when an obstacle changes',()=>{
  const nav=flat(),state={structures:[],villages:[],spells:[{id:'shield',kind:'shield',x:3,z:0,radius:1,remaining:20}],suppressed:[]};
  nav.setState(state);const a={x:0,z:0},b={x:3,z:0};let searches=0;
  const find=nav.findPath.bind(nav);nav.findPath=(...args)=>{searches++;return find(...args);};
  assert.equal(nav.path(a,b,.28,null,false),null);assert.equal(nav.path(a,b,.28,null,false),null);assert.equal(searches,1);
  assert.ok(nav.path(a,b,.28,null,true));assert.equal(searches,2);
  state.spells=[];nav.setState(state);assert.equal(nav.failedPaths.size,0);
  assert.ok(nav.path(a,b,.28,null,false));assert.equal(searches,3);
});
test('Exhaustively explored enclosed regions reject other unreachable targets without another flood search',()=>{
  const box=(x0,z0,x1,z1)=>[{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}];
  const walls=[box(-3,-3,-2.5,3),box(2.5,-3,3,3),box(-3,-3,3,-2.5),box(-3,2.5,3,3)];
  const nav=flat(),state={structures:[],villages:[{buildings:walls.map((footprint,i)=>({key:`wall-${i}`,kind:'house',footprint}))}],spells:[],suppressed:[]};
  nav.setState(state);const start={x:0,z:0};
  assert.equal(nav.path(start,{x:20,z:0},.28,null,false),null);assert.ok(nav.closedRegions.size>0);
  const cachedSize=nav.segmentCache.size;
  assert.equal(nav.path({x:.1,z:.1},{x:21,z:2},.28,null,false),null);
  assert.ok(nav.segmentCache.size<=cachedSize+9,'Known closed region avoids exploring grid edges again');
  assert.ok(nav.path(start,{x:1,z:1},.28,null,false),'Destinations inside the region remain reachable');
  state.villages=[];nav.setState(state);assert.equal(nav.closedRegions.size,0);
  assert.ok(nav.path(start,{x:21,z:2},.28,null,false),'Removing the enclosure permits departure');
});
test('A search touching corridor bounds does not certify a globally closed region',()=>{
  const nav=flat([],[{id:'barrier',kind:'house',footprint:[{x:4,z:-100},{x:5,z:-100},{x:5,z:100},{x:4,z:100}]}]);
  assert.equal(nav.path({x:0,z:0},{x:10,z:0},.28,null,false),null);
  assert.equal(nav.closedRegions.size,0);
  assert.equal(nav.searchedRegions.length,1);
  let expanded=0;const original=nav.testSegmentClear.bind(nav);nav.testSegmentClear=(...args)=>{expanded++;return original(...args);};
  assert.equal(nav.path({x:0,z:0},{x:9,z:0},.28,null,false),null);
  assert.ok(expanded<12,'Contained failed corridor reuses exhaustive reachability');
  assert.ok(nav.path({x:0,z:0},{x:-5,z:0},.28,null,false),'Reachable same-side destinations remain valid');
});
test('Region reuse matches fresh searches across origins, endpoints, radii and actor permissions',()=>{
  const obstacles=[{id:'barrier',kind:'house',footprint:[{x:4,z:-100},{x:5,z:-100},{x:5,z:100},{x:4,z:100}]}];
  const cached=flat([],obstacles),fresh=flat([],obstacles);
  for(const radius of [.28,.45,.8])for(const worker of [true,false])for(const start of [{x:0,z:0},{x:.3,z:.2},{x:1,z:1}])for(const end of [{x:10,z:0},{x:9,z:0},{x:-2,z:1},{x:3,z:3}]){
    fresh.closedRegions.clear();fresh.searchedRegions=[];fresh.failedPaths.clear();
    assert.deepEqual(cached.path(start,end,radius,null,worker),fresh.path(start,end,radius,null,worker),JSON.stringify({radius,worker,start,end}));
  }
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

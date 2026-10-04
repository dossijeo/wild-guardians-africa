import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';

function flat(){
  const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0};nav.propsAt=()=>[];
  nav.setState({structures:[],villages:[],spells:[],suppressed:[]});return nav;
}
const empty={nodes:new Map(),links:new Map()};

test('Repeated overlapping A* searches preserve waypoint order while reusing cell geometry',()=>{
  const cached=flat(),reference=flat();
  const wall={id:'barrier',kind:'house',x:0,z:0,footprint:[{x:2,z:-4},{x:3,z:-4},{x:3,z:4},{x:2,z:4}]};
  for(const nav of [cached,reference])nav.obstacles=[wall];reference.searchNeighborCache=undefined;
  let checks=0;const walk=cached.walkable.bind(cached);cached.walkable=(...args)=>{checks++;return walk(...args);};
  for(const radius of [.1,.28,.9])for(const worker of [true,false])for(const start of [{x:0,z:0},{x:.25,z:1},{x:-1,z:-1}]){
    const end={x:7.25,z:0};assert.deepEqual(cached.path(start,end,radius,null,worker),reference.path(start,end,radius,null,worker));
  }
  const before=checks;cached.path({x:0,z:0},{x:7.25,z:0},.28,null,true);const cachedChecks=checks-before;
  cached.searchNeighborCache.clear();const freshBefore=checks;cached.path({x:0,z:0},{x:7.25,z:0},.28,null,true);
  assert.ok(cachedChecks<checks-freshBefore,'A second route performs fewer geometry lookups');
});

test('Geometry epochs, actor permissions and proposed buildings cannot contaminate neighbor results',()=>{
  const nav=flat(),state=nav.state;nav.findPath({x:0,z:0},{x:5,z:0});
  const a=nav.searchNeighbors({x:0,z:0},.28,null,true,empty);
  assert.equal(nav.searchNeighbors({x:0,z:0},.28,null,true,empty),a);
  assert.notEqual(nav.searchNeighbors({x:0,z:0},.9,null,true,empty),a);
  assert.notEqual(nav.searchNeighbors({x:0,z:0},.28,'center',true,empty),a);
  assert.notEqual(nav.searchNeighbors({x:0,z:0},.28,null,false,empty),a);
  const count=nav.searchNeighborCache.size,preview=nav.forBuildingPlacement({id:'preview',x:2,z:0,radius:1,kind:'house'});
  assert.notEqual(preview.searchNeighborCache,nav.searchNeighborCache);preview.findPath({x:0,z:0},{x:5,z:0});assert.equal(nav.searchNeighborCache.size,count);
  const previous=nav.searchNeighborCache;state.spells=[{id:'shield',kind:'shield',x:2,z:0,radius:1,remaining:20}];nav.setState(state);
  assert.notEqual(nav.searchNeighborCache,previous);assert.equal(nav.searchNeighborCache.size,0);
  assert.equal(nav.walkable(2,0,.28,null,false),false);assert.equal(nav.walkable(2,0,.28,null,true),true);
});

test('Transient neighbor graph stays bounded and route arrays cannot mutate its cached points',()=>{
  const nav=flat();for(let i=0;i<4200;i++)nav.searchNeighbors({x:i,z:0},.28,null,true,empty);
  assert.equal(nav.searchNeighborCache.size,4096);
  const route=nav.path({x:0,z:0},{x:4,z:0});route[0].x=100;
  assert.deepEqual(nav.path({x:0,z:0},{x:4,z:0}),[{x:4,z:0}]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {segmentNavigationObstacles} from '../src/world/navigation-obstacle-index.js';

function fixture(){
 const structures=Array.from({length:90},(_,i)=>({
  id:`wall-${i}`,kind:'wall',status:'intact',material:'zarzas',gate:i%23===0,
  x:(i%15-7)*3,z:(Math.floor(i/15)-3)*3,yaw:(i%7)*Math.PI/11,hp:10,maxHp:10,
 }));
 const nav=new Navigation(712,'sabana',{});
 nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];
 nav.setState({structures,villages:[],spells:[],suppressed:[]});
 return nav;
}

test('indexed obstacle broad phase preserves native segment results across walls and gates',()=>{
 const nav=fixture(),index=nav.obstacleIndex;
 let seed=8125;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 for(let i=0;i<240;i++){
  const start={x:(random()-.5)*65,z:(random()-.5)*35};
  const end={x:i%19===0?start.x+300:start.x+(random()-.5)*14,z:i%19===0?start.z+300:start.z+(random()-.5)*14};
  const radius=i%3===0?.7:.28,worker=i%2===0;
  const indexed=nav.coarseSegmentClear(start,end,radius,null,worker);
  nav.obstacleIndex=null;
  const full=nav.coarseSegmentClear(start,end,radius,null,worker);
  nav.obstacleIndex=index;
  assert.equal(indexed,full,`segment ${i}`);
 }
});

test('index retains native obstacle order and proposed geometry falls back to the full list',()=>{
 const nav=fixture(),start={x:-15,z:0},end={x:15,z:0};
 const candidates=segmentNavigationObstacles(nav,start,end,.28);
 const order=candidates.map(o=>nav.obstacles.indexOf(o));
 assert.deepEqual(order,[...order].sort((a,b)=>a-b));
 const proposed=nav.forBuildingPlacement({id:'proposed',kind:'house',x:0,z:0,radius:2});
 assert.equal(segmentNavigationObstacles(proposed,start,end,.28),proposed.obstacles);
});

test('indexed point walkability matches the full obstacle scan for walls and gates',()=>{
 const nav=fixture(),index=nav.obstacleIndex;
 let seed=91027;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 for(let i=0;i<1000;i++){
  const x=(random()-.5)*90,z=(random()-.5)*60,radius=[.28,.7,1.2][i%3],worker=i%2===0;
  const indexed=nav.testWalkable(x,z,radius,null,worker);
  nav.obstacleIndex=null;
  const full=nav.testWalkable(x,z,radius,null,worker);
  nav.obstacleIndex=index;
  assert.equal(indexed,full,`point ${i}`);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {workerWallOverlapRecoveryPath} from '../src/world/worker-wall-overlap-recovery.js';
import {walkTo} from '../src/simulation/game.js';
function world(){const nav=new Navigation(712,'sabana',{});nav.field={slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.version=1;nav.obstacles=[{id:'wall',kind:'wall',x:0,z:0,yaw:0,baseScaleX:1}];return nav;}
const actor=()=>({id:'worker',x:0,z:.1,status:'fleeing',radius:.28}),end={id:'home',x:0,z:3};
test('an existing wall overlap exits through the nearest face without changing the actor',()=>{
 const nav=world(),a=actor(),before=structuredClone(a);
 assert.equal(nav.workerPath(a,end,.28,null),null);
 const path=workerWallOverlapRecoveryPath(nav,a,end);assert(path);assert.deepEqual(a,before);
 assert.equal(path[0].x,0);assert(path[0].z>.5&&path[0].z<.501);
 assert.equal(nav.walkable(path[0].x,path[0].z,.28,null,true),true);
 let previous=path[0];for(const point of path.slice(1)){assert(nav.workerMotionClear(previous,point,.28));previous=point;}
});
test('ordinary tasks and valid origins do not receive a wall collision exception',()=>{
 for(const status of ['idle','walking','acting','carrying','arriving'])assert.equal(workerWallOverlapRecoveryPath(world(),{...actor(),status},end),null);
 assert.equal(workerWallOverlapRecoveryPath(world(),{...actor(),z:.8},end),null);
});
for(const kind of ['water','lava','steep','solid','prop','second-wall','gate'])test(`recovery preserves ${kind} blocking`,()=>{
 const nav=world();
 if(kind==='water'||kind==='lava')nav.field.fluidInside=()=>true;
 if(kind==='steep')nav.field.slope=()=>.7;
 if(kind==='solid')nav.obstacles.push({id:'house',kind:'house',x:0,z:.65,radius:.5});
 if(kind==='prop')nav.propsAt=()=>[{id:'tree',x:0,z:.65,radius:.5,slot:0}];
 if(kind==='second-wall')nav.obstacles.push({id:'other',kind:'wall',x:0,z:.15,yaw:0,baseScaleX:1});
 if(kind==='gate')nav.obstacles[0].gate=true;
 assert.equal(workerWallOverlapRecoveryPath(nav,actor(),end),null);
});
test('rotated wall uses its nearest world-space face',()=>{
 const nav=world();nav.obstacles[0].yaw=Math.PI/2;
 const path=workerWallOverlapRecoveryPath(nav,{...actor(),x:.1,z:0},{id:'home',x:3,z:0});assert(path);
 assert(path[0].x>.5&&path[0].x<.501);assert(Math.abs(path[0].z)<1e-8);
});
test('native movement leaves continuously and resumes from a serialized mid-prefix pose',()=>{
 let nav=world(),a=actor();let state={structures:[],workers:[a]};
 let reached=false;
 for(let tick=0;tick<100&&!reached;tick++){
  const before={x:a.x,z:a.z};
  reached=walkTo(state,a,end,.05,nav,{speed:2});
  assert(Math.hypot(a.x-before.x,a.z-before.z)<=.1000001);
  assert(a.z>=before.z-1e-8,'Only outward movement in this straight fixture');
  if(tick===1){a=JSON.parse(JSON.stringify(a));nav=world();nav.version=2;state={structures:[],workers:[a]};}
 }
 assert(reached);assert.equal(a.x,end.x);assert.equal(a.z,end.z);
});
test('a retreating animal blocks the outward prefix until it leaves',()=>{
 const nav=world(),a=actor(),blocker={id:'animal',status:'retreating',hitsRemaining:0,x:0,z:.85,radius:.28};
 const state={structures:[],workers:[a],raid:{animals:[blocker]}};
 for(let tick=0;tick<5;tick++){walkTo(state,a,end,.05,nav,{speed:2});assert(Math.hypot(a.x-blocker.x,a.z-blocker.z)>=.56-1e-8,'Native movement may approach, but cannot overlap the animal');assert(a.z<.5,'Occupied exit remains blocked');}
 blocker.status='gone';let reached=false;
 for(let tick=0;tick<100&&!reached;tick++)reached=walkTo(state,a,end,.05,nav,{speed:2});
 assert(reached);
});
test('changed navigation revalidates recovery against a new solid obstruction',()=>{
 const nav=world(),a=actor(),state={structures:[],workers:[a]};
 walkTo(state,a,end,.05,nav,{speed:2});
 const before={x:a.x,z:a.z};
 nav.obstacles.push({id:'new-house',kind:'house',x:0,z:.65,radius:.5});nav.version++;
 nav.walkCache.clear();nav.segmentCache.clear();nav.workerRouteCache.clear();
 walkTo(state,a,end,.05,nav,{speed:2});
 assert.deepEqual({x:a.x,z:a.z},before);
});

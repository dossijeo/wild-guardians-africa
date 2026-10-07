import test from 'node:test';
import assert from 'node:assert/strict';
import {animalRouteClearance} from '../src/simulation/animal-route-clearance.js';
import {Navigation} from '../src/world/navigation.js';
import {walkTo} from '../src/simulation/game.js';

test('static clearance is reused along the same segment and rechecked after a bend, edit, displacement or epoch',()=>{
 const actor={x:0,z:0,path:[{x:100,z:0}]};let checks=0;
 const nav={version:1,segmentClear:()=>{checks++;return true;}};
 const step=()=>{const end={x:actor.x+.1,z:actor.z};assert.ok(animalRouteClearance(actor,nav,{radius:.5},null).clear(actor,end));Object.assign(actor,end);};
 for(let i=0;i<100;i++)step();assert.equal(checks,3,'Reuse four-metre prefixes instead of 100 per-frame static queries');
 actor.path[0].x++;step();assert.equal(checks,4);
 actor.x+=1;step();assert.equal(checks,5);
 nav.version++;step();assert.equal(checks,6);
 actor.path=[{x:100,z:0}];step();assert.equal(checks,7);
 const end={x:actor.x+.1,z:actor.z};
 assert.ok(animalRouteClearance(actor,nav,{radius:.9},null).clear(actor,end));assert.equal(checks,8);
});

test('a restored connector approaches its safe prefix, stops before a tree and replans a native clear route',()=>{
 const nav=new Navigation(712,'sabana',{});
 nav.field={waterInfo:()=>({inside:false}),blocked:()=>false,slope:()=>0};
 nav.propsAt=()=>[{slot:0,x:0,z:0,radius:1}];nav.obstacles=[];nav.version=1;
 const actor={id:'beast',x:-3,z:0,radius:.5,status:'walking',path:[{x:3,z:0}],pathVersion:1,destinationId:'crop'};
 const state={workers:[],raid:{animals:[actor]}},target={id:'crop',x:3,z:0};
 let stopped=false;
 for(let i=0;i<20&&!stopped;i++){
  const before={x:actor.x,z:actor.z};walkTo(state,actor,target,.1,nav,{speed:1.5,worker:false});
  assert.ok(nav.segmentClear(before,actor,.5,null,false));stopped=actor.path===null;
 }
 assert.ok(stopped);assert.ok(actor.x<=-1.5+1e-9);assert.equal(actor.z,0);
 let arrived=false;
 for(let i=0;i<100&&!arrived;i++){
  const before={x:actor.x,z:actor.z};arrived=walkTo(state,actor,target,.1,nav,{speed:1.5,worker:false});
  assert.ok(nav.segmentClear(before,actor,.5,null,false));
 }
 assert.ok(arrived);assert.equal(actor.x,3);assert.equal(actor.z,0);
});

test('dynamic body clearance is never cached by the static segment guard',()=>{
 const actor={x:0,z:0,path:[{x:2,z:0}]},nav={version:1,segmentClear:()=>true};
 let free=true;
 assert.ok(animalRouteClearance(actor,nav,{radius:.5},()=>free).clear(actor,{x:1,z:0}));
 actor.x=1;free=false;
 assert.equal(animalRouteClearance(actor,nav,{radius:.5},()=>free).clear(actor,{x:2,z:0}),false);
});

test('a larger step cannot move beyond the cached safe prefix without another swept check',()=>{
 const actor={x:0,z:0,path:[{x:100,z:0}]};let checks=0;
 const nav={version:1,segmentClear:(_start,end)=>{checks++;return end.x<6;}};
 assert.ok(animalRouteClearance(actor,nav,{radius:.5},null).clear(actor,{x:1,z:0}));
 actor.x=1;
 const guard=animalRouteClearance(actor,nav,{radius:.5},null);
 assert.equal(guard.clear(actor,{x:8,z:0}),false);assert.ok(guard.blocked());assert.ok(checks>1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {wateringRoute} from '../src/world/work-points.js';

test('an exact blocked watering route is retried after movement or navigation change',()=>{
 const nav={version:1,state:{},field:{surface:()=>0},obstacles:[],workerSurface:()=>0,walkable:()=>true,segmentClear:()=>false,pathCalls:0,path(){this.pathCalls++;return null;}};
 const worker={x:0,z:0,radius:.28},plant={id:'crop-1',x:4,z:0,species:'mijo'};
 assert.equal(wateringRoute(worker,plant,nav),null);
 const first=nav.pathCalls;assert.ok(first>0);
 assert.equal(wateringRoute(worker,plant,nav),null);assert.equal(nav.pathCalls,first);
 worker.x=.1;assert.equal(wateringRoute(worker,plant,nav),null);assert.ok(nav.pathCalls>first);
 const moved=nav.pathCalls;nav.version++;
 assert.equal(wateringRoute(worker,plant,nav),null);assert.ok(nav.pathCalls>moved);
 const topology=nav.pathCalls;nav.obstacles=[];
 assert.equal(wateringRoute(worker,plant,nav),null);assert.ok(nav.pathCalls>topology);
});

test('positive watering routes are never cached or shared between workers',()=>{
 const nav={version:1,state:{},field:{surface:()=>0},obstacles:[],workerSurface:()=>0,walkable:()=>true,segmentClear:()=>true,path(){throw Error('direct path expected');}};
 const worker={x:0,z:0,radius:.28},plant={id:'crop-2',x:1,z:0,species:'mijo'};
 const first=wateringRoute(worker,plant,nav),second=wateringRoute(worker,plant,nav);
 assert.ok(first&&second);assert.notEqual(first,second);assert.notEqual(first.path,second.path);
});

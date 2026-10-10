import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {cachedFractionalWalkability,FRACTIONAL_WALKABILITY_LIMIT} from '../src/world/fractional-walkability-cache.js';
test('fractional queries remain exact, replay peak risk and invalidate on topology, terrain or test implementation changes',()=>{
 let calls=0;const nav={version:1,field:{},testWalkable(x){calls++;this.workerSweep.peak=.31;return x<2;}};
 assert.equal(cachedFractionalWalkability(nav,1.25,0,.3,null,true),true);nav.workerSweep={peak:.1};
 assert.equal(cachedFractionalWalkability(nav,1.25,0,.3,null,true),true);assert.equal(nav.workerSweep.peak,.31);assert.equal(calls,1);
 cachedFractionalWalkability(nav,1.250000001,0,.3,null,true);cachedFractionalWalkability(nav,1.25,0,.4,null,true);cachedFractionalWalkability(nav,1.25,0,.3,'wall',true);cachedFractionalWalkability(nav,1.25,0,.3,null,false);assert.equal(calls,5);
 nav.version++;cachedFractionalWalkability(nav,1.25,0,.3,null,true);assert.equal(calls,6);nav.field={};cachedFractionalWalkability(nav,1.25,0,.3,null,true);assert.equal(calls,7);
 nav.testWalkable=()=>false;assert.equal(cachedFractionalWalkability(nav,1.25,0,.3,null,true),false);
});
test('inherited navigation views never share walkability decisions; memory is bounded and thrown queries are not cached',()=>{
 let calls=0;const nav={version:1,field:{},testWalkable(){calls++;return true;}},view=Object.create(nav);view.testWalkable=()=>false;
 assert.equal(cachedFractionalWalkability(nav,.1,0,.3,null,true),true);assert.equal(cachedFractionalWalkability(view,.1,0,.3,null,true),false);
 for(let i=1;i<=FRACTIONAL_WALKABILITY_LIMIT;i++)cachedFractionalWalkability(nav,i+.1,0,.3,null,true);
 cachedFractionalWalkability(nav,.1,0,.3,null,true);assert.equal(calls,FRACTIONAL_WALKABILITY_LIMIT+2);
 const prior={peak:.2};nav.workerSweep=prior;nav.testWalkable=()=>{throw Error('test');};assert.throws(()=>cachedFractionalWalkability(nav,.2,0,.3,null,true),/test/);assert.equal(nav.workerSweep,prior);
});
test('native wall changes and worker avoidance retain exact blocking and separate views',()=>{
 const nav=new Navigation(712,'sabana',{});nav.field={canyon:false,fluidInside:()=>false,slope:()=>0};nav.propsAt=()=>[];
 const state={structures:[],villages:[],suppressed:[],spells:[]};nav.setState(state);assert.equal(nav.walkable(.25,.25,.3,null,true),true);
 state.structures.push({id:'wall',kind:'wall',x:0,z:0,yaw:0,material:'zarzas',status:'intact'});nav.setState(state);assert.equal(nav.walkable(.25,.25,.3,null,true),false);
 state.structures=[];nav.setState(state);assert.equal(nav.walkable(.25,.25,.3,null,true),true);
 const actor={terrainAvoidance:[{x:.25,z:.25}]},view=nav.workerNavigationView(actor,.3,null);assert.equal(view.walkable(.25,.25,.3,null,true),false);assert.equal(nav.walkable(.25,.25,.3,null,true),true);
});

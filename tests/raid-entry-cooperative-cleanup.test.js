import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {navigationPathKey} from '../src/world/raid-navigation-warmth.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {activeChunkRegion} from '../src/world/active-region.js';
import * as Game from '../src/simulation/game.js';
test('Cancelling a suspended native path never memoizes failure and leaves its navigator usable',()=>{
 const s=Game.newGame({seed:712}),nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);Game.placeStructure(s,'center',{x:10,z:0},nav);
 const start={x:0,z:0},end={x:25,z:0},key=navigationPathKey(start,end,1.1,null,false,16),iterator=nav.pathSteps(start,end,1.1,null,false);
 assert.equal(iterator.next().done,false);assert.equal(iterator.next().done,false);assert.equal(nav.failedPaths.has(key),false);iterator.return();assert.equal(nav.failedPaths.has(key),false);assert.ok(nav.path(start,end,1.1,null,false));
});
test('Bounds, navigation epoch, group and done lifecycle close their actual native continuations',()=>{
 const {s,nav}=createOpeningWorld({biome:'sabana',seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.nightPlan={at:400,group:['warthog','rhino'],done:false};
 const preparer=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('No worker');},sliceOptions:{maxBoundaries:1,maxGeometryChecks:1}});
 try{
  preparer.update(s);let previous=preparer.cooperative.computation;nav.setActiveBounds(nav.activeBounds.map((v,i)=>v+(i%2?0:48)));preparer.update(s);assert.equal(previous.disposed,true);
  previous=preparer.cooperative.computation;nav.setState(s);preparer.update(s);assert.equal(previous.disposed,true);
  previous=preparer.cooperative.computation;s.nightPlan.group=['rhino'];preparer.update(s);assert.equal(previous.disposed,true);
  previous=preparer.cooperative.computation;s.nightPlan.done=true;preparer.update(s);assert.equal(previous.disposed,true);assert.equal(preparer.cooperative,null);assert.equal(preparer.ready,null);
 }finally{preparer.dispose();}
});
test('A cooperative error is actionable once per key and leaves no hidden active iterator',()=>{
 const {s,nav}=createOpeningWorld({biome:'sabana',seed:712}),center=s.structures[0];nav.setActiveBounds(activeChunkRegion(center).bounds);nav.setRaidView({x:center.x+16,z:center.z+20},center);s.nightPlan={at:400,group:['warthog'],done:false};let disposals=0;
 const preparer=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('No worker');},createCooperative:()=>({pump(){throw Error('native diagnostic failure');},dispose(){disposals++;}})});
 try{preparer.update(s);preparer.update(s);assert.match(preparer.cooperativeError,/native diagnostic failure/);assert.equal(preparer.stats.cooperativeErrors,1);assert.equal(disposals,1);assert.equal(preparer.cooperative,null);assert.equal(s.raid,null);}finally{preparer.dispose();}
});

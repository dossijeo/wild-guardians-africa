import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {withNavigationQueries} from '../src/world/navigation-query-scope.js';
import {navigationPathKey} from '../src/world/raid-navigation-warmth.js';
import {serialize} from '../src/persistence/snapshots.js';
import {withRaidEntryBudget} from '../src/world/raid-entry-budget.js';
const start={x:0,z:0},end={x:25,z:0};
function fixture(){
 const s=Game.newGame({seed:712}),nav=new Navigation(712,'sabana',{});
 nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);Game.placeStructure(s,'center',{x:10,z:0},nav);return {s,nav};
}
test('Native cached and prepared routes consume no search or geometry budget',()=>{
 const {s,nav}=fixture(),before=serialize(s);
 withNavigationQueries(nav,()=>{
  const route=nav.path(start,end,1.1,null,false);assert.ok(route);assert.equal(nav.segmentClear(start,end,1.1,null,false),false);
  assert.deepEqual(withRaidEntryBudget(nav,0,()=>nav.path(start,end,1.1,null,false),{maxGeometryChecks:0,maxSearchYields:0}),route);
  assert.equal(nav.lastRaidEntryBudget.searches,0);assert.equal(nav.lastRaidEntryBudget.geometryChecks,0);
 });
 const key=navigationPathKey(start,end,1.1,null,false,16),route=[{x:4,z:4},end];
 nav.preparedPaths={version:nav.version,entries:new Map([[key,route]])};
 assert.deepEqual(withRaidEntryBudget(nav,0,()=>nav.path(start,end,1.1,null,false),{maxGeometryChecks:0}),route);assert.equal(serialize(s),before);
});
test('Native interrupted A* never poisons failedPaths and later route remains valid',()=>{
 const {s,nav}=fixture(),before=serialize(s),methods=['walkable','segmentClear','findPathSteps','approachPath'],own=methods.map(k=>Object.getOwnPropertyDescriptor(nav,k));
 assert.equal(withRaidEntryBudget(nav,0,()=>nav.path(start,end,1.1,null,false),{maxGeometryChecks:100000,maxSearchYields:10000}),null);
 assert.equal(nav.lastRaidEntryBudget.exhausted,'searches');assert.equal(nav.failedPaths.size,0);
 for(let i=0;i<methods.length;i++)assert.deepEqual(Object.getOwnPropertyDescriptor(nav,methods[i]),own[i]);
 const route=nav.path(start,end,1.1,null,false);assert.ok(route);assert.equal(serialize(s),before);
});
test('Geometry allowance aborts native search with honest counters and no failure memo',()=>{
 const {nav}=fixture();assert.equal(withRaidEntryBudget(nav,4,()=>nav.path(start,end,1.1,null,false),{maxGeometryChecks:2}),null);
 assert.equal(nav.lastRaidEntryBudget.geometryChecks,2);assert.equal(nav.lastRaidEntryBudget.exhausted,'geometry');assert.equal(nav.failedPaths.size,0);
 assert.ok(nav.path(start,end,1.1,null,false));
});
test('Yield allowance closes interrupted generator and restores methods on unrelated errors',()=>{
 let closed=0;const nav={*findPathSteps(){try{while(true)yield null;}finally{closed++;}}};const original=nav.findPathSteps;
 assert.equal(withRaidEntryBudget(nav,4,()=>{const it=nav.findPathSteps();it.next();it.next();},{maxSearchYields:1}),null);
 assert.equal(closed,1);assert.equal(nav.findPathSteps,original);assert.equal(nav.lastRaidEntryBudget.searchYields,1);
 assert.throws(()=>withRaidEntryBudget(nav,4,()=>{throw Error('unrelated');}),/unrelated/);assert.equal(nav.findPathSteps,original);
});

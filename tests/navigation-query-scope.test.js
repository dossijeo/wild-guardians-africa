import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {withNavigationQueries,rememberNavigationQuery,navigationQueryResult} from '../src/world/navigation-query-scope.js';
function fixture(){
 const nav=new Navigation(712,'sabana',{});nav.setState({structures:[],villages:[],suppressed:[],spells:[]});
 let searches=0;nav.findPath=(_a,b)=>{searches++;return [{x:1,z:2},{x:b.x,z:b.z}];};nav.smoothPath=(_a,p)=>p;
 return {nav,count:()=>searches};
}
const a={x:0,z:0},b={x:4,z:5};
test('successful exact queries are shared only inside the synchronous scope, with independent waypoints',()=>{
 const {nav,count}=fixture();
 withNavigationQueries(nav,()=>{
  const first=nav.path(a,b);first[0].x=999;first.pop();
  const second=nav.path(a,b);assert.deepEqual(second,[{x:1,z:2},{x:4,z:5}]);second[0].z=999;
  withNavigationQueries(nav,()=>assert.deepEqual(nav.path(a,b),[{x:1,z:2},{x:4,z:5}]));
  assert.equal(count(),1);
  for(const args of [[b,a],[{x:1e-8,z:0},b],[a,b,.4],[a,b,.3,'center'],[a,b,.3,null,false],[a,b,.3,null,true,32]])nav.path(...args);
  assert.equal(count(),7);
 });
 nav.path(a,b);assert.equal(count(),8);withNavigationQueries(nav,()=>nav.path(a,b));assert.equal(count(),9);
});
test('geometry and crop epochs invalidate same-scope results, previews and dynamic clones stay separate',()=>{
 const {nav,count}=fixture();
 withNavigationQueries(nav,()=>{
  nav.path(a,b);nav.path(a,b);assert.equal(count(),1);
  nav.syncCropPlacement(nav.state);nav.path(a,b);assert.equal(count(),2);
  const preview=nav.forBuildingPlacement({kind:'house',x:2,z:2,radius:1});preview.path(a,b);assert.equal(count(),3);
  const dynamic=Object.assign(Object.create(nav),{failedPaths:new Set(),preparedPaths:null});dynamic.path(a,b);assert.equal(count(),4);
  nav.setState(nav.state);nav.path(a,b);assert.equal(count(),5);
 });
});
test('failed query rules still prevail and throwing work always releases scope',()=>{
 const {nav,count}=fixture();
 assert.throws(()=>withNavigationQueries(nav,()=>{nav.path(a,b);throw Error('interrupted');}),/interrupted/);
 nav.path(a,b);assert.equal(count(),2);
 withNavigationQueries(nav,()=>{
  nav.path(a,b);nav.failedPaths.add('0,0|4,5:0.3:null:true:16');assert.equal(nav.path(a,b),null);
 });
});
test('temporary memory is bounded by route count and waypoint count',()=>{
 const nav={version:1};
 withNavigationQueries(nav,()=>{
  for(let i=0;i<129;i++)rememberNavigationQuery(nav,String(i),[{x:i,z:0}]);
  assert.equal(navigationQueryResult(nav,'0'),undefined);assert.ok(navigationQueryResult(nav,'1'));assert.ok(navigationQueryResult(nav,'128'));
  const long=Array.from({length:10001},(_,x)=>({x,z:0}));rememberNavigationQuery(nav,'long1',long);rememberNavigationQuery(nav,'long2',long);
  assert.equal(navigationQueryResult(nav,'long1'),undefined);assert.equal(navigationQueryResult(nav,'long2').length,10001);
  rememberNavigationQuery(nav,'too-long',[...long,...long]);assert.equal(navigationQueryResult(nav,'too-long'),undefined);
 });
 assert.equal(navigationQueryResult(nav,'long2'),undefined);
});

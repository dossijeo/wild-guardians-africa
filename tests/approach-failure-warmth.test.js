import test from 'node:test';import assert from 'node:assert/strict';
import {warmFailedApproach} from '../src/world/approach-failure-warmth.js';
import {Navigation} from '../src/world/navigation.js';

test('Failed-approach warming is bounded and scoped to actor coordinates, radius and geometry epoch',()=>{
 const calls=[],nav={version:1,findPath(...args){calls.push(args);return null;}},a={x:10,z:20},p={x:0,z:0};
 warmFailedApproach(nav,p,a,.97,32);warmFailedApproach(nav,{x:1,z:1},a,.97,32);
 assert.equal(calls.length,1);assert.deepEqual(calls[0],[p,a,.97,null,false,48]);
 warmFailedApproach(nav,p,a,.28,32);warmFailedApproach(nav,p,{x:10.1,z:20},.97,32);assert.equal(calls.length,3);
 nav.version++;warmFailedApproach(nav,p,a,.97,32);assert.equal(calls.length,4);
 for(let i=0;i<129;i++)warmFailedApproach(nav,p,{x:i,z:200},.97,32);
 warmFailedApproach(nav,p,a,.97,32);assert.equal(calls.length,134);
});

test('Other search margins retain the original computation; a replaced search cannot reuse old warming state',()=>{
 let n=0;const nav={version:1,findPath(){n++;return null;}},p={x:0,z:0},a={x:1,z:1};
 for(const margin of [16,24,48])warmFailedApproach(nav,p,a,.9,margin);assert.equal(n,0);
 warmFailedApproach(nav,p,a,.9,32);nav.findPath=()=>{n++;return null;};warmFailedApproach(nav,p,a,.9,32);assert.equal(n,2);
});

test('An expanded success is discarded, not substituted for a failed native approach',()=>{
 const nav=new Navigation(123,'sabana',{}),calls=[];
 nav.path=()=>null;nav.findPath=(...args)=>{calls.push(args);return [{x:99,z:99}];};
 assert.equal(nav.approachPath({x:1,z:1},{x:2,z:2},.9,32),null);assert.equal(calls.length,1);
});

test('A successful approach preserves every original waypoint and performs no wider search',()=>{
 const nav=new Navigation(123,'sabana',{});nav.path=()=>[{x:2,z:2},{x:1,z:2},{x:1,z:1}];nav.findPath=()=>{throw Error('Unexpected warm search');};
 assert.deepEqual(nav.approachPath({x:1,z:1},{x:2,z:2},.9,32),[{x:1,z:2},{x:2,z:2},{x:2,z:2}]);
});

test('Native warming preserves positive and negative paths, including a detour outside the original corridor',()=>{
 const flat=()=>{const nav=new Navigation(123,'sabana',{});nav.field={blocked:()=>false,slope:()=>0};nav.propsAt=()=>[];nav.setState({structures:[],villages:[],spells:[],suppressed:[]});return nav;};
 const scenarios=[[],[{id:'long',kind:'house',x:5,z:0,footprint:[{x:4,z:-40},{x:6,z:-40},{x:6,z:40},{x:4,z:40}]}],
   [{id:'closed',kind:'house',x:5,z:0,footprint:[{x:4,z:-100},{x:6,z:-100},{x:6,z:100},{x:4,z:100}]}]];
 for(const obstacles of scenarios){const candidate=flat(),baseline=flat();candidate.obstacles=structuredClone(obstacles);baseline.obstacles=structuredClone(obstacles);
  baseline.approachPath=function(start,end,radius,margin){const reverse=this.path(end,start,radius,null,false,margin);return reverse?[...reverse.slice(0,-1).reverse(),{x:end.x,z:end.z}]:null;};
  for(const end of [{x:10,z:0},{x:10.25,z:1},{x:11,z:-1},{x:-4,z:3},{x:5,z:0}]){
   const start={x:0,z:0};assert.deepEqual(candidate.approachPath(start,end,.3,32),baseline.approachPath(start,end,.3,32));
  }
  candidate.invalidateGeometryQueries();baseline.invalidateGeometryQueries();candidate.obstacles=[];baseline.obstacles=[];
  assert.deepEqual(candidate.approachPath({x:0,z:0},{x:10,z:0},.3,32),baseline.approachPath({x:0,z:0},{x:10,z:0},.3,32));
 }
});

test('Early generator cancellation cannot install an exhaustive failure certificate',()=>{
 const nav=new Navigation(123,'sabana',{});nav.field={blocked:()=>false,slope:()=>0};nav.propsAt=()=>[];nav.setState({structures:[],villages:[],spells:[],suppressed:[]});
 const generator=nav.findPathSteps({x:0,z:0},{x:100,z:100},.3,null,false,48,{skipDirect:true});
 assert.equal(generator.next().done,false);generator.return();assert.equal(nav.searchedRegions.length,0);assert.equal(nav.closedRegions.size,0);
});

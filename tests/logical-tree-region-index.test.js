import test from 'node:test';
import assert from 'node:assert/strict';
import {LogicalTreeRegionIndex} from '../tools/experiments/logical-tree-region-index.js';
import {logicalNativeStandbyEntries} from '../tools/experiments/logical-native-standby.js';
const metadata={impostorHeight:12,sourceBounds:{min:[-3,0,-4],max:[3,12,4]}};
test('regional index preserves exact selections, LOD hysteresis and matrices across moving cameras',()=>{
 let seed=121;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const trees=Array.from({length:3000},(_,i)=>{const x=(random()-.5)*1600,z=(random()-.5)*1600;return {id:'tree-'+i,x:x+1,y:2,z:z-2,origin:{x,y:1,z},yaw:random()*6,sx:.5+random(),sy:.5+random(),sz:.5+random()};});
 const index=new LogicalTreeRegionIndex(trees);let previousLevels=null;
 for(let i=0;i<120;i++){
  const camera={x:(random()-.5)*900,y:random()*200,z:(random()-.5)*900};
  const opts={metadata,camera,quality:['baja','media','alta'][i%3],range:80+random()*260,maxTrees:20+i%100,physicalIds:new Set(trees.filter((_,j)=>j%7===i%7).map(t=>t.id)),suppressed:new Set(['tree-'+i]),angularLod:!!(i%2),preloadBounds:i%3?[-120,-120,120,120]:null,previousLevels};
  const expected=logicalNativeStandbyEntries(trees,opts),actual=logicalNativeStandbyEntries(trees,{...opts,spatialIndex:index});
  assert.deepEqual(actual,expected,'selection '+i);previousLevels=new Map(actual.map(t=>[t.id,t]));
 }
 assert.throws(()=>logicalNativeStandbyEntries([...trees],{metadata,camera:{x:0,y:0,z:0},range:100,physicalIds:new Set(),suppressed:new Set(),spatialIndex:index}),/Mismatched/);
});
test('broad phase includes negative cell boundaries and exact circular range edges',()=>{
 const trees=[[-64,0],[64,0],[0,-64],[0,64],[-64,-64],[64,64]].map(([x,z],id)=>({id:String(id),x,z}));
 const index=new LogicalTreeRegionIndex(trees);
 assert.deepEqual(new Set(index.candidates({x:0,z:0},64)),new Set(trees));
 assert.equal(index.candidates({x:1000,z:1000},5).length,0);
});

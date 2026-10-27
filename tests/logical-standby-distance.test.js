import test from 'node:test';import assert from 'node:assert/strict';
import {logicalNativeStandbyEntries as current} from '../tools/experiments/logical-native-standby.js';
import {logicalNativeStandbyEntries as original} from './fixtures/logical-standby-reference.js';
test('cached distances preserve exact output across suppression, altitude, quality and hysteresis',()=>{
 let seed=191;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const trees=Array.from({length:2500},(_,i)=>{const x=(random()-.5)*900,z=(random()-.5)*900;return {id:'tree-'+i,x:x+1,y:3,z:z-1,origin:{x,y:1,z},yaw:random()*6,sx:.5+random(),sy:.5+random(),sz:.5+random()};});
 let previousLevels=null;
 for(let i=0;i<150;i++){
  const options={metadata:{impostorHeight:12,sourceBounds:{min:[-3,0,-4],max:[3,12,4]}},camera:{x:(random()-.5)*700,y:random()*160,z:(random()-.5)*700},quality:['baja','media','alta'][i%3],range:100+random()*250,maxTrees:1+i%200,physicalIds:new Set(trees.filter((_,j)=>j%7===i%7).map(t=>t.id)),suppressed:new Set(['tree-'+i]),angularLod:!!(i%2),preloadBounds:i%3?[-180,-180,180,180]:null,previousLevels};
  const expected=original(trees,options),actual=current(trees,options);assert.deepEqual(actual,expected,'case '+i);previousLevels=new Map(actual.map(t=>[t.id,t]));
 }
});

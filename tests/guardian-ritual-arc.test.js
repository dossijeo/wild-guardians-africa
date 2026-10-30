import test from 'node:test';import assert from 'node:assert/strict';
import {ritualArcLift} from '../tools/guardian/ritual-arc-experiment.mjs';
const origin={x:0,y:3,z:0},target={x:6,y:0,z:0},camera={position:{toArray:()=>[0,8,10]}};
test('unobstructed ritual keeps its original trajectory',()=>assert.equal(ritualArcLift(origin,target,camera,()=>false),0));
test('blocked ritual selects first clear raised arc',()=>{const lift=ritualArcLift(origin,target,camera,(_a,b)=>b[0]>=2&&b[0]<=4&&b[1]<4);assert.equal(lift,4);});
test('unresolved obstruction keeps depth-tested fallback and bounded work',()=>{let calls=0;assert.equal(ritualArcLift(origin,target,camera,()=>{calls++;return true;}),0);assert.equal(calls,7);});
test('overhead ceremony needs no detour',()=>assert.equal(ritualArcLift(origin,{x:0,y:0,z:0},camera,()=>{throw Error('unnecessary query');}),0));

import test from 'node:test';
import assert from 'node:assert/strict';
import {auditVisualSchedule} from '../tools/trees/prototype_visual_schedule_audit.mjs';
const actor=(id,points,radius=.2)=>({id,radius,points:points.map(([t,x,z])=>({t,x,z}))});

test('detects crossing trajectories and accepts a timed wait',()=>{
 const a=actor('a',[[0,-1,0],[1,1,0]]),cross=actor('b',[[0,0,-1],[1,0,1]]);
 const result=auditVisualSchedule([a,cross],1);assert.equal(result.safe,false);assert.equal(result.conflicts[0].time,.5);assert.equal(result.conflicts[0].distance,0);
 const waitA=actor('a',[[0,-1,0],[.5,1,0],[1,1,0]]),waitB=actor('b',[[0,0,-1],[.5,0,-1],[1,0,1]]);
 assert.equal(auditVisualSchedule([waitA,waitB],1).safe,true);
});
test('holds, tangency, unequal segment times and malformed schedules are handled',()=>{
 const a=actor('a',[[0,0,0],[1,0,0]],.5),touch=actor('b',[[0,1,0],[.3,1,0],[1,1,0]],.5);
 assert.equal(auditVisualSchedule([a,touch],1).safe,true);
 assert.equal(auditVisualSchedule([a,actor('b',[[0,.9,0],[1,.9,0]],.5)],1).safe,false);
 assert.throws(()=>auditVisualSchedule([a,actor('a',[[0,2,0],[1,2,0]])],1));
 assert.throws(()=>auditVisualSchedule([actor('bad',[[.1,0,0],[1,0,0]])],1));
 assert.throws(()=>auditVisualSchedule([actor('bad',[[0,0,0],[0,0,0],[1,1,0]])],1));
 assert.throws(()=>auditVisualSchedule([a,actor('huge',[[0,Number.MAX_VALUE,0],[1,-Number.MAX_VALUE,0]])],1),RangeError);
});

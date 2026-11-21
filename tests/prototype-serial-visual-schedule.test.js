import test from 'node:test';
import assert from 'node:assert/strict';
import {serialVisualSchedule} from '../tools/trees/prototype_serial_visual_schedule.mjs';
import {auditVisualSchedule} from '../tools/trees/prototype_visual_schedule_audit.mjs';
const actor=(id,x,z,xx,zz)=>({id,radius:.2,points:[{t:0,x,z},{t:1,x:xx,z:zz}]});
test('serializing a crossing prevents overlap but doubles instantaneous travel speed',()=>{
 const actors=[actor('a',-1,0,1,0),actor('b',0,-1,0,1)],candidate=serialVisualSchedule(actors,1);
 assert.equal(auditVisualSchedule(actors,1).safe,false);assert.equal(auditVisualSchedule(candidate.schedule,1).safe,true);
 assert.equal(candidate.relativeSpeedMultiplier,2);assert.equal(candidate.movingCount,2);assert.deepEqual(candidate.schedule[0].points,[{t:0,x:-1,z:0},{t:.5,x:1,z:0},{t:1,x:1,z:0}]);
});
test('stationary actors remain obstacles and malformed or duplicate data fails',()=>{
 const actors=[actor('a',-1,0,1,0),actor('b',0,0,0,0)],candidate=serialVisualSchedule(actors,1);
 assert.equal(candidate.movingCount,1);assert.equal(auditVisualSchedule(candidate.schedule,1).safe,false);
 assert.throws(()=>serialVisualSchedule([actors[0],actors[0]],1));assert.throws(()=>serialVisualSchedule([actor('a',0,0,1,0)],0));
});

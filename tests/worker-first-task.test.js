import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {wateringRoute} from '../src/world/work-points.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
function fixture(){
 const s=Game.newGame({slotId:'first-task'});Game.resume(s,'intro');
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-20,z:0},nav);Game.plant(s,'seed','mijo',10,0,nav);
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});s.tutorial.step='done';s.dayPlan={done:true};
 return {s,nav};
}
for(const reload of [false,true])test(`new paid contract walks directly towards the first FIFO task${reload?' after reload':''}`,()=>{
 let {s,nav}=fixture();if(reload){s=deserialize(serialize(s));nav.setState(s);}
 const w=s.workers[0],plant=s.plants[0],origin={x:w.x,z:w.z};
 const expected=wateringRoute(w,plant,nav);assert.ok(expected);
 const calls=[],path=nav.path.bind(nav);nav.path=(a,b,...rest)=>{calls.push({x:b.x,z:b.z,id:b.id});return path(a,b,...rest);};
 Game.tick(s,.05,nav);
 assert.equal(s.tasks.find(t=>t.id===w.taskId)?.targetId,plant.id);
 assert.equal(w.status,'walking');assert.ok(w.x>origin.x,'crop is east; the unrelated centre is west');
 assert.equal(w.destinationId,expected.destination.id);
 assert.ok(!calls.some(p=>p.id?.startsWith('arrival-')));
 assert.ok(nav.segmentClear(origin,w,.28,null,true));
});
test('raid survivors keep their deliberate return to the centre and do not become new contracts',()=>{
 const {s,nav}=fixture(),w=s.workers[0];w.raidReturn=true;
 Game.tick(s,.05,nav);assert.equal(w.status,'arriving');assert.ok(w.destinationId.startsWith('arrival-'));
 assert.equal(w.taskId,null);assert.ok(w.x<0);
});

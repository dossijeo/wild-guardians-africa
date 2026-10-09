import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {dailyTutorialMessages,recordTutorialMessageToday,tutorialMessageShownToday} from '../src/tutorial/daily-messages.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

const profile=()=>{const seen=new Set();return {read:()=>seen,record:id=>seen.add(id),basicCompleted:false};};
test('queries and hidden time do not consume a message; one reading stays visible until dismissed',()=>{
 const s=Game.newGame({seed:712}),c=new TutorialController(s,profile());
 assert.equal(c.presentation({record:false}).id,'basic.introduction');
 c.advance(60,{visible:false});assert.deepEqual(dailyTutorialMessages(s),[]);
 assert.equal(c.presentation().id,'basic.introduction');
 for(let i=0;i<10;i++)assert.equal(c.presentation().id,'basic.introduction');
 assert.deepEqual(dailyTutorialMessages(s),['basic.introduction']);
 c.dismiss();assert.equal(c.presentation().id,'basic.center');c.dismiss();
 assert.equal(c.presentation(),null);assert.equal(s.tutorial.step,'center');
});
test('daily history is saved per game, including non-catalogue warning IDs, without changing legacy saves',()=>{
 const a=Game.newGame({seed:1}),b=Game.newGame({seed:2});
 assert.equal(recordTutorialMessageToday(a,'budget.reserve'),true);
 assert.equal(recordTutorialMessageToday(a,'budget.reserve'),false);
 const restored=deserialize(serialize(a));assert.equal(tutorialMessageShownToday(restored,'budget.reserve'),true);
 assert.deepEqual(dailyTutorialMessages(b),[]);
 delete b.tutorial.shownToday;assert.deepEqual(dailyTutorialMessages(deserialize(serialize(b))),[]);
 for(const value of [{day:2,ids:[]},{day:1,ids:['x','x']},{day:1,ids:[5]}]){
   a.tutorial.shownToday=value;assert.throws(()=>serialize(a),/Registro diario/);
 }
});
test('real dawn clears the old daily history before hiring opens',()=>{
 const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(_start,end)=>[{x:end.x,z:end.z}]};
 const s=Game.newGame({seed:712});Game.placeStructure(s,'center',{x:4,z:0},nav);
 s.initialPreparation=false;s.time=599;s.elapsed=599;s.nightPlan={done:true,group:[]};
 recordTutorialMessageToday(s,'reminder.growth');recordTutorialMessageToday(s,'budget.reserve');
 Game.advanceReal(s,1,nav);
 assert.equal(s.day,2);assert.ok(s.pauses.includes('hiring'));
 assert.deepEqual(s.tutorial.shownToday,{day:2,ids:[]});
 assert.equal(recordTutorialMessageToday(s,'reminder.growth'),true);
});
test('the daily gate also rejects a non-magic message queued again after controller recreation',()=>{
 const s=Game.newGame({seed:712}),p=profile();s.day=5;s.tutorial.basicSkipped=true;s.tutorial.step='done';
 s.tutorial.seen=['mechanic.defenses','magic.growth','magic.multiply'];
 s.people.push({id:'recovering-person',recoveryUntil:6});
 const c=new TutorialController(s,p);assert.equal(c.presentation().id,'worker.recovery');c.dismiss();
 // A repeated producer must not rely on permanent profile history to dedupe.
 s.tutorial.seen=s.tutorial.seen.filter(id=>id!=='worker.recovery');p.read().delete('worker.recovery');
 const restored=new TutorialController(deserialize(serialize(s)),p);
 assert.equal(restored.presentation(),null);
 restored.state.day++;restored.update();assert.equal(restored.presentation().id,'worker.recovery');
});

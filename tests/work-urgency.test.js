import test from 'node:test';import assert from 'node:assert/strict';
import {createUrgencyPass} from '../src/simulation/work-urgency.js';
import {urgentWork} from '../src/simulation/locomotion.js';
const worker=(id,centerId='a')=>({id,centerId,profile:'olderFemale',status:'walking',contractDay:3});
test('pass observes task completion, departures, injury and center changes before later urgency decisions',()=>{
 const s={day:3,time:0,workers:[worker('1'),worker('2'),worker('3','b')],tasks:Array.from({length:5},()=>({centerId:'a'}))},pass=createUrgencyPass(s);
 const compare=()=>{for(const w of s.workers)assert.equal(pass.urgent(w),urgentWork(s,w));};compare();
 s.tasks=s.tasks.slice(0,4);compare();s.workers[0].status='returning';pass.changed(s.workers[0]);compare();
 s.workers[1].incapacitated=true;pass.changed(s.workers[1]);compare();s.workers[1].incapacitated=false;s.workers[1].centerId='b';pass.changed(s.workers[1]);compare();
 s.tasks.push({centerId:'b'});compare();s.time=300;compare();s.time=0;s.day=4;compare();
 s.workers=[worker('new')];s.day=3;compare();s.workers.push(worker('append'));compare();
});
test('strict threshold, reserved tasks and all profiles/status transitions match direct live counts',()=>{
 const profiles=['olderMale','olderFemale','youngMale','youngFemale'],statuses=['idle','walking','acting','carrying','home','returning','fleeing','incapacitated'];
 for(const time of [0,249.99,250,299.99,300]){
  const s={day:3,time,workers:Array.from({length:40},(_,i)=>({...worker(String(i),i%3?'a':'b'),profile:profiles[i%4],status:statuses[i%8]})),tasks:Array.from({length:121},(_,i)=>({centerId:i%3?'a':'b',workerId:i%2?'reserved':null}))},pass=createUrgencyPass(s);
  for(let i=0;i<80;i++){const w=s.workers[i%40];assert.equal(pass.urgent(w),urgentWork(s,w));w.status=statuses[(i+3)%8];w.incapacitated=i%7===0;pass.changed(w);if(i%11===0)s.tasks=s.tasks.slice(1);}
 }
});
test('never queried centers do not evaluate unrelated profiles and change notification is lazy',()=>{
 const good=worker('1'),other={id:'bad',centerId:'b',status:'walking'},s={day:3,time:0,workers:[good,other],tasks:[{centerId:'a'}]},pass=createUrgencyPass(s);
 pass.changed(other);assert.equal(pass.urgent(good),urgentWork(s,good));pass.changed(other);assert.equal(pass.urgent(good),false);
});

test('center reconstruction invalidation observes reassignment of several employees at once',()=>{
 const s={day:3,time:0,workers:[worker('1'),worker('2'),worker('3','b')],tasks:Array.from({length:6},()=>({centerId:'a'}))},pass=createUrgencyPass(s);
 assert.equal(pass.urgent(s.workers[0]),urgentWork(s,s.workers[0]));
 s.workers[1].centerId='b';s.workers[1].status='arriving';s.workers[2].centerId='a';s.workers[2].status='arriving';s.workers[0].status='returning';
 pass.invalidate();pass.changed(s.workers[0]);
 for(const w of s.workers)assert.equal(pass.urgent(w),urgentWork(s,w));
});

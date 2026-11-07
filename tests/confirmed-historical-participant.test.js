import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedHistoricalParticipant} from '../src/rendering/confirmed-historical-participant.js';
import {actorTickState} from '../src/simulation/worker-actor-tick-states.js';
import {confirmedWalkingSamples} from '../src/rendering/confirmed-animation-samples.js';

test('ambient worker walking is accepted only while its mode and phase remain confirmed',()=>{
 for(const status of ['idle','waiting']){const worker={id:'w',profile:'youngMale',status,x:2,z:3,walkPhase:1,idleState:{mode:'walk'},path:[{x:4,z:3}]},start=actorTickState(worker,5),end={...start,at:5.1,x:2.1,walkPhase:1.1},path={actorId:'w',continuous:true,timed:true,startStatus:status,endStatus:status,start:{at:5,x:2,z:3},end:{at:5.1,x:2.1,z:3},segments:[{x0:2,z0:3,x1:2.1,z1:3}]},preview={start:5,end:5.1,trace:{actors:[path],actorTickStates:{complete:true,actors:[{actorId:'w',samples:[start,end]}]}}};
 assert.equal(confirmedHistoricalParticipant(preview,'w',worker,'worker'),'moving');assert.deepEqual(confirmedWalkingSamples(preview,'w','worker',worker),[{at:5,phase:1},{at:5.1,phase:1.1}]);end.idleMode='rest';assert.equal(confirmedHistoricalParticipant(preview,'w',worker,'worker'),null);assert.equal(confirmedWalkingSamples(preview,'w','worker',worker),null);end.idleMode='walk';end.gateWaiting=true;assert.equal(confirmedWalkingSamples(preview,'w','worker',worker),null);}
});

test('stationary fallback is bounded in real time rather than accelerated simulation time',()=>{
 const worker={id:'w',profile:'youngMale',status:'idle',x:2,z:3,idleState:{mode:'rest',elapsed:0}},path={actorId:'w',continuous:true,timed:true,startStatus:'idle',endStatus:'idle',start:{at:5,x:2,z:3},end:{at:5.5,x:2,z:3},segments:[]},samples=[actorTickState(worker,5),actorTickState(worker,5.5)],preview={start:5,end:5.5,clockSegments:{start:5,end:5.5,complete:true,segments:[{realDuration:.1,rate:5}]},trace:{actors:[path],actorTickStates:{complete:true,actors:[{actorId:'w',samples}]}}};
 assert.equal(confirmedHistoricalParticipant(preview,'w',worker,'worker'),'stationary');preview.clockSegments.segments[0].realDuration=.101;assert.equal(confirmedHistoricalParticipant(preview,'w',worker,'worker'),null);preview.clockSegments.segments[0].realDuration=.1;samples[1].walkPhase=.1;assert.equal(confirmedHistoricalParticipant(preview,'w',worker,'worker'),null);
});

test('stationary running pose is held only while its confirmed phase is unchanged',()=>{
 const worker={id:'w',profile:'youngMale',status:'walking',running:true,runPhase:.4,x:2,z:3},path={actorId:'w',continuous:true,timed:true,startStatus:'walking',endStatus:'walking',start:{at:5,x:2,z:3},end:{at:5.1,x:2,z:3},segments:[]},samples=[actorTickState(worker,5),actorTickState(worker,5.1)],preview={start:5,end:5.1,clockSegments:{start:5,end:5.1,complete:true,segments:[{realDuration:.1,rate:1}]},trace:{actors:[path],actorTickStates:{complete:true,actors:[{actorId:'w',samples}]}}};
 assert.equal(confirmedHistoricalParticipant(preview,'w',worker,'worker'),'stationary');samples[1].runPhase=.5;assert.equal(confirmedHistoricalParticipant(preview,'w',worker,'worker'),null);
});


for(const kind of ['harvest','crate'])test(`${kind} requires unchanged confirmed task and target and positive monotonic remaining time`,()=>{
 const worker={id:'w',profile:'youngMale',status:'acting',x:2,z:3,taskId:'t',actionRemaining:2},tasks=[{id:'t',kind,targetId:'plant-a'}],first=actorTickState(worker,5,tasks),last={...first,at:5.1,actionRemaining:1.9},path={actorId:'w',continuous:true,timed:true,startStatus:'acting',endStatus:'acting',start:{at:5,x:2,z:3},end:{at:5.1,x:2,z:3},segments:[]},preview={start:5,end:5.1,clockSegments:{start:5,end:5.1,complete:true,segments:[{realDuration:.1,rate:1}]},trace:{actors:[path],actorTickStates:{complete:true,actors:[{actorId:'w',samples:[first,last]}]}}};
 const check=()=>confirmedHistoricalParticipant(preview,'w',worker,'worker',tasks);assert.equal(check(),'stationary');
 last.actionTargetId='plant-b';assert.equal(check(),null);last.actionTargetId=first.actionTargetId;
 last.actionRemaining=0;assert.equal(check(),null);last.actionRemaining=2.1;assert.equal(check(),null);last.actionRemaining=1.9;
 last.taskId='other';assert.equal(check(),null);last.taskId='t';last.recoveryExiting=true;assert.equal(check(),null);last.recoveryExiting=false;
 tasks[0].kind='water';assert.equal(check(),null);tasks[0].kind=kind;worker.actionRemaining=1.9;assert.equal(check(),null);
});

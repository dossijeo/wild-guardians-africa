import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedHistoricalParticipant} from '../src/rendering/confirmed-historical-participant.js';
import {actorTickState} from '../src/simulation/worker-actor-tick-states.js';

test('stationary fallback is bounded in real time rather than accelerated simulation time',()=>{
 const worker={id:'w',profile:'youngMale',status:'idle',x:2,z:3,idleState:{mode:'rest',elapsed:0}},path={actorId:'w',continuous:true,timed:true,startStatus:'idle',endStatus:'idle',start:{at:5,x:2,z:3},end:{at:5.5,x:2,z:3},segments:[]},samples=[actorTickState(worker,5),actorTickState(worker,5.5)],preview={start:5,end:5.5,clockSegments:{start:5,end:5.5,complete:true,segments:[{realDuration:.1,rate:5}]},trace:{actors:[path],actorTickStates:{complete:true,actors:[{actorId:'w',samples}]}}};
 assert.equal(confirmedHistoricalParticipant(preview,'w',worker,'worker'),'stationary');preview.clockSegments.segments[0].realDuration=.101;assert.equal(confirmedHistoricalParticipant(preview,'w',worker,'worker'),null);preview.clockSegments.segments[0].realDuration=.1;samples[1].walkPhase=.1;assert.equal(confirmedHistoricalParticipant(preview,'w',worker,'worker'),null);
});

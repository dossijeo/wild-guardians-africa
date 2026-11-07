import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalFixedActor} from '../src/simulation/historical-fixed-actor.js';
import {certifyHistoricalSeparation} from '../src/simulation/worker-historical-separation.js';

test('an embedded stationary body remains in the pairwise safety test for passing actors',()=>{
 const fixed={actorId:'fixed',continuous:true,timed:true,radius:.5,start:{at:0,x:0,z:0},end:{at:1,x:0,z:0},startStatus:'waiting',endStatus:'waiting',segments:[]},moving={actorId:'moving',continuous:true,timed:true,radius:.5,start:{at:0,x:-2,z:0},end:{at:1,x:2,z:0},startStatus:'walking',endStatus:'walking',segments:[{t0:0,t1:1,x0:-2,z0:0,x1:2,z1:0}]},ticks={complete:true,actors:[{actorId:'fixed',samples:[{at:0,x:0,z:0},{at:1,x:0,z:0}]},{actorId:'moving',samples:[{at:0,x:-2,z:0},{at:1,x:2,z:0}]}]};assert.equal(historicalFixedActor(fixed,ticks,0,1),true);assert.equal(certifyHistoricalSeparation([fixed,moving],0,1,{tickStates:ticks}),false);ticks.actors[0].samples[1].x=.01;assert.equal(historicalFixedActor(fixed,ticks,0,1),false);ticks.complete=false;assert.equal(historicalFixedActor(fixed,ticks,0,1),false);
});

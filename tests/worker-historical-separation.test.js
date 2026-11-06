import test from 'node:test';
import assert from 'node:assert/strict';
import {certifyHistoricalSeparation as certify} from '../src/simulation/worker-historical-separation.js';
function actor(actorId,x0,z0,x1,z1,radius=.2){return {actorId,radius,continuous:true,timed:true,start:{at:0,x:x0,z:z0},end:{at:1,x:x1,z:z1},segments:[{t0:0,t1:1,x0,z0,x1,z1}]};}
test('continuous body separation rejects crossing trajectories and stationary bodies',()=>{
 assert.equal(certify([actor('a',-1,0,1,0),actor('b',0,-1,0,1)],0,1),false);
 assert.equal(certify([actor('a',-1,0,1,0),actor('b',0,0,0,0)],0,1),false);
 assert.equal(certify([actor('a',-1,0,1,0),actor('b',0,1,0,1)],0,1),true);
});
test('rejects discontinuous, untimed and over-budget traces',()=>{
 const a=actor('a',0,0,1,0),b=actor('b',0,2,1,2);a.segments[0].x0=2;assert.equal(certify([a,b],0,1),false);a.segments[0].x0=0;a.timed=false;assert.equal(certify([a,b],0,1),false);a.timed=true;assert.equal(certify([a,b],0,1,{maxComparisons:0}),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {certifyHistoricalSeparation as certify} from '../src/simulation/worker-historical-separation.js';
function actor(actorId,x0,z0,x1,z1,radius=.2){return {actorId,radius,continuous:true,timed:true,start:{at:0,x:x0,z:z0},end:{at:1,x:x1,z:z1},segments:[{t0:0,t1:1,x0,z0,x1,z1}]};}
test('continuous body separation rejects crossing trajectories and stationary bodies',()=>{
 assert.equal(certify([actor('a',-1,0,1,0),actor('b',0,-1,0,1)],0,1),false);
 assert.equal(certify([actor('a',-1,0,1,0),actor('b',0,0,0,0)],0,1),false);
 assert.equal(certify([actor('a',-1,0,1,0),actor('b',0,1,0,1)],0,1),true);
});
test('existing overlaps may escape only by continuous separation and without re-entry',()=>{
 const options={allowExistingSeparation:true};
 assert.equal(certify([actor('a',0,0,-.3,0),actor('b',.2,0,.5,0)],0,1),false);
 assert.equal(certify([actor('a',0,0,-.3,0),actor('b',.2,0,.5,0)],0,1,options),true);
 assert.equal(certify([actor('a',0,0,0,0),actor('b',.2,0,.2,0)],0,1,options),false);
 assert.equal(certify([actor('a',0,0,.3,0),actor('b',.2,0,-.3,0)],0,1,options),false);
 assert.equal(certify([actor('a',-1,0,1,0),actor('b',0,0,0,0)],0,1,options),false);
 const a=actor('a',0,0,0,0),b=actor('b',.2,0,.3,0);b.segments=[{t0:0,t1:.5,x0:.2,z0:0,x1:.6,z1:0},{t0:.5,t1:1,x0:.6,z0:0,x1:.3,z1:0}];assert.equal(certify([a,b],0,1,options),false);
});
test('rejects discontinuous, untimed and over-budget traces',()=>{
 const a=actor('a',0,0,1,0),b=actor('b',0,2,1,2);a.segments[0].x0=2;assert.equal(certify([a,b],0,1),false);a.segments[0].x0=0;a.timed=false;assert.equal(certify([a,b],0,1),false);a.timed=true;assert.equal(certify([a,b],0,1,{maxComparisons:0}),false);
});
test('visual paths must match the authority at every recorded tick',()=>{
 const a=actor('a',0,0,1,0),tickStates={complete:true,actors:[{actorId:'a',samples:[{at:0,x:0,z:0},{at:.5,x:.5,z:0},{at:1,x:1,z:0}]}]};assert.equal(certify([a],0,1,{tickStates}),true);tickStates.actors[0].samples[1].z=.1;assert.equal(certify([a],0,1,{tickStates}),false);tickStates.actors[0].samples[1].z=0;tickStates.complete=false;assert.equal(certify([a],0,1,{tickStates}),false);
});

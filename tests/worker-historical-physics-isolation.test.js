import test from 'node:test';
import assert from 'node:assert/strict';
import {certifyHistoricalPhysicsIsolation} from '../src/simulation/worker-historical-physics-isolation.js';
import {historicalPhysicalActorIds} from '../src/simulation/worker-historical-physics-isolation.js';

test('multiple bodies require disjoint whole-interval envelopes and stable identities',()=>{
 const actors=[{actorId:'a'},{actorId:'b'}],frame=at=>({at,poses:actors.map(a=>({...a})),bounds:[{actorId:'a',minX:-1,maxX:1,minZ:-1,maxZ:1},{actorId:'b',minX:4,maxX:6,minZ:-1,maxZ:1}]}),samples={complete:true,samples:[frame(0),frame(1)]},trace={start:0,end:1,actors,physicsPoseSamples:samples,physicalIsolationEvidence:{version:2,start:0,end:1,actors:2,actorIds:['a','b']}};
 assert.equal(certifyHistoricalPhysicsIsolation(actors,samples,0,1),true);assert.deepEqual(historicalPhysicalActorIds(trace),['a','b']);
 samples.samples[1].bounds[1].minX=1;assert.equal(certifyHistoricalPhysicsIsolation(actors,samples,0,1),false);samples.samples[1].bounds[1].minX=4;
 const walker={actorId:'w',continuous:true,timed:true,radius:.3,start:{x:4,z:-3},end:{x:4,z:3},segments:[{x0:4,z0:-3,x1:4,z1:3}]};assert.equal(certifyHistoricalPhysicsIsolation([...actors,walker],samples,0,1),false);
 samples.samples[1].poses.pop();assert.equal(certifyHistoricalPhysicsIsolation(actors,samples,0,1),false);trace.physicalIsolationEvidence.actorIds=['a','a'];assert.deepEqual(historicalPhysicalActorIds(trace),[]);
});

test('only an isolated single ragdoll with a clear complete path of other actors is certified',()=>{
 const physical={actorId:'a',startStatus:'entering',endStatus:'entering'},other={actorId:'b',startStatus:'walking',endStatus:'walking',continuous:true,timed:true,radius:.5,start:{x:3,z:-2},end:{x:3,z:2},segments:[{x0:3,z0:-2,x1:3,z1:2}]},frame=at=>({at,poses:[{actorId:'a'}],bounds:[{actorId:'a',minX:-1,maxX:1,minZ:-1,maxZ:1}]}),samples={complete:true,samples:[frame(1),frame(2)]};assert.equal(certifyHistoricalPhysicsIsolation([physical,other],samples,1,2),true);
 other.start.x=other.end.x=other.segments[0].x0=other.segments[0].x1=1.5;assert.equal(certifyHistoricalPhysicsIsolation([physical,other],samples,1,2),false);other.start.x=other.end.x=other.segments[0].x0=other.segments[0].x1=3;samples.samples[1].bounds[0].maxX=3;assert.equal(certifyHistoricalPhysicsIsolation([physical,other],samples,1,2),false);samples.samples[1].bounds[0].maxX=1;samples.samples[1].poses.push({actorId:'c'});assert.equal(certifyHistoricalPhysicsIsolation([physical,other],samples,1,2),false);
});

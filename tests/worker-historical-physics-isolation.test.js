import test from 'node:test';
import assert from 'node:assert/strict';
import {certifyHistoricalPhysicsIsolation} from '../src/simulation/worker-historical-physics-isolation.js';

test('only an isolated single ragdoll with a clear complete path of other actors is certified',()=>{
 const physical={actorId:'a',startStatus:'entering',endStatus:'entering'},other={actorId:'b',startStatus:'walking',endStatus:'walking',continuous:true,timed:true,radius:.5,start:{x:3,z:-2},end:{x:3,z:2},segments:[{x0:3,z0:-2,x1:3,z1:2}]},frame=at=>({at,poses:[{actorId:'a'}],bounds:[{actorId:'a',minX:-1,maxX:1,minZ:-1,maxZ:1}]}),samples={complete:true,samples:[frame(1),frame(2)]};assert.equal(certifyHistoricalPhysicsIsolation([physical,other],samples,1,2),true);
 other.start.x=other.end.x=other.segments[0].x0=other.segments[0].x1=1.5;assert.equal(certifyHistoricalPhysicsIsolation([physical,other],samples,1,2),false);other.start.x=other.end.x=other.segments[0].x0=other.segments[0].x1=3;samples.samples[1].bounds[0].maxX=3;assert.equal(certifyHistoricalPhysicsIsolation([physical,other],samples,1,2),false);samples.samples[1].bounds[0].maxX=1;samples.samples[1].poses.push({actorId:'c'});assert.equal(certifyHistoricalPhysicsIsolation([physical,other],samples,1,2),false);
});

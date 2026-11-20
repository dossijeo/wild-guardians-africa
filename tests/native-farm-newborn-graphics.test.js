import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeFarmIdleApproachGraphicsFixture} from './helpers/native-farm-idle-approach-graphics.js';
import {nativeFarmArrivedHomeGraphicsFixture} from './helpers/native-farm-arrived-home-graphics.js';
import {nativeFarmArrivedTaskGraphicsFixture} from './helpers/native-farm-arrived-task-graphics.js';
import {nativeFarmArrivedIdleCycleGraphicsFixture} from './helpers/native-farm-arrived-idle-cycle-graphics.js';

const families=[['Stroll',nativeFarmIdleApproachGraphicsFixture,'prepareNativeIdleStrollProposal'],['Home',nativeFarmArrivedHomeGraphicsFixture,'prepareNativeHomeRouteProposal'],['Task',nativeFarmArrivedTaskGraphicsFixture,'prepareNativeTaskStartProposal'],['Idle',nativeFarmArrivedIdleCycleGraphicsFixture,'prepareNativeIdleCycleProposal']];
for(const [family,fixture,method]of families)for(const profile of PROFILES)test(`${profile.id} completed native Farm admits ${family} without a legacy JS path cache`,async()=>{
 const f=await fixture({profile:profile.id});let part;try{
  const actor=f.roster.get(f.actor),body=f.body(1);delete f.state.workers[0].taskApproach;delete f.state.workers[0].pathVersion;f.roster.sync();
  part=await f.roster[method](f.support,{getPickTime:f.getPickTime,getPickAge:f.getPickAge});assert(part.valid());part.activate();part.rollback();assert(part.valid());assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
for(const [family,fixture,method]of families)for(const [field,value]of [['taskApproach',{taskId:'task-9999'}],['pathVersion',NaN]])test(`native Farm ${family} still rejects an actual ${field} conflict`,async()=>{
 const f=await fixture();try{f.state.workers[0][field]=value;f.roster.sync();await assert.rejects(f.roster[method](f.support,{getPickTime:f.getPickTime,getPickAge:f.getPickAge}),/source|pending worker/);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);}finally{f.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldScene} from '../src/rendering/scene.js';

test('saved active raid reserves every remaining animal, ignoring its already consumed night plan',async()=>{
 const world=Object.create(WorldScene.prototype);let group;
 world.animalPreload={reserveGroup:async value=>{group=value;return true;}};
 const state={nightPlan:{done:true,group:['lion']},raid:{animals:[{species:'hyena',status:'attacking'},{species:'hyena',status:'leaving'},{species:'rhino',status:'gone'}]}};
 const before=JSON.stringify(state);assert.equal(await world.prepareSavedAnimalRigs(state),true);
 assert.deepEqual(group,['hyena','hyena']);assert.equal(JSON.stringify(state),before);
 state.raid=null;state.nightPlan.done=false;await world.prepareSavedAnimalRigs(state);assert.deepEqual(group,['lion']);
 state.nightPlan.done=true;await world.prepareSavedAnimalRigs(state);assert.deepEqual(group,[]);
});

test('saved actor readiness waits for its model and skips gone animals',async()=>{
 const world=Object.create(WorldScene.prototype);let finish;
 world.state={raid:{animals:[{id:'a',status:'attacking'},{id:'gone',status:'gone'}]}};
 world.mixers=new Map();world.objects=new Map([['a',{userData:{actorReady:new Promise(resolve=>finish=()=>{world.mixers.set('a',{});resolve();})}}]]);
 let ready=false;const pending=world.loadedAnimalActors().then(()=>ready=true);await Promise.resolve();assert.equal(ready,false);finish();await pending;assert.equal(ready,true);
});

test('saved actor errors and cancellation prevent world readiness',async()=>{
 for(const cancelled of [false,true]){
  const world=Object.create(WorldScene.prototype);world.state={raid:{animals:[{id:'a',status:'entering'}]}};world.mixers=new Map();
  let finish;world.objects=new Map([['a',{userData:{actorReady:new Promise((resolve,reject)=>finish=()=>cancelled?resolve():reject(Error('model failed')))}}]]);
  const pending=world.loadedAnimalActors();world.disposed=cancelled;finish();await assert.rejects(pending,cancelled?/cancelada/:/model failed/);
 }
});

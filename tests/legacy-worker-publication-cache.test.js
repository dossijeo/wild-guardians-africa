import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyWorkersForFrame} from '../src/rendering/legacy-worker-publication-cache.js';

test('tracked workers are visited on publication, not on each graphics frame',()=>{
 let checks=0;const workers=Array.from({length:100},(_,i)=>({id:String(i),status:'walking'})),objects=new Map(workers.map(w=>[w.id,{}])),world={objects,trackedWorkerVisualYaw(){checks++;return 0;}};
 const first=legacyWorkersForFrame(world,workers,true);assert.equal(checks,100);assert.equal(first.update.length,0);assert.equal(first.retained.size,100);assert.equal(first.cleanup.size,0);for(let i=0;i<120;i++)assert.equal(legacyWorkersForFrame(world,workers,true),first);assert.equal(checks,100);
 workers[0].status='home';world.legacyActorRevision=1;const next=legacyWorkersForFrame(world,workers,true);assert.equal(next.retained.size,99);assert.equal(checks,199);assert.equal(legacyWorkersForFrame(world,workers,false).update.length,99);
});

test('unadopted actors stay on the legacy path until a rig lifecycle invalidation',()=>{
 const worker={id:'w',status:'walking'},root={},world={objects:new Map([['w',root]]),ready:false,trackedWorkerVisualYaw(){return this.ready?1:undefined;}};assert.deepEqual(legacyWorkersForFrame(world,[worker],true).update,[worker]);world.ready=true;world.legacyActorRevision=1;assert.equal(legacyWorkersForFrame(world,[worker],true).retained.has('w'),true);world.ready=false;world.legacyActorRevision=2;assert.deepEqual(legacyWorkersForFrame(world,[worker],true).update,[worker]);
});

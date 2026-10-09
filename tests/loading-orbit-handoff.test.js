import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';
import {LoadingDiorama} from '../src/rendering/loading-diorama.js';
import {LoadingOrbit} from '../src/rendering/loading-orbit.js';
function fixture(){const d=Object.create(LoadingDiorama.prototype);Object.assign(d,{world:{disposed:false},abort:new AbortController(),camera:new PerspectiveCamera(),plants:{stopPlanting(){this.stopped=true;}},orbit:new LoadingOrbit(),interactive:true});for(let i=0;i<180;i++)d.orbit.step(1/60);return d;}
test('handoff waits for actual orbit deceleration and retains the final angle without recentering',async()=>{const d=fixture(),before=d.orbit.angle;let frames=0;await d.freezeForCinematic({nextFrame:async()=>{frames++;d.camera.position.x=d.orbit.step(1/60);}});assert.ok(frames>0);assert.equal(d.orbit.settled,true);assert.equal(d.interactive,false);assert.equal(d.plants.stopped,true);assert.ok(d.orbit.angle>=before);assert.equal(d.camera.position.x,d.orbit.angle);assert.equal(d.camera.matrixWorld.elements[12],d.camera.position.x);});
test('owner cancellation aborts handoff without recentering or enabling interaction',async()=>{const d=fixture(),angle=d.orbit.angle;await assert.rejects(d.freezeForCinematic({nextFrame:async()=>{d.abort.abort();}}),/cancelled/);assert.equal(d.orbit.angle,angle);assert.equal(d.interactive,false);});
test('reduced motion captures its static pose without waiting for animation',async()=>{const d=fixture();d.orbit.setReducedMotion(true);await d.freezeForCinematic({nextFrame:async()=>{throw Error('must not wait');}});assert.equal(d.orbit.settled,true);});


test('suspended orbit frame cancels immediately through its actual owner',async()=>{
 const d=fixture(),angle=d.orbit.angle;let entered;const started=new Promise(resolve=>entered=resolve);
 const pending=d.freezeForCinematic({nextFrame:()=>{entered();return new Promise(()=>{});}});await started;d.abort.abort();await assert.rejects(pending,/cancelled/);assert.equal(d.orbit.angle,angle);assert.equal(d.interactive,false);
});
test('suspended orbit frame cannot leave completion waiting indefinitely',async()=>{
 const d=fixture();await assert.rejects(d.freezeForCinematic({timeout:5,nextFrame:()=>new Promise(()=>{})}),/timed out/);assert.equal(d.interactive,false);assert.equal(d.orbit.settled,false);
});

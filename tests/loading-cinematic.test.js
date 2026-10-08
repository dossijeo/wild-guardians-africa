import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LoadingCinematic} from '../src/rendering/loading-cinematic.js';
function fixture(){const camera=new THREE.PerspectiveCamera(42,1,.1,500);camera.position.set(8,7.5,10);const target=new THREE.Vector3(0,.18,0);camera.lookAt(target);const calls=[],world={camera,controls:{target,enabled:false},nav:{field:{surface:()=>0}},objects:new Map(),state:{villages:[],structures:[],plants:[{id:'real-crop'}]},render(){calls.push('world');}},diorama={camera:camera.clone(),stopPlanting(){this.stopped=true;},render(dt,progress,options){calls.push(options.skyOnly?'sky':'diorama');}};return {world,diorama,calls};}

test('loading audio handoff fires once before the first world presentation',async()=>{
 const {world,diorama,calls}=fixture(),cinema=new LoadingCinematic(world,diorama,{onHandoff:()=>calls.push('handoff')});cinema.step(.8);assert.equal(calls.includes('handoff'),false);cinema.step(.4);assert.deepEqual(calls.slice(-2),['handoff','world']);cinema.step(.3);assert.equal(calls.filter(c=>c==='handoff').length,1);cinema.cancel();
});
test('camera sky handoff and travel preserve exact gameplay pose and simulation state',async()=>{
 const {world,diorama,calls}=fixture(),before=JSON.stringify(world.state),eye=world.camera.position.toArray(),q=world.camera.quaternion.toArray(),target=world.controls.target.toArray(),cinema=new LoadingCinematic(world,diorama);
 cinema.step(.35);assert.equal(calls.at(-1),'diorama');cinema.step(.4);assert.equal(calls.at(-1),'sky');assert.deepEqual(world.camera.quaternion.toArray(),diorama.camera.quaternion.toArray());cinema.step(.7);assert.equal(calls.at(-1),'world');cinema.step(3);await cinema.finished;
 assert.deepEqual(world.camera.position.toArray(),eye);assert.deepEqual(world.camera.quaternion.toArray(),q);assert.deepEqual(world.controls.target.toArray(),target);assert.equal(world.cinematic,false);assert.equal(JSON.stringify(world.state),before);assert.ok(diorama.stopped);
});
test('reduced motion completes with the same exact final pose',async()=>{const {world,diorama}=fixture(),eye=world.camera.position.clone(),cinema=new LoadingCinematic(world,diorama,{reducedMotion:true});cinema.step(.5);await cinema.finished;assert.deepEqual(world.camera.position,eye);assert.equal(cinema.done,true);});
test('cancelled cinematic restores the camera and rejects completion',async()=>{const {world,diorama}=fixture(),eye=world.camera.position.clone(),cinema=new LoadingCinematic(world,diorama);cinema.step(.8);cinema.cancel();await assert.rejects(cinema.finished,/cancelled/);assert.deepEqual(world.camera.position,eye);assert.equal(world.cinematic,false);});

test('reveal prewarm does not start transition or change final camera',async()=>{const {world,diorama,calls}=fixture(),eye=world.camera.position.toArray(),cinema=new LoadingCinematic(world,diorama,{autoStart:false});await cinema.prepare({nextFrame:async()=>{},afterRender:()=>calls.push('cover')});assert.equal(cinema.time,0);assert.deepEqual(world.camera.position.toArray(),eye);cinema.step(3);assert.equal(cinema.time,0);assert.deepEqual(calls,['world','cover','world','cover']);cinema.start();cinema.step(5);await cinema.finished;assert.deepEqual(world.camera.position.toArray(),eye);});

test('cinematic rejects a moving orbit before capturing presentation pose',()=>{const {world,diorama}=fixture();diorama.orbit={settled:false};assert.throws(()=>new LoadingCinematic(world,diorama),/must settle/);assert.equal(world.cinematic,undefined);diorama.orbit.settled=true;const cinema=new LoadingCinematic(world,diorama);assert.deepEqual(cinema.loadingEye,diorama.camera.position);cinema.cancel();});


test('cancel during a suspended reveal frame restores exact camera without a later draw',async()=>{
 const {world,diorama,calls}=fixture(),eye=world.camera.position.toArray(),cinema=new LoadingCinematic(world,diorama,{autoStart:false});let entered;const started=new Promise(resolve=>entered=resolve);
 const preparation=cinema.prepare({nextFrame:()=>{entered();return new Promise(()=>{});}});await started;cinema.cancel();await assert.rejects(preparation,/cancelled/);assert.deepEqual(world.camera.position.toArray(),eye);assert.equal(world.cinematic,false);assert.deepEqual(calls,['world']);
});
test('never-resumed reveal frame fails its deadline and restores intended camera',async()=>{
 const {world,diorama,calls}=fixture(),eye=world.camera.position.toArray(),cinema=new LoadingCinematic(world,diorama,{autoStart:false});
 await assert.rejects(cinema.prepare({timeout:5,nextFrame:()=>new Promise(()=>{})}),/timed out/);assert.deepEqual(world.camera.position.toArray(),eye);assert.deepEqual(calls,['world']);assert.equal(world.cinematic,false);cinema.cancel();
});

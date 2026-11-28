import test from 'node:test';
import assert from 'node:assert/strict';
import {provisionalGuardianOrigin,provisionalAwakeningSelection} from '../src/app/provisional-guardian-origin.js';
import {dispatchPickedSpell} from '../src/app/spell-placement.js';
import {createWebGpuGuardianAttack} from '../src/rendering/webgpu-guardian-attack.js';
import * as THREE from 'three';

test('provisional origin is finite, faces the camera and needs valid visual input',()=>{
 assert.deepEqual(provisionalGuardianOrigin([0,9,10],{x:0,y:1,z:0}),{x:0,y:2.7,z:3});
 assert.deepEqual(provisionalGuardianOrigin([0,9,0],{x:0,y:1,z:0}),{x:3,y:2.7,z:0});
 assert.equal(provisionalGuardianOrigin(null,{x:0,y:1,z:0}),null);
 assert.equal(provisionalGuardianOrigin([0,9,10],{x:0,y:NaN,z:0}),null);
});

test('attack feedback starts with a visual origin before the authoritative rejection and is removed afterwards',async()=>{
 const state={elapsed:0,events:[],plants:[],raid:{animals:[{id:'animal',x:1,z:2,status:'walking'}]}},contact={x:1,y:1,z:2},visual=createWebGpuGuardianAttack({scene:new THREE.Scene(),state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>100,loadModel:()=>new Promise(()=>{})});let settle;
 const promise=dispatchPickedSpell(state,'cast','attack',{entityId:'animal',hitPoint:contact,origin:()=>provisionalGuardianOrigin([3,5,8],contact)},null,{submit:()=>new Promise(resolve=>settle=resolve)},{begin:command=>assert.equal(visual.begin(command),true),reject:id=>visual.resolve(id,false)});
 visual.tick();assert.equal(visual.status().provisionalFrames,1);assert.equal(visual.status().active?.id,'cast');settle({value:false,rejection:'stale'});await assert.rejects(promise,/stale/);assert.equal(visual.status().active,null);visual.dispose();
});

test('provisional awakening uses copied visual coordinates and never changes the target',()=>{
 const target={id:'crop',x:1,z:2,alive:true},state={elapsed:0,events:[],plants:[target],structures:[],raid:null},contact={x:1,y:2,z:2},selection=provisionalAwakeningSelection([3,5,8],contact);
 assert.ok(selection);contact.y=99;assert.equal(selection.contact.y,2);assert.equal(provisionalAwakeningSelection([0,0,0],null),null);
 const visual=createWebGpuGuardianAttack({scene:new THREE.Scene(),state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>100,loadModel:()=>new Promise(()=>{})});
 try{assert.equal(visual.beginAwakening({kind:'bless',id:'blessing',targetId:'crop',selection}),true);visual.tick();assert.equal(visual.status().active?.provisional,true);assert.equal(target.blessing,undefined);visual.resolve('blessing',false);assert.equal(visual.status().active,null);assert.equal(target.blessing,undefined);}finally{visual.dispose();}
});

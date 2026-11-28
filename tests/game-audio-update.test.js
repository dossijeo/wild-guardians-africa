import test from 'node:test';
import assert from 'node:assert/strict';
import {updateGameAudio} from '../src/app/game-audio-update.js';

test('both presentation paths consume confirmed audio without replaying event history',()=>{
 const calls=[],audio=Object.fromEntries(['process','updateMusic','updateUnlocks','updateAmbient','updateFarmActors','updateAnimals','updateMovement'].map(name=>[name,(...args)=>calls.push([name,...args])]));
 const events=[{id:'e1'}],emptyEvents=Object.freeze([]),state={events},listener={x:3,z:5},world={controls:{target:listener},workerRuntime:{confirmedEventDelivery:true}},nav={version:7,field:{wetland:true,waterInfo:(x,z)=>({inside:x===3&&z===5})}};
 updateGameAudio({audio,state,world,nav,emptyEvents});assert.equal(calls[0][1],events);assert.equal(world.confirmedEventsSeeded,true);const ambient=calls.find(call=>call[0]==='updateAmbient')[2];assert.equal(ambient.listener,listener);assert.equal(ambient.waterRevision,7);assert.deepEqual(ambient.waterAt(3,5),{inside:true,active:true});
 calls.length=0;updateGameAudio({audio,state,world,nav,emptyEvents});assert.equal(calls[0][1],emptyEvents);assert.deepEqual(calls.map(call=>call[0]),['process','updateMusic','updateUnlocks','updateAmbient','updateFarmActors','updateAnimals','updateMovement']);
});

test('early presentation may omit legacy terrain meshes and their surface callback',()=>{
 const calls=[],audio=Object.fromEntries(['process','updateMusic','updateUnlocks','updateAmbient','updateFarmActors','updateAnimals','updateMovement'].map(name=>[name,(...args)=>calls.push([name,...args])]));
 const world={controls:{target:{x:0,z:0}}},state={events:[]};updateGameAudio({audio,state,world,nav:{},emptyEvents:[]});
 assert.equal(calls.find(call=>call[0]==='updateAmbient')[2].waterAt,undefined);assert.equal(calls.find(call=>call[0]==='updateMovement')[2].surfaceAt,undefined);
});

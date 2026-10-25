import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import {WorldScene} from '../src/rendering/scene.js';
test('actor witness measures only native adoption after asset readiness without changing clone ownership',async()=>{const source=new Group(),geometry=new BoxGeometry(),material=new MeshStandardMaterial();source.add(new Mesh(geometry,material));const root=new Group(),entity={id:'w',profile:'olderMale'},state={},rows=[];let posed=0;const world={state,objects:new Map([['w',root]]),mixers:new Map(),workerLibraries:{olderMale:{url:'native'}},assets:{model:async()=>({scene:source,animations:[]})},onLoadingSpan:row=>rows.push(row),updateActor:()=>{posed++;}};await WorldScene.prototype.actor.call(world,entity,'worker');assert.equal(rows.length,1);assert.equal(rows[0].label,'actor-prepare:worker:olderMale');assert.equal(rows[0].failed,false);assert.equal(posed,1);assert.equal(root.children.length,1);assert.notEqual(root.children[0],source);assert.equal(source.parent,null);assert.equal(world.mixers.get('w').model,root.children[0]);assert.equal(root.children[0].children[0].geometry,geometry);assert.equal(root.children[0].children[0].material,material);geometry.dispose();material.dispose();});


test('saved workers at home require no visible rig, while active workers still await adoption',async()=>{
 const mixers=new Map(),objects=new Map();let awaited=0;
 objects.set('active',{userData:{actorReady:Promise.resolve().then(()=>mixers.set('active',{}))}});
 const world={state:{workers:[{id:'home',status:'home'},{id:'active',status:'idle'}]},mixers,objects,loadReady:async ready=>{awaited++;await ready;}};
 await WorldScene.prototype.loadedWorkerActors.call(world);
 assert.equal(awaited,1);assert.equal(mixers.has('home'),false);
 world.state.workers.push({id:'missing',status:'idle'});
 await assert.rejects(WorldScene.prototype.loadedWorkerActors.call(world),/Trabajador guardado sin modelo: missing/);
});

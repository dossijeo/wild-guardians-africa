import test from 'node:test';import assert from 'node:assert/strict';import {actorGeometry} from './helpers/actor-geometry.js';import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';import {captureSurfacePose,replaySurfacePose} from './browser/guardian-surface-pose.js';import {Group} from 'three';
test('real rhino pose replays exact full-skin floor minimum after animation and parent transforms change',async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals.rhino.url,import.meta.url));const parent=new Group();parent.position.set(80,2,-8);parent.rotation.y=.4;parent.add(model);model.rotation.z=.12;
 const bones=[];model.traverse(n=>{if(n.isBone)bones.push(n);});bones[3].rotation.x+=.3;
 const captured=captureSurfacePose(model,(x,z)=>.05*x-.03*z),copy=JSON.parse(JSON.stringify(captured));parent.remove(model);for(const b of bones)b.rotation.y+=.2;model.position.set(0,0,0);
 const replay=replaySurfacePose(model,copy);assert.ok(Math.abs(replay.minimum-captured.minimum)<1e-8,JSON.stringify({replay:replay.minimum,captured:captured.minimum}));assert.ok(replay.witness);assert.ok(captured.meshes.every(m=>m.floors.length>0));
 const altered=structuredClone(copy);altered.nodes[1].name+='wrong';assert.throws(()=>replaySurfacePose(model,altered),/mismatch/);
});

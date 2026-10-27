import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,DirectionalLight,Vector3} from 'three';
import {WorldScene} from '../src/rendering/scene.js';

test('a worker at the village releases its visual rig and can be rendered again after reassignment',()=>{
 const worker={id:'worker-1',profile:'olderFemale',status:'home',x:0,z:0};
 const state={villages:[],structures:[],plants:[],crates:[],workers:[worker],
  spells:[],raid:null,elapsed:0,time:100};
 const root=new Group(),scene=new Scene();scene.add(root);
 let stopped=0,uncached=0;
 const rig={model:new Group(),mixer:{stopAllAction(){stopped++;},uncacheRoot(){uncached++;}}};
 const requested=[];
 const world={state,cropModels:[],cropBatch:{capacity:128,update(){}},
  controls:{target:new Vector3()},objects:new Map([[worker.id,root]]),
  scene,mixers:new Map([[worker.id,rig]]),
  nav:{field:{surface:()=>0},actorSurface:()=>0},
  pack:{profile:{bg:'#aaaaaa'}},renderer:{setClearColor(){}},
  destructionPass:{},sun:new DirectionalLight(),ambient:{},
  prepareUpcomingAnimalRigs(){},requestActor(entity){requested.push(entity.id);},
  updateActor(){}};

 WorldScene.prototype.sync.call(world,0);
 assert.equal(world.objects.has(worker.id),false);
 assert.equal(world.mixers.has(worker.id),false);
 assert.equal(root.parent,null);
 assert.equal(stopped,1);assert.equal(uncached,1);
 assert.equal(state.workers[0],worker,'the recoverable contract remains in the game');

 worker.status='arriving';
 WorldScene.prototype.sync.call(world,0);
 assert.equal(world.objects.has(worker.id),true);
 assert.deepEqual(requested,[worker.id]);
});

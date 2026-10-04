import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Group,Matrix4,Vector3} from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {createWateringEmitter} from '../src/rendering/watering-emitter.js';
const paths=JSON.parse(readFileSync('public/content/watering-emitters.json'));

test('Prepared nozzle paths preserve world position and direction across actor/effect transforms without scanning workers',()=>{
  for(const [profile,data] of Object.entries(paths.profiles))for(const yaw of [-1.2,0,2.7])for(const fraction of [.15,.25,.45]){
    const root=new Group(),effect=new Group(),sample=createWateringEmitter(data);root.position.set(1034,45.2,-2118);root.rotation.y=yaw;effect.position.set(1032,44.7,-2117);effect.rotation.y=yaw+.6;effect.surfaceInverse=new Matrix4();
    const world={mixers:new Map([['worker',{profile}]]),objects:new Map([['worker',root]]),wateringEmitters:new Map([[profile,sample]]),waterMouth:new Vector3(),waterDirection:new Vector3(),state:{get workers(){throw Error('Should not scan worker population for every droplet');}}};
    const source=WorldScene.prototype.wateringSource.call(world,'worker',fraction*4.3,effect),actual=new Vector3(),direction=new Vector3();sample(fraction,actual,direction);root.localToWorld(actual);direction.transformDirection(root.matrixWorld);
    const rendered=new Vector3().fromArray(source.position);effect.localToWorld(rendered);assert.ok(rendered.distanceTo(actual)<1e-9);
    const outward=new Vector3().fromArray(source.direction).transformDirection(effect.matrixWorld);assert.ok(outward.distanceTo(direction)<1e-9);
  }
});

test('Missing actor, profile or effect does not substitute a demonstration water source',()=>{
  const world={mixers:new Map(),objects:new Map(),wateringEmitters:new Map()};assert.equal(WorldScene.prototype.wateringSource.call(world,'missing',1,new Group()),null);
  world.mixers.set('worker',{profile:'unknown'});world.objects.set('worker',new Group());assert.equal(WorldScene.prototype.wateringSource.call(world,'worker',1,new Group()),null);
  world.mixers.set('worker',{profile:'olderMale'});world.wateringEmitters.set('olderMale',createWateringEmitter(paths.profiles.olderMale));assert.equal(WorldScene.prototype.wateringSource.call(world,'worker',1,null),null);
});

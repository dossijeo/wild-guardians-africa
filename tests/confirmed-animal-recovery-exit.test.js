import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedAnimalPoses} from '../src/rendering/confirmed-animal-poses.js';

const transform=x=>[x,0,0,0,0,0,1,1,1,1];
const transition={actorId:'a',active:true,visualTransition:'recovery-exit',root:transform(1),model:transform(0),bones:[{name:'Hips',transform:transform(.5)}]};

test('only a current standing actor may own a confirmed recovery exit',()=>{
 const message={physicsPose:transition},snapshot={raid:{animals:[{id:'a',status:'walking'}]}};
 assert.equal(confirmedAnimalPoses(message,snapshot).get('a'),transition);
 for(const [pose,state] of [
  [transition,{raid:{animals:[]}}],
  [transition,{raid:{animals:[{id:'a',status:'gone'}]}}],
  [transition,{raid:{animals:[{id:'a',status:'walking',magicDown:{phase:'falling'}}]}}],
  [{...transition,active:false},snapshot],
  [{...transition,visualTransition:'unknown'},snapshot],
  [{...transition,actorId:'other'},snapshot],
 ])assert.throws(()=>confirmedAnimalPoses({physicsPose:pose},state));
 assert.throws(()=>confirmedAnimalPoses({physicsPose:{...transition,visualTransition:undefined}},snapshot),/lacks active animal/);
});

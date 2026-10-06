import test from 'node:test';
import assert from 'node:assert/strict';
import {focusNewTutorialPlacement} from '../src/rendering/tutorial-placement-focus.js';
import {WorldScene} from '../src/rendering/scene.js';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';

test('a tool chosen during the introduction is focused when its actionable hand first appears',()=>{
 const state=Game.newGame({seed:712});state.villages[0].center={x:83,z:0};
 const nav={field:{surface:()=>11},placement:()=>({valid:true}),path:(_a,b)=>[b]},calls=[];
 const world={state,nav,renderer:{domElement:{clientHeight:390}},tutorialToolKind:'center',focus:p=>calls.push(p),tutorialGuideTarget:WorldScene.prototype.tutorialGuideTarget,hands:{show(){},update(){}} ,handColliders:()=>[]};
 assert.equal(WorldScene.prototype.focusTutorialPlacement.call(world,'center'),null);assert.equal(calls.length,0);
 state.tutorial.step='center';const before=serialize(state);
 WorldScene.prototype.updateHands.call(world,.016);assert.deepEqual(calls,[{x:83,z:0}]);assert.equal(serialize(state),before);
 for(let i=0;i<100;i++)WorldScene.prototype.updateHands.call(world,.016);
 assert.equal(calls.length,1,'subsequent frames must preserve manual camera movement');
 world.tutorialHandsEnabled=false;WorldScene.prototype.updateHands.call(world,.016);
 world.tutorialHandsEnabled=true;WorldScene.prototype.updateHands.call(world,.016);assert.equal(calls.length,1,'panel visibility does not repeatedly recenter');
});

test('new targets and new worlds focus independently, and explicit tool selection can refocus',()=>{
 const calls=[],world={focus:p=>calls.push(p)},center={target:'center-site',position:[83,11,0]},plant={target:'plant-site',position:[85.5,11,1.5]};
 assert.equal(focusNewTutorialPlacement(world,null),false);
 assert.ok(focusNewTutorialPlacement(world,center));assert.equal(focusNewTutorialPlacement(world,{...center,position:[...center.position]}),false);
 assert.ok(focusNewTutorialPlacement(world,plant));assert.deepEqual(calls.at(-1),{x:85.5,z:1.5});
 assert.ok(focusNewTutorialPlacement(world,plant,true));assert.equal(calls.length,3);
 const next={focus:p=>calls.push(p)};assert.ok(focusNewTutorialPlacement(next,center));assert.equal(calls.length,4);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {handVisualScale} from '../src/rendering/hand-visual-scale.js';
import {NativeHands} from '../src/rendering/hands.js';
import {WorldScene} from '../src/rendering/scene.js';

test('small world guide remains readable in CSS pixels regardless of drawing-buffer DPR',()=>{
 const input={height:.82,depth:30,projectionY:2.6,viewportHeight:390,minimumPixels:40};
 const scale=handVisualScale(input);
 assert.ok(scale>1&&scale<4);
 assert.ok(Math.abs(.82*scale*2.6*390/60-40)<1e-9);
 assert.equal(handVisualScale({...input,viewportHeight:780}),scale/2);
 assert.equal(handVisualScale({...input,depth:300}),4);
 assert.equal(handVisualScale({...input,depth:2}),1);
 for(const patch of [{viewportHeight:0},{depth:-1},{minimumPixels:0}])assert.equal(handVisualScale({...input,...patch}),1);
});

test('adaptive native guide keeps target, depth protection and native size for non-tutorial gestures',async()=>{
 const hands=new NativeHands(new THREE.Scene(),()=>0,{textureLoader:{loadAsync:async()=>new THREE.Texture()}});
 await hands.ready;
 const camera=new THREE.PerspectiveCamera(42,844/390,.1,1000);
 camera.position.set(16,15,30);camera.lookAt(0,0,0);
 const config={kind:'point',target:'center-site',position:[0,.025,0],minimumScreenHeight:40};
 hands.show(config);hands.update(.1,camera,390);
 assert.ok(hands.hints.size>1&&hands.hints.size<=4);
 assert.deepEqual(hands.hints.last.target,config.position);
 assert.deepEqual(hands.hints.getState().intersections,[]);
 assert.equal(hands.material.depthTest,true);
 hands.show({...config,minimumScreenHeight:undefined});hands.update(.1,camera,390);
 assert.equal(hands.hints.size,1);
 hands.dispose();
});

test('enlarged guide includes blockers outside the original three-metre neighbourhood',()=>{
 const blocker={id:'roof',min:[-7,0,-1],max:[-5,5,1]};
 const world={handStaticBoxes:[blocker],state:{villages:[],structures:[]}};
 const config={kind:'point',position:[0,.025,0],minimumScreenHeight:40};
 assert.deepEqual(WorldScene.prototype.handColliders.call(world,config),[blocker]);
 assert.deepEqual(WorldScene.prototype.handColliders.call(world,{...config,minimumScreenHeight:0}),[]);
});

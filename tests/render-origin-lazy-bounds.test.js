import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,Vector4} from 'three';
import {withRenderOrigin} from '../src/rendering/render-origin.js';

test('default-origin rendering never resolves bounds providers, including a failed draw',()=>{
 const scene=new Scene(),camera=new PerspectiveCamera();let draws=0;
 const options={scene,camera,origin:{x:0,z:0},minMax:()=>{throw Error('Unexpected material scan');},minSize:()=>{throw Error('Unexpected terrain scan');}};
 assert.equal(withRenderOrigin(options,()=>{draws++;return 'rendered';}),'rendered');
 assert.throws(()=>withRenderOrigin(options,()=>{draws++;throw Error('draw failed');}),/draw failed/);assert.equal(draws,2);
});

test('lazy bounds remain live across recentering and are restored after every draw or exception',()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(),origin={x:240,z:-48};
 scene.position.set(3,4,5);camera.position.set(280,20,40);
 let clip=new Vector4(200,-100,300,100),size=new Vector4(200,-100,40,50),reads=0;
 const options={scene,camera,origin,minMax:()=>{reads++;return [clip,clip];},minSize:()=>[size]};
 for(const fail of [false,true]){
  const beforeClip=clip.clone(),beforeSize=size.clone(),beforeScene=scene.position.clone(),beforeCamera=camera.position.clone();
  const draw=()=>{
   assert.deepEqual(clip.toArray(),[beforeClip.x-240,beforeClip.y+48,beforeClip.z-240,beforeClip.w+48]);
   assert.deepEqual(size.toArray(),[beforeSize.x-240,beforeSize.y+48,beforeSize.z,beforeSize.w]);
   if(fail)throw Error('draw failed');return 42;
  };
  if(fail)assert.throws(()=>withRenderOrigin(options,draw),/draw failed/);else assert.equal(withRenderOrigin(options,draw),42);
  assert.ok(clip.equals(beforeClip));assert.ok(size.equals(beforeSize));assert.ok(scene.position.equals(beforeScene));assert.ok(camera.position.equals(beforeCamera));
  // A material can replace its vector between frames; do not cache old bounds.
  clip=new Vector4(400,300,800,900);size=new Vector4(400,300,50,60);
 }
 assert.equal(reads,2);
});

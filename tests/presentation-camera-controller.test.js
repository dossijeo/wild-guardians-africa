import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {createPresentationCameraController} from '../src/app/presentation-camera-controller.js';

function fixture(){
 const camera=new PerspectiveCamera(42,1,.1,500);camera.position.set(10,12,10);
 const controls={target:new Vector3(),minDistance:4,maxDistance:65,enableDamping:true,update(){}};
 const rect={left:0,top:0,width:800,height:400},viewport={getBoundingClientRect:()=>rect},terrain={canyon:false,surface:()=>3};
 const resolutions=[],calls=[],raid={update:(s,dt)=>calls.push(['raid',s,dt]),cancel:()=>calls.push(['cancel'])},game={id:'game'};
 const controller=createPresentationCameraController({camera,controls,viewport,field:()=>terrain,quality:()=> 'media',devicePixelRatio:()=>1,raidCamera:()=>raid,state:()=>game,onResolution:r=>resolutions.push(r)});
 return {camera,controls,rect,resolutions,calls,controller,game};
}

test('camera frame and viewport sizing work without a renderer or WorldScene',()=>{
 const {camera,resolutions,calls,controller,game}=fixture();controller.step(.25);
 assert.equal(camera.aspect,2);assert.equal(resolutions[0].width,800);assert.equal(resolutions[0].height,400);assert.deepEqual(calls,[['raid',game,.25]]);
 assert.ok(camera.position.y>=5);controller.step(.1,{cinematic:true});assert.equal(calls.length,1);controller.dispose();assert.throws(()=>controller.resize(),/closed/);
});

test('focus uses the current terrain and cancels raid camera travel',()=>{
 const {camera,controls,calls,controller}=fixture();controller.focus({x:12,z:15});
 assert.deepEqual(calls,[['cancel']]);assert.equal(controls.target.x,12);assert.equal(controls.target.z,15);assert.ok(camera.position.y>=5);controller.dispose();
});

test('blocked camera guard prevents a gesture from altering the camera',()=>{
 const {camera,controls,rect}=fixture(),eye=camera.position.clone(),target=controls.target.clone();let attempts=0;
 const controller=createPresentationCameraController({camera,controls,viewport:{getBoundingClientRect:()=>rect},field:()=>null,guard:{run(){attempts++;return false;}}});
 assert.equal(controller.wallGesture({x:100,y:100,distance:100},{x:120,y:110,distance:110}),false);assert.equal(attempts,1);assert.deepEqual(camera.position,eye);assert.deepEqual(controls.target,target);controller.dispose();
});

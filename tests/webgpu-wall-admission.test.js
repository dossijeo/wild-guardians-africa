import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createWebGpuAdmittedWall} from '../src/rendering/webgpu-wall-admission.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const requests=[],walls=[],errors=[];let ready=0;
 class Wall extends Group{
  constructor(value){super();this.stageKey=value.stage;this.parts=[{stage:value.stage}];this.disposed=false;walls.push(this);}
  nextConfirmedStageKey(value){return value.stage;}
  update(value){assert.equal(value.stage,this.stageKey);this.value=value.value;}
  dispose(){this.disposed=true;}
 }
 const pipelineAdmission={prepare(wall,{signal}){return new Promise((resolve,reject)=>{requests.push({wall,signal,resolve,reject});signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});}};
 const view=createWebGpuAdmittedWall({prototypes:{},entity:{stage:'intact'},elapsed:0,pipelineAdmission,createWall:(_,entity)=>new Wall(entity),onReady:()=>ready++,onError:error=>errors.push(error.message)});
 return {view,requests,walls,errors,get ready(){return ready;}};
}
test('keeps the current wall while the next confirmed phase is prepared',async()=>{
 const f=fixture();await turn();assert.equal(f.view.ready,false);f.requests[0].resolve();await turn();assert.equal(f.view.ready,true);assert.equal(f.view.parts[0].stage,'intact');
 f.view.update({stage:'damaged',value:1},1);await turn();assert.equal(f.view.parts[0].stage,'intact');assert.equal(f.walls[0].disposed,false);
 f.requests[1].resolve();await turn();assert.equal(f.view.parts[0].stage,'damaged');assert.equal(f.walls[0].disposed,true);assert.equal(f.ready,2);f.view.dispose();
});
test('cancels obsolete phases and never publishes their late results',async()=>{
 const f=fixture();await turn();f.requests[0].resolve();await turn();f.view.update({stage:'damaged'},1);await turn();f.view.update({stage:'ruined'},2);await turn();
 assert.equal(f.requests[1].signal.aborted,true);assert.equal(f.walls[1].disposed,true);f.requests[1].resolve();f.requests[2].resolve();await turn();
 assert.equal(f.view.parts[0].stage,'ruined');assert.deepEqual(f.errors,[]);f.view.dispose();
});
test('a failed replacement preserves the previous visible wall',async()=>{
 const f=fixture();await turn();f.requests[0].resolve();await turn();f.view.update({stage:'damaged'},1);await turn();f.requests[1].reject(Error('pipeline failed'));await turn();
 assert.equal(f.view.parts[0].stage,'intact');assert.equal(f.walls[0].disposed,false);assert.deepEqual(f.errors,['pipeline failed']);f.view.dispose();
});
test('blessing state reaches both the visible wall and a pending replacement',async()=>{const requests=[],walls=[];class Wall extends Group{constructor(value){super();this.stageKey=value.stage;this.blessingUniform={value:{active:false}};this.parts=[];walls.push(this);}nextConfirmedStageKey(value){return value.stage;}update(value){this.blessingUniform.value.active=false;}dispose(){}}const pipelineAdmission={prepare(){return new Promise(resolve=>requests.push(resolve));}},view=createWebGpuAdmittedWall({prototypes:{},entity:{stage:'intact',blessed:false},elapsed:0,pipelineAdmission,createWall:(_,entity)=>new Wall(entity),setWallPresentation:(wall,entity)=>{wall.blessingUniform.value.active=entity.blessed;}});try{await turn();requests[0]();await turn();view.update({stage:'damaged',blessed:true},1);await turn();assert.equal(walls[0].blessingUniform.value.active,true);assert.equal(walls[1].blessingUniform.value.active,true);requests[1]();await turn();view.update({stage:'damaged',blessed:false},2);assert.equal(walls[1].blessingUniform.value.active,false);}finally{view.dispose();}});

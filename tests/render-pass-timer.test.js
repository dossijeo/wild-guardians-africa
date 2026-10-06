import test from 'node:test';
import assert from 'node:assert/strict';
import {RenderPassTimer} from './browser/render-pass-timer.js';
function fixture(){
 const timer={active:null,samples:[],begin(id){assert.equal(this.active,null,'Nested GPU query');this.active=id;return true;},end(){this.samples.push({frame:this.active,ms:1});this.active=null;},poll(){},report(){return {samples:this.samples};},dispose(){this.disposed=true;}};
 const renderer={target:null,getRenderTarget(){return this.target;},info:{render:{calls:0,triangles:0}},shadowMap:{render(){assert.equal(this,renderer.shadowMap);renderer.info.render.calls+=2;renderer.info.render.triangles+=10;}},render(scene){assert.equal(this,renderer);this.shadowMap.render();this.info.render.calls+=3;this.info.render.triangles+=20;return scene;}};
 const world={renderer,sky:{scene:{}},destructionPass:{smokeDepth:{},target:{},smokeScene:{}}};
 return {world,timer};
}
test('Native automatic shadows are timed separately without nested elapsed queries',()=>{
 const {world,timer}=fixture(),render=world.renderer.render,shadow=world.renderer.shadowMap.render,probe=new RenderPassTimer(world,timer),scene={};
 probe.start(7);assert.equal(world.renderer.render(scene),scene);probe.stop();
 assert.deepEqual(probe.report().rows.map(r=>[r.frame,r.pass,r.segment,r.calls,r.triangles,r.gpuMs]),[[7,'screen','prepare',0,0,1],[7,'screen','shadow',2,10,1],[7,'screen','draw',3,20,1]]);
 assert.equal(timer.active,null);probe.dispose();assert.equal(world.renderer.render,render);assert.equal(world.renderer.shadowMap.render,shadow);
});
test('Depth, mask, sky and smoke keep their own pass; outside measurement no timer calls',()=>{
 const {world,timer}=fixture(),probe=new RenderPassTimer(world,timer),r=world.renderer;
 r.render({});assert.equal(timer.samples.length,0);
 for(const [target,scene,pass] of [[world.destructionPass.smokeDepth,{},'world-depth'],[world.destructionPass.target,{},'building-mask'],[null,world.sky.scene,'sky'],[null,world.destructionPass.smokeScene,'building-smoke']]){
  r.target=target;probe.start(pass);r.render(scene);probe.stop();assert.equal(probe.rows.at(-1).pass,pass);
 }
 probe.dispose();
});
test('Failure closes queries and disposal restores hooks without replacing a later owner',()=>{
 const {world,timer}=fixture();world.renderer.shadowMap.render=()=>{throw Error('shadow failed');};
 const original=world.renderer.render,probe=new RenderPassTimer(world,timer);probe.start(1);
 assert.throws(()=>world.renderer.render({}),/shadow failed/);assert.equal(timer.active,null);assert.equal(probe.stack.length,0);probe.stop();
 const newer=()=>{};world.renderer.shadowMap.render=newer;probe.dispose();assert.equal(world.renderer.render,original);assert.equal(world.renderer.shadowMap.render,newer);
});
test('Unavailable/foreign query leaves timing null and never ends somebody else’s query',()=>{
 const {world,timer}=fixture();timer.begin=()=>false;timer.end=()=>{throw Error('Foreign query ended');};
 const probe=new RenderPassTimer(world,timer);probe.start(4);world.renderer.render({});probe.stop();
 assert.ok(probe.report().rows.every(r=>!r.timed&&r.gpuMs===null));probe.dispose();
});

// Execute the real browser comparison body with CPU-only browser/renderer
// boundaries. This verifies JS lifetime/control flow, never rendered pixels.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('tests/browser/frontside-maize-world.js','utf8');
const body=source.slice(source.indexOf('async function compare(){'),source.indexOf('async function saveRestore(){'));
function fixture(throwOnDraw=0){
 const vector=()=>({clone:vector,copy(){return this;},toArray:()=>[1,2,3]});
 const originalCallback=function(){},mesh={isInstancedMesh:true,name:'maiz_05_maduro',onBeforeRender:originalCallback};
 const depth={},context={animation:null,selected:true,state:{paused:true},adapter:null,depthEnabled:true,retainedPng:null,status:{textContent:''},report:{captures:[]},cancelAnimationFrame(){},serialize:()=> 'unchanged-state',digest:async()=> 'a'.repeat(64),Image:class{async decode(){}},document:{createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/png;base64,CPU_ONLY'}),querySelector:()=>({append(){}})}};
 const world={camera:{position:vector()},controls:{target:vector(),enableDamping:true,update(){}},scene:{children:[mesh]},destructionPass:{smokeDepth:depth,depthCaptureStats:null},agricultureVfx:{effects:new Map([['qa-spell',{}]])},renderer:{domElement:{width:10,height:10},info:{autoReset:true,reset(){},render:{calls:1},memory:{geometries:1},programs:[]},getRenderTarget:()=>depth}};
 let draws=0;
 world.render=()=>{if(++draws===throwOnDraw)throw Error('Injected draw failure');world.destructionPass.depthCaptureStats={specialized:1};mesh.onBeforeRender(world.renderer,world.scene,world.camera,{},mesh.customWorldDepthMaterial??{type:'MeshDepthMaterial',side:2},null);};
 context.world=world;context.applyFlag=enabled=>{context.selected=enabled;context.adapter=enabled?{snapshot:()=>({testOnly:true})}:null;mesh.customWorldDepthMaterial=enabled?{type:'MeshDepthMaterial',side:0}:null;};
 return{context,world,mesh,originalCallback};
}
test('actual comparison body records both depth arms and restores camera/flag/render callback',async()=>{
 const f=fixture();await vm.runInNewContext(body+'\ncompare()',f.context);
 const capture=f.context.report.captures[0];assert.equal(capture.arms.length,2);
 assert.equal(capture.logicalUnchanged,true);
 assert.equal(capture.arms[0].candidate,false);assert.equal(capture.arms[1].candidate,true);
 assert.equal(capture.arms[0].worldDepth.maizeDraws[0].authored,false);
 assert.equal(capture.arms[1].worldDepth.maizeDraws[0].authored,true);
 assert.equal(f.context.selected,true);assert.equal(f.world.controls.enableDamping,true);
 assert.equal(f.world.renderer.info.autoReset,true);assert.equal(f.mesh.onBeforeRender,f.originalCallback);
});
test('actual comparison body restores temporary draw/camera/flag state on failed second arm',async()=>{
 const f=fixture(3);await assert.rejects(vm.runInNewContext(body+'\ncompare()',f.context),/Injected draw failure/);
 assert.equal(f.context.selected,true);assert.equal(f.world.controls.enableDamping,true);
 assert.equal(f.world.renderer.info.autoReset,true);assert.equal(f.mesh.onBeforeRender,f.originalCallback);
 assert.equal(f.context.report.captures.length,0);
});

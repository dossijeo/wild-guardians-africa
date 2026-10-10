import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {LoadingDiorama} from '../src/rendering/loading-diorama.js';
import {LoadingPlants} from '../src/rendering/loading-plants.js';
import {createLoadingVisualPlantQa} from '../src/app/loading-visual-plant-qa.js';
import {installLoadingVisualQa} from '../src/app/loading-visual-bridge.js';
import {readFileSync} from 'node:fs';
import {createLoadingVisualFixtures} from '../tools/create_loading_visual_fixtures.mjs';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
function setup({aspect=16/9,angle=0,night=0}={}){
 const state={day:night?1:1,time:night?305:0,plants:[{id:'paid-yuca',species:'yuca',alive:true}],ledger:{balance:{n:'648',d:'1'}},rng:712};
 const world={state,loading:new AbortController(),canvas:{getBoundingClientRect:()=>({left:15,top:20,width:aspect*720,height:720})}};
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(15,15),new THREE.MeshBasicMaterial());ground.rotation.x=-Math.PI/2;ground.position.y=.09;ground.updateMatrixWorld();
 const camera=new THREE.PerspectiveCamera(40,aspect,.1,80),scale=aspect<.8?1.65:1;
 camera.position.set((4.8*Math.cos(angle)+6.4*Math.sin(angle))*scale,3.1*(aspect<.8?1.45:1),(6.4*Math.cos(angle)-4.8*Math.sin(angle))*scale);camera.lookAt(0,1.15,0);camera.updateMatrixWorld();
 const diorama={world,state,camera,ground,ray:new THREE.Raycaster(),cursor:new THREE.Vector2(),plants:new LoadingPlants(),prepared:true,interactive:true,plantAt:LoadingDiorama.prototype.plantAt};
 const report={frames:[{label:'initial',plants:diorama.plants.plants.map(p=>({...p}))}],errors:[]};let calls=0,signals=0;
 const actual=diorama.plantAt;diorama.plantAt=function(...args){calls++;return actual.apply(this,args);};diorama.onPlant=()=>signals++;
 return {diorama,report,state,world,calls:()=>calls,signals:()=>signals,dispose(){ground.geometry.dispose();ground.material.dispose();}};
}
test('default OFF creates no report or action',()=>{const f=setup();assert.equal(createLoadingVisualPlantQa(f.diorama,f.report),null);assert.equal(f.report.plantAction,undefined);assert.equal(f.calls(),0);f.dispose();});
test('actual handler/raycaster plants once under orbit, night and portrait without logical state change',()=>{
 for(const aspect of [16/9,420/900])for(const angle of [0,1.1,3.8])for(const night of [0,1]){
  const f=setup({aspect,angle,night}),before=JSON.stringify(f.state),action=createLoadingVisualPlantQa(f.diorama,f.report,{enabled:true});
  action.afterDraw(f.diorama,.3);action.afterDraw(f.diorama,.4);
  assert.equal(f.calls(),1,`${aspect}/${angle}/${night}`);assert.equal(f.signals(),1);assert.equal(f.diorama.plants.plants.length,5);
  assert.equal(JSON.stringify(f.state),before);assert.equal(f.report.plantAction.logicalPlantsUnchanged,true);assert.ok(f.report.plantAction.candidates<=12);
  assert.match(f.report.plantAction.scope,/not physical/);action.close();f.dispose();
 }
});
test('actual handler preserves entire legally generated day/night serialized saves',()=>{
 const records=createLoadingVisualFixtures();
 for(const row of Object.values(records)){
  const f=setup();f.state=deserialize(row.fixture.snapshot);f.diorama.state=f.state;f.world.state=f.state;const before=serialize(f.state);
  const action=createLoadingVisualPlantQa(f.diorama,f.report,{enabled:true});action.afterDraw(f.diorama,.4);
  assert.equal(f.calls(),1);assert.equal(serialize(f.state),before);assert.equal(f.state.plants.length,1);assert.equal(f.state.plants[0].species,'yuca');action.close();f.dispose();
 }
});
test('missing initial PNG, cinematic and noninteractive states cannot act',()=>{
 const f=setup(),action=createLoadingVisualPlantQa(f.diorama,f.report,{enabled:true});f.report.frames=[];action.afterDraw(f.diorama,.2);assert.equal(f.calls(),0);
 f.report.frames=[{label:'initial',plants:[1,2,3,4]}];f.world.cinematic={};action.afterDraw(f.diorama,.3);f.world.cinematic=null;f.diorama.interactive=false;action.afterDraw(f.diorama,.4);assert.equal(f.calls(),0);
 action.close();assert.match(f.report.plantAction.skipped,/absent/);f.dispose();
});
test('abort/closed/replacement callbacks cannot plant into either owner',()=>{
 const f=setup(),other=setup(),action=createLoadingVisualPlantQa(f.diorama,f.report,{enabled:true});action.afterDraw(other.diorama,.4);assert.equal(f.calls(),0);
 f.world.loading.abort();action.afterDraw(f.diorama,.4);action.afterDraw(f.diorama,.5);assert.equal(f.calls(),0);assert.equal(f.report.plantAction.cancelled,true);assert.equal(other.calls(),0);f.dispose();other.dispose();
});
test('no safe point, rejected actual handler and handler errors do not retry',()=>{
 for(const mode of ['occupied','rejected','throw','badrect']){
  const f=setup();if(mode==='occupied')f.diorama.plants.spacing=20;if(mode==='rejected')f.diorama.plantAt=()=>null;if(mode==='throw')f.diorama.plantAt=()=>{throw Error('handler failure');};if(mode==='badrect')f.world.canvas.getBoundingClientRect=()=>({left:0,top:0,width:0,height:0});
  const action=createLoadingVisualPlantQa(f.diorama,f.report,{enabled:true});action.afterDraw(f.diorama,.3);action.afterDraw(f.diorama,.4);
  assert.equal(f.diorama.plants.plants.length,4);assert.equal(f.report.plantAction.attempted,true);assert.ok(f.report.plantAction.error||f.report.plantAction.skipped);action.close();f.dispose();
 }
});
test('bridge records initial before action and next draw captures a real fifth plant; cancel releases owner',()=>{
 const f=setup(),scope={__desktopSmokeVisualCapture:true,__desktopSmokeVisualPlant:true},report={frames:[],errors:[]};
 const collector={report,afterDraw(actual){report.frames.push({label:report.frames.length?'additional-plant':'initial',plants:actual.plants.plants.map(p=>({...p}))});},close(){return report;}};
 const owner=installLoadingVisualQa(f.world,f.diorama,{scope,create:()=>collector}),retained=f.diorama.onAfterDraw;
 retained(f.diorama,.3);assert.equal(report.frames[0].plants.length,4);assert.equal(f.calls(),1);retained(f.diorama,.5);assert.equal(report.frames[1].plants.length,5);f.world.loading.abort();retained(f.diorama,.7);owner.close();assert.equal(f.calls(),1);assert.equal(report.plantAction.closed,true);f.dispose();
});
test('retained bridge callback after external owner replacement cannot act',()=>{
 const f=setup(),scope={__desktopSmokeVisualCapture:true,__desktopSmokeVisualPlant:true},report={frames:[],errors:[]};
 const owner=installLoadingVisualQa(f.world,f.diorama,{scope,create:()=>({report,afterDraw(){throw Error('must not observe replaced owner');},close(){return report;}})}),retained=f.diorama.onAfterDraw,replacement=()=>{};
 f.diorama.onAfterDraw=replacement;retained(f.diorama,.3);owner.close();assert.equal(f.calls(),0);assert.equal(report.plantAction.closed,true);assert.strictEqual(f.diorama.onAfterDraw,replacement);f.dispose();
});
test('only native triple guard enables action; no DOM input or global controls API',()=>{
 const rust=readFileSync('src-tauri/src/main.rs','utf8');assert.match(rust,/--smoke-report[\s\S]*--smoke-visual"[\s\S]*--smoke-visual-plant/);
 const source=readFileSync('src/app/loading-visual-plant-qa.js','utf8');for(const text of ['PointerEvent','dispatchEvent','setPointerCapture','Game.plant','requestAnimationFrame','setTimeout'])assert.equal(source.includes(text),false);
 const f=setup(),scope={__desktopSmokeVisualCapture:true},collector={report:{frames:[],errors:[]},afterDraw(){},close(){}};const owner=installLoadingVisualQa(f.world,f.diorama,{scope,create:()=>collector});assert.equal(collector.report.plantAction,undefined);owner.close();f.dispose();
});

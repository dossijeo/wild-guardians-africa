import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSurfaces} from '../src/ui/game-surfaces.js';
import {TutorialController} from '../src/tutorial/controller.js';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {tutorialHandTarget} from '../src/rendering/tutorial-hand-target.js';
import {moveWorker} from '../src/simulation/locomotion.js';
import {workerPose} from '../src/rendering/worker-actions.js';
test('Closing daily hiring defers its UI; other dialogs replace it without reopening it',()=>{
  const ui=new GameSurfaces();ui.open('hiring');assert.equal(ui.shouldOpen('result'),false);
  assert.equal(ui.close(),'hiring');assert.equal(ui.shouldOpen('hiring'),false);
  ui.open('modal');assert.equal(ui.active,'modal');assert.equal(ui.shouldOpen('hiring'),false);
  ui.close();ui.open('hiring');assert.equal(ui.deferred.has('hiring'),false);
  ui.reset();assert.equal(ui.shouldOpen('hiring'),true);
});
test('A dismissed instruction stays closed while its real action is pending, including after reload',()=>{
  const state=Game.newGame(),profile={read:()=>new Set(),record:()=>{},basicCompleted:false};
  const controller=new TutorialController(state,profile);controller.acknowledge();controller.dismiss();
  assert.equal(state.tutorial.step,'center');assert.equal(controller.presentation(),null);
  for(let i=0;i<20;i++)controller.update();assert.equal(controller.presentation(),null);
  assert.equal(new TutorialController(structuredClone(state),profile).presentation(),null);
  state.structures.push({id:'center',kind:'center',status:'intact',hp:100});controller.update();
  assert.equal(controller.presentation().id,'basic.plant');assert.equal(controller.presentation().blocking,true);
});
test('A shallow incline or interior bump cannot leave a work-center floor floating',()=>{
  const nav=Object.create(Navigation.prototype);nav.obstacles=[];nav.propsAt=()=>[];
  const building={kind:'center',x:0,z:0,radius:3,footprint:[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}]};
  nav.field={blocked:()=>false,slope:()=>.1,surface:x=>x*.1};assert.equal(nav.placementFootprint(building).valid,false);
  nav.field.surface=(x,z)=>x===1&&z===1?.3:0;assert.equal(nav.placementFootprint(building).valid,false);
  nav.field.surface=()=>0;assert.equal(nav.placementFootprint(building).valid,true);
});
test('World hints show a mature harvest target and never follow idle work or deliveries',()=>{
  const state={day:1,tutorial:{step:'observe'},villages:[{x:0,z:0}],structures:[],plants:[],workers:[],crates:[]},nav={field:{surface:()=>0}};
  assert.equal(tutorialHandTarget(state,nav),null);state.tutorial.step='hire';assert.equal(tutorialHandTarget(state,nav),null);
  state.tutorial.step='harvest';state.crates.push({id:'c',delivered:false});assert.equal(tutorialHandTarget(state,nav),null);
  state.plants.push({id:'p',species:'mijo',alive:true,growth:140,x:1,z:2});assert.equal(tutorialHandTarget(state,nav).target,'p');
  state.tutorial.dismissed=['basic.harvest:'];assert.equal(tutorialHandTarget(state,nav),null);
});
test('Actual running displacement exceeds walking by over two times; stopped fleeing actors stay idle',()=>{
  const make=()=>({x:0,z:0,path:[{x:100,z:0}],runRemaining:100,status:'walking'});
  const walk=make(),run=make();moveWorker(walk,1);moveWorker(run,1,{urgent:true});
  assert.ok(run.x>walk.x*2);assert.equal(run.running,true);assert.equal(walk.running,false);
  const library={actions:{Idle:{duration:2,loop:true},Run:{duration:1,loop:true}}};
  assert.equal(workerPose({status:'fleeing',running:false},null,1,library).name,'Idle');
});

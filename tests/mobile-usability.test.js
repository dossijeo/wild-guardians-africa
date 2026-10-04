import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSurfaces} from '../src/ui/game-surfaces.js';
import {TutorialController} from '../src/tutorial/controller.js';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {tutorialHandTarget} from '../src/rendering/tutorial-hand-target.js';
import {moveWorker} from '../src/simulation/locomotion.js';
import {workerPose} from '../src/rendering/worker-actions.js';
import {updateIdle} from '../src/simulation/idle.js';
import {ToolSession} from '../src/ui/tool-session.js';
import {ensurePurchaseBudget} from '../src/simulation/budget.js';
import {rational,numberOf} from '../src/simulation/money.js';
test('Mandatory hiring refuses closing and replacement until confirmed, while a result can supersede it',()=>{
  const ui=new GameSurfaces();assert.equal(ui.open('hiring',{mandatory:true}),true);
  ui.open('hiring');assert.equal(ui.close(),null);assert.equal(ui.active,'hiring');assert.equal(ui.deferred.has('hiring'),false);
  assert.equal(ui.open('modal'),false);assert.equal(ui.open('panel'),false);assert.equal(ui.active,'hiring');
  assert.equal(ui.close({resolved:true}),'hiring');assert.equal(ui.active,null);assert.equal(ui.mandatory,false);
  ui.open('hiring',{mandatory:true});assert.equal(ui.open('result',{force:true}),true);assert.equal(ui.active,'result');assert.equal(ui.deferred.has('hiring'),false);
  ui.reset();assert.equal(ui.shouldOpen('hiring'),true);
});

test('Optional panels still replace one another and close normally',()=>{
  const ui=new GameSurfaces();ui.open('panel');ui.open('modal');assert.equal(ui.active,'modal');assert.equal(ui.close(),'modal');assert.equal(ui.active,null);
});

test('A dismissed instruction stays closed while its real action is pending, including after reload',()=>{
  const state=Game.newGame(),profile={read:()=>new Set(),record:()=>{},basicCompleted:false};
  const controller=new TutorialController(state,profile);controller.acknowledge();controller.dismiss();
  assert.equal(state.tutorial.step,'center');assert.equal(controller.presentation(),null);
  for(let i=0;i<20;i++)controller.update();assert.equal(controller.presentation(),null);
  assert.equal(new TutorialController(structuredClone(state),profile).presentation(),null);
  state.structures.push({id:'center',kind:'center',status:'intact',hp:100});controller.update();
  assert.equal(controller.presentation().id,'basic.plant');assert.equal(controller.presentation().blocking,false);
});
test('A shallow incline or interior bump cannot leave a work-center floor floating',()=>{
  const nav=Object.create(Navigation.prototype);nav.obstacles=[];nav.propsAt=()=>[];
  const building={kind:'center',x:0,z:0,radius:3,footprint:[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}]};
  nav.field={blocked:()=>false,slope:()=>.1,surface:x=>x*.1};assert.equal(nav.placementFootprint(building).valid,false);
  nav.field.surface=(x,z)=>x===1&&z===1?.3:0;assert.equal(nav.placementFootprint(building).valid,false);
  nav.field.surface=()=>0;assert.equal(nav.placementFootprint(building).valid,true);
});
test('World hints never ask for manual harvesting or follow idle work or deliveries',()=>{
  const state={day:1,tutorial:{step:'observe'},villages:[{x:0,z:0}],structures:[],plants:[],workers:[],crates:[]},nav={field:{surface:()=>0}};
  assert.equal(tutorialHandTarget(state,nav),null);state.tutorial.step='hire';assert.equal(tutorialHandTarget(state,nav),null);
  state.tutorial.step='harvest';state.crates.push({id:'c',delivered:false});assert.equal(tutorialHandTarget(state,nav),null);
  state.plants.push({id:'p',species:'mijo',alive:true,growth:140,x:1,z:2});assert.equal(tutorialHandTarget(state,nav),null);
  state.tutorial.dismissed=['basic.harvest:'];assert.equal(tutorialHandTarget(state,nav),null);
});
test('Actual running displacement exceeds walking by over two times; stopped fleeing actors stay idle',()=>{
  const make=()=>({x:0,z:0,path:[{x:100,z:0}],runRemaining:100,status:'walking'});
  const walk=make(),run=make();moveWorker(walk,1);moveWorker(run,1,{urgent:true});
  assert.ok(run.x>walk.x*2);assert.equal(run.running,true);assert.equal(walk.running,false);
  const library={actions:{Idle:{duration:2,loop:true},Run:{duration:1,loop:true}}};
  assert.equal(workerPose({status:'fleeing',running:false},null,1,library).name,'Idle');
});
test('New campaigns have 1500 coins and tutorial readings never pause the running clock',()=>{
  const state=Game.newGame(),profile={read:()=>new Set(),record:()=>{},basicCompleted:false};
  const tutorial=new TutorialController(state,profile);
  assert.equal(numberOf(state.ledger.balance),1500);assert.equal(tutorial.presentation().blocking,false);
  Game.tick(state,2,{});assert.ok(Math.abs(state.elapsed-2)<1e-8);assert.deepEqual(state.pauses,[]);
  assert.equal(tutorial.advance(30),true);assert.ok(state.tutorial.seen.includes('basic.introduction'));
  assert.equal(tutorial.presentation().id,'basic.center');assert.equal(tutorial.advance(30),true);assert.equal(tutorial.presentation(),null);
});
test('The tool expires ten seconds after its last successful placement',()=>{
  const session=new ToolSession();session.select({kind:'plant'},0);assert.equal(session.expired(9.99),false);
  session.used(9);assert.equal(session.expired(18.99),false);assert.equal(session.expired(19),true);
  session.clear();assert.equal(session.expired(30),false);
});
test('The salary reserve rejects purchases before any debit, permitting exactly 30 to remain',()=>{
  const state=Game.newGame();state.ledger.balance=rational(35);
  ensurePurchaseBudget(state,5);assert.throws(()=>ensurePurchaseBudget(state,6),e=>e.code==='hiring-reserve');
  assert.equal(numberOf(state.ledger.balance),35);assert.deepEqual(state.ledger.entries,{});
});
test('Idle farm anchors use a nearby living plot and a three metre roaming radius',()=>{
  const center={id:'center',x:0,z:0},worker={centerId:'center',x:20,z:0};
  const s={plants:[{id:'near',centerId:'center',alive:true,x:21,z:0},{id:'far',centerId:'center',alive:true,x:80,z:0}]};
  const anchor=Game.idleFarmAnchor(s,worker,center);assert.equal(anchor.id,'farm-near');assert.equal(anchor.idleRadius,3);
  s.plants.forEach(p=>p.alive=false);const harvested=Game.idleFarmAnchor(s,worker,center);assert.equal(harvested.id,'farm-near');assert.equal(harvested.idleRadius,3);
  s.plants=[];const empty=Game.idleFarmAnchor(s,worker,center);assert.equal(empty.id,'farm-center');assert.equal(empty.idleRadius,2);
});

test('An unreachable idle farm anchor backs off route searches instead of retrying each frame',()=>{
 let calls=0;const worker={id:'idle',profile:'olderFemale',x:0,z:0};const anchor={id:'farm-plot',x:100,z:0,idleRadius:3};
 const nav={version:1,path:()=>{calls++;return null;}};
 for(let i=0;i<50;i++)updateIdle(worker,anchor,.01,nav,712);assert.equal(calls,1);assert.equal(worker.running,false);
});


test('farm idle anchors prefer living plants, exclude other centers and break equal distances consistently',()=>{
 const center={id:'center',x:0,z:0},worker={centerId:'center',x:20,z:0};
 const s={plants:[{id:'foreign',centerId:'another',alive:true,x:20,z:0},{id:'harvested',centerId:'center',alive:false,x:20,z:0},{id:'z',centerId:'center',alive:true,x:21,z:0},{id:'a',centerId:'center',alive:true,x:19,z:0}]};
 assert.equal(Game.idleFarmAnchor(s,worker,center).id,'farm-a');s.plants.reverse();assert.equal(Game.idleFarmAnchor(s,worker,center).id,'farm-a');
 s.plants.forEach(p=>p.alive=false);assert.equal(Game.idleFarmAnchor(s,worker,center).id,'farm-harvested');
});

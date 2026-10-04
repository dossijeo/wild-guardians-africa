import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {tutorialHandTarget} from '../src/rendering/tutorial-hand-target.js';
import {tutorialHudHandTarget} from '../src/ui/tutorial-hud-hand.js';
import {serialize} from '../src/persistence/snapshots.js';
import {deserialize} from '../src/persistence/snapshots.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {WorldScene} from '../src/rendering/scene.js';
const nav={field:{surface:()=>0},placement:()=>({valid:true,suppress:[]}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
function fixture(){const s=Game.newGame({seed:712});s.tutorial.step='center';s.villages[0].center={x:10,z:0};return s;}
test('the first center and first seed follow HUD selection, legal 3D placement, then remove both hints',()=>{
 const s=fixture(),before=serialize(s),centerMessage={id:'basic.center',reading:true};
 assert.equal(tutorialHudHandTarget(s,centerMessage),'[data-menu="build"]');assert.equal(tutorialHandTarget(s,nav),null);
 assert.equal(tutorialHudHandTarget(s,centerMessage,'center'),null);const center=tutorialHandTarget(s,nav,'center');assert.equal(center.kind,'point');assert.equal(serialize(s),before);
 Game.placeStructure(s,'first-center',{x:center.position[0],z:center.position[2]},nav);assert.equal(s.tutorial.step,'plant');
 const plantMessage={id:'basic.plant',reading:true};assert.equal(tutorialHudHandTarget(s,plantMessage,'center'),'[data-menu="grow"]');assert.equal(tutorialHandTarget(s,nav,'center'),null);
 assert.equal(tutorialHudHandTarget(s,plantMessage,'plant'),null);const seed=tutorialHandTarget(s,nav,'plant');assert.equal(seed.kind,'tap');assert.equal(seed.position[0]%1.5,0);assert.equal(seed.position[2]%1.5,0);
 Game.plant(s,'first-seed','mijo',seed.position[0],seed.position[2],nav);assert.equal(tutorialHandTarget(s,nav,'plant'),null);assert.equal(tutorialHudHandTarget(s,{id:'basic.hiring'}),null);
});
test('choosing a guided placement reveals its exact legal world target without moving the camera again on unrelated tools',()=>{
 const s=fixture(),focused=[],world={state:s,nav,focus:p=>focused.push(p)};
 const guide=WorldScene.prototype.focusTutorialPlacement.call(world,'center');
 assert.ok(guide);assert.deepEqual(focused,[{x:guide.position[0],z:guide.position[2]}]);
 Game.placeStructure(s,'first-center',{x:guide.position[0],z:guide.position[2]},nav);
 const seed=WorldScene.prototype.focusTutorialPlacement.call(world,'plant');assert.ok(seed);
 assert.deepEqual(focused.at(-1),{x:seed.position[0],z:seed.position[2]});
 for(const kind of ['wall','spell','center'])assert.equal(WorldScene.prototype.focusTutorialPlacement.call(world,kind),null);
 assert.equal(focused.length,2);
 s.tutorial.basicSkipped=true;assert.equal(WorldScene.prototype.focusTutorialPlacement.call(world,'plant'),null);
 assert.equal(focused.length,2);
});
test('closing, skipping, hidden presentation and terminal states remove both kinds of guidance',()=>{
 for(const change of [s=>s.tutorial.dismissed=['basic.center:'],s=>s.day=2,s=>s.result='defeat',s=>s.tutorial.step='observe']){
  const s=fixture();change(s);assert.equal(tutorialHudHandTarget(s,{id:'basic.center'}),null);assert.equal(tutorialHandTarget(s,nav,'center'),null);
 }
 const s=fixture();assert.equal(tutorialHudHandTarget(s,null),null);s.tutorial.basicSkipped=true;assert.equal(tutorialHudHandTarget(s,{id:'basic.center'}),null);assert.equal(tutorialHandTarget(s,nav,'center'),null);
});
test('the world hint never offers a forbidden building position or an inaccessible crop grid cell',()=>{
 const s=fixture(),blocked={...nav,placement:()=>({valid:false})};assert.equal(tutorialHandTarget(s,blocked,'center'),null);
 const center=tutorialHandTarget(s,nav,'center');Game.placeStructure(s,'first-center',{x:center.position[0],z:center.position[2]},nav);
 assert.equal(tutorialHandTarget(s,{...nav,path:()=>null},'plant'),null);assert.equal(tutorialHandTarget(s,blocked,'plant'),null);
});
test('automatic message timeout preserves actionable guidance across reload, while explicit dismissal removes it',()=>{
 const profile={read:()=>new Set(),record(){},basicCompleted:false},s=Game.newGame({seed:712});s.villages[0].center={x:10,z:0};
 const controller=new TutorialController(s,profile);controller.acknowledge();assert.equal(controller.presentation().id,'basic.center');
 controller.advance(30);assert.equal(controller.presentation(),null);assert.equal(tutorialHudHandTarget(s,null),'[data-menu="build"]');assert.ok(tutorialHandTarget(s,nav,'center'));
 const loaded=deserialize(serialize(s));new TutorialController(loaded,profile);assert.equal(tutorialHudHandTarget(loaded,null),'[data-menu="build"]');assert.ok(tutorialHandTarget(loaded,nav,'center'));
 const manual=Game.newGame({seed:712});manual.villages[0].center={x:10,z:0};const reader=new TutorialController(manual,profile);reader.acknowledge();reader.dismiss();assert.equal(tutorialHudHandTarget(manual,null),null);assert.equal(tutorialHandTarget(manual,nav,'center'),null);
 assert.deepEqual(s.pauses,[]);assert.deepEqual(manual.pauses,[]);
 for(const value of ['bad',['basic.work'],['basic.center','basic.center']]){const bad=structuredClone(s);bad.tutorial.guideAfterAuto=value;assert.throws(()=>serialize(bad),/Guía/);}
});
test('a new game repeats both HUD and world placement guidance after a previous tutorial was completed',()=>{
 const seen=new Set(['basic.introduction','basic.center','basic.plant','basic.hiring','basic.work','basic.harvest','basic.complete']);
 const profile={basicCompleted:true,read:()=>seen,record:id=>seen.add(id)};
 const state=Game.newGame({slotId:'second-guided-game',seed:712});state.villages[0].center={x:10,z:0};
 const controller=new TutorialController(state,profile);
 assert.equal(controller.presentation().id,'basic.introduction');assert.equal(controller.presentation().canSkip,true);
 controller.acknowledge();assert.equal(controller.presentation().id,'basic.center');
 assert.equal(tutorialHudHandTarget(state,controller.presentation()),'[data-menu="build"]');
 const center=tutorialHandTarget(state,nav,'center');assert.ok(center);
 Game.placeStructure(state,'second-game-center',{x:center.position[0],z:center.position[2]},nav);controller.update();
 assert.equal(controller.presentation().id,'basic.plant');
 assert.equal(tutorialHudHandTarget(state,controller.presentation()),'[data-menu="grow"]');
 const seed=tutorialHandTarget(state,nav,'plant');assert.ok(seed);
 Game.plant(state,'second-game-seed','mijo',seed.position[0],seed.position[2],nav);controller.update();
 assert.equal(tutorialHudHandTarget(state,controller.presentation()),null);assert.equal(tutorialHandTarget(state,nav,'plant'),null);
 const skipped=Game.newGame({slotId:'second-skipped-game',seed:712}),skipController=new TutorialController(skipped,profile);
 assert.equal(skipController.skipBasic(),true);assert.equal(tutorialHudHandTarget(skipped,skipController.presentation()),null);
 assert.equal(tutorialHandTarget(skipped,nav,'center'),null);
});

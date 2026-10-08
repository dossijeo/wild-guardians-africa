import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {TutorialController} from '../src/tutorial/controller.js';
const nav={field:{surface:()=>0},placement:()=>({valid:true,suppress:[]}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
function setup(){
 const state=Game.newGame({seed:712});state.villages[0].center={x:10,z:0};let speaking=null;
 const records=[],controller=new TutorialController(state,{read:()=>new Set(records),record:id=>records.push(id),basicCompleted:false},{isNarrating:id=>speaking===id});
 return {state,controller,records,speak:id=>speaking=id};
}
test('placing the actual center cannot retire its audible text; only ended advances to planting',()=>{
 const {state,controller,speak}=setup();controller.acknowledge();const message=controller.presentation();speak(message.id);
 Game.placeStructure(state,'center',{x:10,z:0},nav);controller.update();
 assert.equal(state.structures.length,1);assert.equal(state.tutorial.step,'plant');assert.equal(controller.presentation(),message);
 assert.equal(controller.advance(1000),false);assert.equal(state.tutorial.reading,'basic.center');
 speak(null);controller.dismiss({automatic:true,message});assert.equal(controller.presentation().id,'basic.plant');assert.equal(state.plants.length,0);
});
test('planting and paying cannot cut the spoken planting instruction or hire automatically',()=>{
 const {state,controller,speak}=setup();controller.acknowledge();Game.placeStructure(state,'center',{x:10,z:0},nav);controller.update();const message=controller.presentation();speak(message.id);
 Game.plant(state,'seed','mijo',18,0,nav);controller.update();assert.equal(state.plants.length,1);assert.equal(controller.presentation(),message);assert.equal(state.hiringPaidDay,null);
 speak(null);controller.dismiss({automatic:true,message});assert.equal(controller.presentation().id,'basic.hiring');
});
test('raid ending cannot cut an audible raid explanation; completed context retires after ended',()=>{
 const {state,controller,speak}=setup();state.tutorial.basicSkipped=true;state.tutorial.step='done';state.tutorial.reading='mechanic.first-raid';state.raid={animals:[]};
 const message=controller.presentation();speak(message.id);state.raid=null;controller.update();assert.equal(controller.presentation(),message);assert.equal(state.tutorial.reading,message.id);
 speak(null);controller.dismiss({automatic:true,message});assert.notEqual(controller.presentation()?.id,message.id);
});
test('non-reading delivery text stays pinned during the clip and ended dismisses that identity',()=>{
 const {state,controller,speak}=setup();controller.acknowledge();state.tutorial.reading=null;state.tutorial.step='harvest';state.crates=[{id:'crate',delivered:false}];
 const message=controller.presentation();assert.equal(message.variant,'delivery');speak(message.id);state.crates[0].delivered=true;controller.update();assert.equal(controller.presentation(),message);
 speak(null);controller.dismiss({automatic:true,message});assert(state.tutorial.dismissed.includes('basic.harvest:delivery'));assert.equal(controller.presentation().id,'basic.complete');
});
test('silent fallback retains ordinary timed/manual tutorial progression and never fabricates actions',()=>{
 const {state,controller}=setup();assert(controller.advance(100));assert.equal(controller.presentation().id,'basic.center');
 assert(controller.advance(100));assert.equal(state.structures.length,0);assert.equal(state.plants.length,0);assert(state.tutorial.guideAfterAuto.includes('basic.center'));
});

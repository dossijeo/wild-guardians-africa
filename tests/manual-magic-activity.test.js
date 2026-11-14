import test from 'node:test';
import assert from 'node:assert/strict';
import {ManualMagicActivity,bindMagicSelectionContact,confirmedManualMagicApplication} from '../src/ui/manual-magic-activity.js';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {clearNavigation} from './clear-navigation.js';
import {projectConfirmedActorAudio} from '../src/simulation/confirmed-actor-audio.js';
import {createHostPublicationQueue} from '../src/simulation/host-publication-queue.js';
function fixture(){
 const nav=clearNavigation(),s=Game.newGame({slotId:'manual-activity',seed:712});Game.resume(s,'intro');
 Game.placeStructure(s,'center',{x:0,z:0},nav);Game.plant(s,'seed','mijo',6,0,nav);
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});return {s,nav};
}
function applied(metrics,s,contact){metrics.applied(s,s.spells.at(-1),{gestureSeconds:contact,applicationCpuSeconds:.001,benefited:s.events.at(-1).benefited});}
test('measured contact stays separate from effect time; repeated Multiply earns no useful contact credit',()=>{
 const {s,nav}=fixture(),metrics=new ManualMagicActivity();metrics.selected(s.day,'multiply',.1);
 Game.cast(s,'first','multiply',6,0,nav,s.plants[0].id);const before=serialize(s);applied(metrics,s,.2);
 assert.equal(serialize(s),before);Game.tick(s,15,nav);metrics.update(s);
 Game.cast(s,'repeat','multiply',6,0,nav,s.plants[0].id);applied(metrics,s,.4);
 const row=metrics.report(s).days[0];assert.equal(row.applications,2);assert.equal(row.redundantMultiplyApplications,1);
 assert.ok(Math.abs(row.applicationContactSeconds-.6)<1e-9);assert.equal(row.meaningfulApplicationContactSeconds,.2);
 assert.equal(row.selectionContactSeconds,.1);assert.equal(row.simulatedEffectSeconds,15);assert.equal(row.benefitedPlantCount,1);
 assert.equal(metrics.report(s).humanManualActivitySeconds,null);assert.equal(metrics.report(s).selectedModeActivityCreditSeconds,0);
 assert.equal(metrics.report(s).effectDurationActivityCreditSeconds,0);
});
test('a native Growth effect that cannot grow earns no useful contact credit despite thirty seconds of visuals',()=>{
 const {s,nav}=fixture(),metrics=new ManualMagicActivity();nav.path=()=>null;nav.walkable=()=>false;
 Game.cast(s,'dry','growth',6,0,nav,s.plants[0].id);applied(metrics,s,.25);
 Game.tick(s,30,nav);const row=metrics.report(s).days[0];
 assert.equal(row.nonproductiveGrowthApplications,1);assert.equal(row.extraGrowthSeconds,0);
 assert.equal(row.meaningfulApplicationContactSeconds,0);assert.equal(row.applicationContactSeconds,.25);
 assert.equal(row.simulatedEffectSeconds,30);
});
test('productive native Growth is credited only after actual extra growth, without mutating native state',()=>{
 const {s,nav}=fixture(),metrics=new ManualMagicActivity();Game.tick(s,30,nav);
 assert.equal(s.plants[0].water[0].status,'manual');Game.cast(s,'grow','growth',6,0,nav,s.plants[0].id);applied(metrics,s,.3);
 assert.equal(metrics.report(s).days[0].meaningfulApplicationContactSeconds,0);
 Game.tick(s,30,nav);const before=serialize(s),row=metrics.report(s).days[0];
 assert.equal(serialize(s),before);assert.ok(row.extraGrowthSeconds>0);assert.equal(row.benefitedPlantCount,1);
 assert.equal(row.meaningfulApplicationContactSeconds,.3);assert.equal(row.nonproductiveGrowthApplications,0);
 metrics.update({...s,day:s.day+1});assert.equal(metrics.days.get(s.day).ids,null);assert.equal(metrics.report(s).days[0].benefitedPlantCount,1);
});
test('confirmed terminal event reconciles a spell omitted between HUD publications exactly once',()=>{
 const {s,nav}=fixture();Game.tick(s,30,nav);Game.cast(s,'grow-compact','growth',6,0,nav,s.plants[0].id);const original=s.spells.at(-1),classic=new ManualMagicActivity(),compact=new ManualMagicActivity();classic.applied(s,original,{gestureSeconds:.3});const view=projectConfirmedActorAudio(s),projected=view.spells.find(spell=>spell.id===original.id);compact.applied(view,projected,{gestureSeconds:.3});
 Game.tick(s,30,nav);const event=s.events.findLast(item=>item.type==='AgriculturalSpellEnded'&&item.spellId===original.id);assert.ok(event);assert.equal(event.remainingSeconds,0);assert.ok(event.growthSecondsAdded>0);assert.equal(s.spells.some(spell=>spell.id===original.id),false);
 const sent=[],queue=createHostPublicationQueue({session:'s',send:item=>sent.push(item)}),packet=(sequence,events)=>({sequence,events,physicsPose:null,snapshot:String(sequence)});queue.publication(packet(1,[]),true);queue.publication(packet(2,[]),true);queue.publication(packet(3,[event]),true);queue.ack(1);assert.equal(sent.at(-1).publication.sequence,3);assert.deepEqual(sent.at(-1).publication.events,[event]);compact.consumeConfirmedEvents([...sent.at(-1).publication.events,event]);const finalView=projectConfirmedActorAudio(s);compact.update(finalView);classic.update(s);assert.deepEqual(compact.report(finalView).days,classic.report(s).days);assert.equal(compact.applied(finalView,projected,{gestureSeconds:.3}),false);
 const delayed=new ManualMagicActivity();delayed.consumeConfirmedEvents([event,event]);assert.equal(delayed.applied(view,projected,{gestureSeconds:.3}),true);assert.deepEqual(delayed.report(finalView).days,classic.report(s).days);
});
test('early confirmed ending credits only actual effect duration',()=>{const metrics=new ManualMagicActivity(),state={day:1,spells:[]},spell={id:'s',kind:'growth',targetPlantId:'p',remaining:30};metrics.applied(state,spell,{gestureSeconds:.5});metrics.consumeConfirmedEvents([{type:'AgriculturalSpellEnded',spellId:'s',kind:'growth',targetPlantId:'p',remainingSeconds:18,growthSecondsAdded:2}]);const row=metrics.report(state).days[0];assert.equal(row.simulatedEffectSeconds,12);assert.equal(row.extraGrowthSeconds,2);assert.equal(row.meaningfulApplicationContactSeconds,.5);});
test('confirmed command identifies its spell even when it ends before the callback',()=>{const {s,nav}=fixture();Game.tick(s,30,nav);Game.cast(s,'cast-id','growth',6,0,nav,s.plants[0].id);const actual=s.spells.at(-1).id;Game.tick(s,30,nav);const activation=s.events.find(event=>event.type==='SpellActivated'&&event.commandId==='cast-id'),ended=s.events.find(event=>event.type==='AgriculturalSpellEnded'&&event.spellId===actual),application=confirmedManualMagicApplication([activation,ended],'cast-id');assert.equal(application.spell.id,actual);assert.equal(application.day,s.day);assert.equal(application.spell.remaining,activation.duration);assert.equal(confirmedManualMagicApplication([activation],'different'),null);const metrics=new ManualMagicActivity();metrics.consumeConfirmedEvents([ended]);metrics.applied({day:application.day,spells:[]},application.spell,{gestureSeconds:.2,benefited:application.benefited});assert.equal(metrics.report().days[0].extraGrowthSeconds,ended.growthSecondsAdded);assert.equal(metrics.report().days[0].simulatedEffectSeconds,activation.duration);});
test('button contact is consumed once; cancellation and keyboard selection report unknown duration',()=>{
 const element=new EventTarget(),consume=bindMagicSelectionContact(element);
 const send=(kind,time)=>{const event=new Event(kind);Object.defineProperties(event,{pointerId:{value:1},timeStamp:{value:time}});element.dispatchEvent(event);};
 send('pointerdown',100);send('pointerup',300);assert.equal(consume(),.2);assert.equal(consume(),null);
 send('pointerdown',400);send('pointercancel',500);assert.equal(consume(),null);
 const metrics=new ManualMagicActivity();metrics.selected(1,'growth',consume());metrics.selected(1,'shield',2);
 assert.equal(metrics.report().days[0].unknownSelectionContacts,1);assert.equal(metrics.report().days[0].selectionContactSeconds,0);
});

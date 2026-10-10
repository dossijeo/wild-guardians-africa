import test from 'node:test';
import assert from 'node:assert/strict';
import {ManualMagicActivity,bindMagicSelectionContact} from '../src/ui/manual-magic-activity.js';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {clearNavigation} from './clear-navigation.js';
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
test('button contact is consumed once; cancellation and keyboard selection report unknown duration',()=>{
 const element=new EventTarget(),consume=bindMagicSelectionContact(element);
 const send=(kind,time)=>{const event=new Event(kind);Object.defineProperties(event,{pointerId:{value:1},timeStamp:{value:time}});element.dispatchEvent(event);};
 send('pointerdown',100);send('pointerup',300);assert.equal(consume(),.2);assert.equal(consume(),null);
 send('pointerdown',400);send('pointercancel',500);assert.equal(consume(),null);
 const metrics=new ManualMagicActivity();metrics.selected(1,'growth',consume());metrics.selected(1,'shield',2);
 assert.equal(metrics.report().days[0].unknownSelectionContacts,1);assert.equal(metrics.report().days[0].selectionContactSeconds,0);
});

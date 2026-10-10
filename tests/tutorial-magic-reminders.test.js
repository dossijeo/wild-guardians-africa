import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {TUTORIAL_IDS,TUTORIAL_MESSAGES} from '../src/tutorial/messages.js';
import {createPlant} from '../src/simulation/crops.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {translate,messages} from '../public/i18n/catalog.js';
function setup(){
 const s=Game.newGame({seed:712});Game.resume(s,'intro');s.day=5;s.time=100;s.elapsed=1000;s.initialPreparation=false;
 s.tutorial.step='done';s.tutorial.basicSkipped=true;s.tutorial.seen=['basic.complete'];
 s.structures.push({id:'center',kind:'center',culture:s.culture,x:0,z:0,yaw:0,status:'intact',hp:600});
 const seen=new Set(TUTORIAL_IDS),profile={read:()=>seen,record:id=>seen.add(id),basicCompleted:true};
 const c=new TutorialController(s,profile);return {s,c,profile};
}
function raid(s,id,status='walking'){s.time=400;s.raid={id,animals:[{id:'animal',species:'warthog',x:10,z:0,radius:1.1,hitsRemaining:2,status}],reservations:{},encounters:[],daytime:false};}
test('shield appears once per day without pausing, including a completed global tutorial',()=>{
 const {s,c}=setup();raid(s,'first','entering');c.update();assert.equal(c.presentation(),null);
 s.raid.animals[0].status='walking';s.raid.animals[0].x=40;c.update();assert.equal(c.presentation(),null);
 s.raid.animals[0].x=10;c.update();assert.equal(c.presentation().id,'reminder.shield');
 for(let i=0;i<20;i++)c.update();assert.equal(c.presentation().id,'reminder.shield');
 assert.deepEqual(s.pauses,[]);c.dismiss();c.update();assert.equal(c.presentation(),null);
 s.raid=null;c.update();raid(s,'second');c.update();assert.equal(c.presentation(),null);
 s.day++;c.update();assert.equal(c.presentation().id,'reminder.shield');
 assert.equal(s.events.filter(e=>e.type==='TutorialMessageStarted'&&e.messageId==='reminder.shield').length,2);
});
test('shield waits for availability, removes obsolete advice when cast or animals leave, and preserves menu pauses',()=>{
 const {s,c}=setup();s.cooldowns.shield=5;raid(s,'first');c.update();assert.equal(c.presentation(),null);
 s.cooldowns.shield=0;c.update();assert.equal(c.presentation().id,'reminder.shield');
 Game.pause(s,'menu');c.update();assert.equal(c.presentation(),null);assert.equal(s.tutorial.reading,'reminder.shield');
 Game.resume(s,'menu');c.update();assert.equal(c.presentation().id,'reminder.shield');
 s.cooldowns.shield=90;c.update();assert.equal(c.presentation(),null);
 s.cooldowns.shield=0;c.update();assert.equal(c.presentation(),null);
 raid(s,'second');c.update();assert.equal(c.presentation(),null);s.day++;c.update();assert.equal(c.presentation().id,'reminder.shield');s.raid=null;c.update();assert.equal(c.presentation(),null);
});
test('saved acknowledged raids do not replay shield advice; an unfinished reminder remains readable after restoration',()=>{
 const {s,c,profile}=setup();raid(s,'first');c.update();
 const loaded=deserialize(serialize(s)),restored=new TutorialController(loaded,profile);
 assert.equal(restored.presentation().id,'reminder.shield');restored.dismiss();
 const again=deserialize(serialize(loaded)),next=new TutorialController(again,profile);assert.equal(next.presentation(),null);
});
test('an arriving raid takes priority over ordinary advice and leaves that explanation queued',()=>{
 const {s,c,profile}=setup();profile.read().delete('worker.recovery');s.tutorial.reading='worker.recovery';raid(s,'urgent');c.update();
 assert.equal(c.presentation().id,'reminder.shield');assert.ok(s.tutorial.pending.includes('worker.recovery'));
 assert.deepEqual(s.pauses,[]);
});
test('render-frequency updates reuse the peaceful plant check until simulated time advances',()=>{
 const {s,c}=setup();s.plants.push(createPlant('plant','mijo',10,10,'center'));
 let scans=0;const some=s.plants.some.bind(s.plants);s.plants.some=(...args)=>{scans++;return some(...args);};
 s.elapsed+=2;c.update();const initial=scans;assert.ok(initial>0);
 for(let frame=0;frame<120;frame++)c.update();assert.equal(scans,initial);
 s.elapsed+=2;c.update();assert.ok(scans>initial);
});
test('growth cannot repeat today and receives its full reading time on the following day',()=>{
 const {s,c}=setup(),p=createPlant('plant','mijo',10,10,'center');s.plants.push(p);p.multiplyHarvest=true;c.update();assert.equal(c.presentation(),null);
 p.water[0].status='manual';s.elapsed+=2;c.update();assert.equal(c.presentation().id,'reminder.growth');
 c.advance(60);c.update();if(c.presentation()?.id==='reminder.multiply')c.dismiss();assert.equal(c.presentation(),null);
 s.elapsed+=119;c.update();assert.equal(c.presentation(),null);
 s.elapsed+=1;c.update();assert.equal(c.presentation(),null);
 s.day++;c.update();assert.equal(c.presentation().id,'reminder.growth');assert.equal(c.advance(1),false);
 c.dismiss();s.cooldowns.growth=90;s.elapsed+=120;c.update();assert.notEqual(c.presentation()?.id,'reminder.growth');
});
test('multiply requires working labour and unmarked live crops, with a gap between peaceful reminders',()=>{
 const {s,c}=setup(),p=createPlant('plant','mijo',10,10,'center');s.plants.push(p);
 s.workers.push({id:'worker',status:'idle',incapacitated:false});s.elapsed+=2;c.update();assert.equal(c.presentation().id,'reminder.multiply');
 c.dismiss();p.multiplyHarvest=true;s.elapsed+=120;c.update();assert.equal(c.presentation(),null);
 p.water[0].status='manual';s.elapsed+=2;c.update();assert.equal(c.presentation().id,'reminder.growth');c.dismiss();
 p.multiplyHarvest=false;s.elapsed+=2;c.update();assert.equal(c.presentation(),null);
 s.elapsed+=73;c.update();assert.equal(c.presentation(),null);
 s.day++;c.update();assert.equal(c.presentation().id,'reminder.multiply');
});
test('new reminders are bilingual and saved reminder times reject corrupt values',()=>{
 for(const id of ['reminder.shield','reminder.growth','reminder.multiply']){
  const text=TUTORIAL_MESSAGES[id].text;assert.ok(messages[text]);assert.equal(translate(text,'es'),text);assert.notEqual(translate(text,'en'),text);
 }
 const {s}=setup();for(const value of [-1,Infinity,s.elapsed+1,'100']){s.tutorial.magicReminders={growthAt:value};assert.throws(()=>serialize(s));}
});

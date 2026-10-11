import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {dailyTutorialMessages} from '../src/tutorial/daily-messages.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const source=readFileSync(new URL('../src/ui/guardian.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export class NativeGuardian','class NativeGuardian');
function guardian(){
 const context=vm.createContext({});vm.runInContext(source+';globalThis.Guardian=NativeGuardian;',context);
 const g=Object.create(context.Guardian.prototype);
 Object.assign(g,{key:'worker.recovery:reading:',root:{classList:{remove(){},add(){}},setAttribute(){},removeAttribute(){}},voice:{active:true,stop(){this.active=false;}},lifecycle:{close(){},finish(){}},present(){}});return g;
}
function setup(){
 const s=Game.newGame({seed:712});s.day=5;s.tutorial.basicSkipped=true;s.tutorial.step='done';s.tutorial.seen=['mechanic.defenses','magic.growth','magic.multiply'];s.people.push({id:'recovering',profile:'olderMale',recoveryUntil:6});
 const p={read:()=>new Set(),record(){},basicCompleted:false},g=guardian();
 const c=new TutorialController(s,p,{isNarrating:()=>g.voice.active});const message=c.presentation();assert.equal(message.id,'worker.recovery');
 g.dismiss=()=>c.dismiss({message});return {s,c,p,g};
}
test('interrupting the displayed voice by opening a panel acknowledges it exactly once',()=>{
 const {s,c,p,g}=setup();let dismissals=0;const dismiss=g.dismiss;g.dismiss=()=>{dismissals++;dismiss();};
 g.hide({immediate:true,interrupt:true});g.hide({immediate:true,interrupt:true});
 assert.equal(g.voice.active,false);assert.equal(dismissals,1);assert(dailyTutorialMessages(s).includes('worker.recovery'));
 for(let i=0;i<20;i++){c.update();assert.notEqual(c.presentation()?.id,'worker.recovery');}
 const restored=new TutorialController(deserialize(serialize(s)),p);assert.notEqual(restored.presentation()?.id,'worker.recovery');
});
test('background hiding preserves an unfinished message instead of acknowledging it',()=>{
 const {s,g}=setup();g.hide({immediate:true});assert.equal(s.tutorial.reading,'worker.recovery');assert(!s.tutorial.seen.includes('worker.recovery'));
});
test('dismissal records the daily ID even when presentation was queried without recording',()=>{
 const s=Game.newGame({seed:712}),p={read:()=>new Set(),record(){},basicCompleted:false},c=new TutorialController(s,p);
 const message=c.presentation({record:false});assert.deepEqual(dailyTutorialMessages(s),[]);c.dismiss({message});
 assert(dailyTutorialMessages(s).includes(message.id));
});

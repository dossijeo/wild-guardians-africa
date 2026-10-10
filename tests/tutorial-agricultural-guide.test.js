import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {waterPlant} from '../src/simulation/crops.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {TutorialProfile} from '../src/tutorial/profile.js';
import {tutorialHudHandTarget} from '../src/ui/tutorial-hud-hand.js';
import {tutorialHandTarget} from '../src/rendering/tutorial-hand-target.js';
import {syncTutorialActionPause} from '../src/tutorial/action-pause.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const nav={field:{surface:()=>0},placement:()=>({valid:true}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
function fixture(count=2){
 const memory=new Map(),profile=new TutorialProfile({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)});
 const s=Game.newGame({slotId:'guided-magic',seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);
 for(let i=0;i<count;i++)Game.plant(s,'seed'+i,'mijo',6+i*1.5,0,nav);
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});s.tutorial.step='observe';s.tutorial.reading=null;s.tutorial.seen=['basic.introduction','basic.center','basic.plant','basic.hiring','basic.work'];
 return {s,profile,c:new TutorialController(s,profile)};
}
test('teaching waits for real water state on every live plant and pauses only for an actionable HUD/world hand',()=>{
 const {s,c}=fixture();assert.equal(s.tutorial.reading,null);
 waterPlant(s.plants[0]);c.update();assert.equal(s.tutorial.reading,null);
 waterPlant(s.plants[1]);c.update();assert.equal(s.tutorial.reading,'magic.growth');
 assert.equal(tutorialHudHandTarget(s,c.presentation()),'[data-menu="magic"]');
 assert.equal(tutorialHandTarget(s,nav,'spell','multiply'),null);
 const target=tutorialHandTarget(s,nav,'spell','growth');assert.equal(target.target,s.plants[0].id);
 assert.equal(tutorialHudHandTarget(s,c.presentation(),'spell','growth'),null);
 assert.equal(syncTutorialActionPause(s,{worldTarget:target}),true);const elapsed=s.elapsed;Game.tick(s,1,nav);assert.equal(s.elapsed,elapsed);
 c.dismiss();syncTutorialActionPause(s);assert.ok(!s.pauses.includes('tutorial-action'));
});
test('a new useful native cast advances Growth to Multiply and selects another valid plant, including reload',()=>{
 const {s,c,profile}=fixture();for(const p of s.plants)waterPlant(p);c.update();const p=s.plants[0];
 const target=tutorialHandTarget(s,nav,'spell','growth');syncTutorialActionPause(s,{worldTarget:target});
 Game.cast(s,'try-growth','growth',p.x,p.z,nav,p.id);c.update();assert.ok(profile.has('magic.growth'));assert.equal(s.tutorial.reading,'magic.multiply');
 const restored=deserialize(serialize(s)),controller=new TutorialController(restored,profile);
 const next=tutorialHandTarget(restored,nav,'spell','multiply');assert.equal(next.target,restored.plants[1].id);
 const plant=restored.plants[1];Game.cast(restored,'try-multiply','multiply',plant.x,plant.z,nav,plant.id);controller.update();
 assert.ok(profile.has('magic.multiply'));assert.notEqual(restored.tutorial.reading,'magic.multiply');syncTutorialActionPause(restored);assert.ok(!restored.pauses.includes('tutorial-action'));
});
test('one-plant exception never points to an impossible second target or locks the simulation',()=>{
 const {s,c}=fixture(1);waterPlant(s.plants[0]);c.update();const p=s.plants[0];Game.cast(s,'try-growth','growth',p.x,p.z,nav,p.id);c.update();
 assert.equal(s.tutorial.reading,'magic.multiply');assert.equal(tutorialHudHandTarget(s,c.presentation()),null);assert.equal(tutorialHandTarget(s,nav,'spell','multiply'),null);
 assert.equal(syncTutorialActionPause(s),false);const elapsed=s.elapsed;Game.tick(s,.1,nav);assert.ok(s.elapsed>elapsed);
});
test('a globally acknowledged Growth lesson still introduces unknown Multiply, and later-day fallback cannot freeze a hand',()=>{
 const {s,c,profile}=fixture();profile.record('magic.growth');s.day=2;c.update();assert.equal(s.tutorial.reading,'mechanic.defenses');c.acknowledge();assert.equal(s.tutorial.reading,'magic.multiply');
 assert.equal(tutorialHudHandTarget(s,c.presentation()),null);assert.equal(syncTutorialActionPause(s,{hudTarget:true}),false);
});

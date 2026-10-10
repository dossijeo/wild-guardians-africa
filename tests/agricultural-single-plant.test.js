import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {spellUnlocked} from '../src/simulation/rules.js';
import {waterPlant,isMature} from '../src/simulation/crops.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {castPickedSpell} from '../src/app/spell-placement.js';
import {ToolSession} from '../src/ui/tool-session.js';
const nav={placement:()=>({valid:true}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
function farm(){
 const s=Game.newGame({slotId:'single-plant',seed:712});Game.resume(s,'intro');
 Game.placeStructure(s,'center',{x:0,z:0},nav);
 for(let i=0;i<3;i++)Game.plant(s,'seed-'+i,'mijo',6+i*1.5,0,nav);
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 s.workers=[];s.tasks=[];s.initialPreparation=false;s.dayPlan={done:true};s.tutorial.step='done';
 for(const p of s.plants)waterPlant(p);
 return s;
}
test('day-one native agricultural commands have no cooldown, no worker requirement and exact single-plant effects',()=>{
 const s=farm(),[a,b,c]=s.plants,rng=s.rng;
 s.cooldowns.growth=90;s.cooldowns.multiply=120;
 assert.ok(spellUnlocked(s,'growth')&&spellUnlocked(s,'multiply'));
 assert.equal(castPickedSpell(s,'a','growth',{entityId:a.id,point:{x:40,z:40}},nav),true);
 assert.equal(castPickedSpell(s,'b','growth',{entityId:b.id,point:null},nav),true);
 assert.equal(Game.spellAt(s,'growth',c),undefined);
 assert.equal(s.cooldowns.growth,0);
 assert.throws(()=>Game.cast(s,'overlap','multiply',a.x,a.z,nav,a.id),/solaparse/);
 Game.tick(s,10,nav);
 assert.ok(Math.abs(a.growth-15)<1e-7);assert.ok(Math.abs(b.growth-15)<1e-7);assert.ok(Math.abs(c.growth-10)<1e-7);
 assert.equal(s.rng,rng);
 assert.equal(castPickedSpell(s,'empty','multiply',{entityId:null,point:{x:c.x,z:c.z}},nav),false);
 assert.equal(castPickedSpell(s,'c','multiply',{entityId:c.id,point:null},nav),true);
 assert.equal(c.multiplyHarvest,true);assert.equal(a.multiplyHarvest,undefined);assert.equal(b.multiplyHarvest,undefined);
 assert.equal(s.cooldowns.multiply,0);
});
test('per-target growth repeats to maturity; snapshots preserve targets, watering and bonus without RNG changes',()=>{
 let s=farm();const id=s.plants[0].id;
 for(let n=0;n<4&&!isMature(s.plants[0]);n++){
  const p=s.plants[0];Game.cast(s,'growth-'+n,'growth',p.x,p.z,nav,p.id);
  s=deserialize(serialize(s));assert.equal(s.spells[0].targetPlantId,id);
  Game.tick(s,30,nav);assert.equal(s.cooldowns.growth,0);
 }
 assert.equal(isMature(s.plants[0]),true);
 assert.throws(()=>Game.cast(s,'mature','growth',6,0,nav,id),/madura/);
 const ended=s.events.filter(e=>e.type==='AgriculturalSpellEnded');
 assert.ok(ended.every(e=>e.growthSecondsAdded>=0&&e.growthSecondsAdded<=15+1e-7));
});
test('Multiply retains one boolean harvest benefit after expiry and repeated visual applications',()=>{
 let s=farm(),p=s.plants[0];Game.cast(s,'first','multiply',p.x,p.z,nav,p.id);
 Game.tick(s,15,nav);s=deserialize(serialize(s));p=s.plants[0];
 assert.equal(p.multiplyHarvest,true);
 Game.cast(s,'again','multiply',p.x,p.z,nav,p.id);
 assert.equal(s.events.at(-1).benefited,false);
 assert.equal(s.spells.length,1);assert.equal(p.multiplyHarvest,true);
 Game.tick(s,15,nav);Game.cast(s,'next-power','growth',p.x,p.z,nav,p.id);
 assert.equal(p.multiplyHarvest,true);
});
test('same command never executes twice; another new tap on another plant is independent',()=>{
 const s=farm(),p=s.plants[0];
 Game.cast(s,'same','growth',p.x,p.z,nav,p.id);const before=serialize(s);
 assert.equal(Game.cast(s,'same','growth',p.x,p.z,nav,p.id),false);assert.equal(serialize(s),before);
 assert.throws(()=>Game.cast(s,'ground','growth',p.x+.01,p.z,nav,p.id),/Selecciona/);
});
test('agricultural selection expires ten seconds after selection/last use, without cancelling native effects',()=>{
 const s=farm(),session=new ToolSession();
 session.select({kind:'spell',spell:'growth'},0);assert.equal(session.expired(9.99),false);
 const p=s.plants[0];Game.cast(s,'cast','growth',p.x,p.z,nav,p.id);session.used(9);
 assert.equal(session.expired(18.99),false);assert.equal(session.expired(19),true);
 session.clear();assert.equal(s.spells[0].remaining,30);
});
test('old area spells retain their existing effects; new agricultural casting remains by plant identity',()=>{
 const s=farm();
 s.spells.push({id:'legacy',kind:'multiply',x:7.5,z:0,radius:2.2,remaining:1,exposureApplied:false});
 const loaded=deserialize(serialize(s));Game.tick(loaded,1,nav);
 assert.ok(loaded.plants.every(p=>p.multiplyHarvest));assert.equal(loaded.spells.length,0);
 Game.cast(loaded,'new','growth',6,0,nav,loaded.plants[0].id);
 assert.equal(Game.spellAt(loaded,'growth',loaded.plants[1]),undefined);
});

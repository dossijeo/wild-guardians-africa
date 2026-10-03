import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,transact,numberOf} from '../src/simulation/money.js';
import {hitStructure} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

// Controlled, flat terrain; real Navigation, paid commands, animation clock,
// raid damage, persistence and collapse state. Arrival/target selection and
// original biome appearance are deliberately tested elsewhere.
function fixture(culture='mapungubwe'){
 const s=Game.newGame({seed:712,culture,slotId:'defense-acceptance'});Game.resume(s,'intro');s.tutorial.step='done';
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-20,z:-20},nav);return {s,nav};
}
const specs={warthog:{damage:40,budget:4,hits:12},hyena:{damage:50,budget:5,hits:10},buffalo:{damage:70,budget:6,hits:7},lion:{damage:80,budget:7,hits:6},rhino:{damage:120,budget:8,hits:4}};
function committedStrike(s,nav,target,species,index){
 const spec=specs[species],animation=index%2?'Weapon_Combo_2':'Weapon_Combo',duration=ANIMAL_ACTIONS.animals[species].clips[animation].duration;
 let animal=s.raid?.animals.find(a=>a.species===species&&a.hitsRemaining>0&&a.status!=='gone');
 if(!animal){animal={id:'animal-'+s.nextId++,species,x:target.x,z:target.z+12,spawn:{x:target.x,z:target.z+40},radius:1,hitsRemaining:spec.budget};s.raid??={id:'raid-acceptance',animals:[],reservations:{},encounters:[]};s.raid.animals.push(animal);}
 Object.assign(animal,{status:'attacking',targetId:target.id,reservation:'structure:'+target.id,path:null,animation,attackId:'attack-'+index,attackDuration:duration,attackRemaining:duration,hitApplied:false});s.raid.reservations[animal.reservation]=animal.id;
 const hp=target.hp,cupo=animal.hitsRemaining,count=s.events.filter(e=>e.type==='AnimalLogicalHit').length;
 Game.tick(s,duration/2,nav);assert.equal(target.hp,hp);assert.equal(animal.hitsRemaining,cupo);
 const stored=serialize(s);Game.pause(s,'qa');Game.tick(s,30,nav);Game.resume(s,'qa');assert.equal(serialize(s),stored);
 s=deserialize(stored);nav.setState(s);target=s.structures.find(e=>e.id===target.id);animal=s.raid.animals.find(e=>e.id===animal.id);
 Game.tick(s,duration/2,nav);assert.equal(target.hp,Math.max(0,hp-spec.damage));assert.equal(animal.hitsRemaining,cupo-1);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,count+1);
 assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit'&&e.attackId==='attack-'+index).length,1);
 if(!animal.hitsRemaining){delete s.raid.reservations[animal.reservation];Object.assign(animal,{status:'gone',targetId:null,reservation:null,path:null});}
 return {s,target};
}
function night(s){s.initialPreparation=false;s.time=320;s.nightPlan={at:320,done:true,group:[]};}
function completeCollapse(s,nav,target,seconds){
 assert.equal(target.status,'collapsing');assert.ok(Math.abs(target.collapseRemaining-seconds)<1e-8);
 const before=serialize(s);Game.pause(s,'qa');Game.tick(s,100,nav);Game.resume(s,'qa');assert.equal(serialize(s),before);
 s=deserialize(before);nav.setState(s);target=s.structures.find(e=>e.id===target.id);
 Game.tick(s,seconds-.01,nav);assert.equal(target.status,'collapsing');assert.ok(target.collapseRemaining>0);
 Game.tick(s,.01,nav);assert.equal(target.status,'ruined');assert.equal(target.hp,0);assert.equal(s.events.filter(e=>e.type==='StructureRuined'&&e.targetId===target.id).length,1);
 Game.tick(s,.1,nav);assert.equal(s.events.filter(e=>e.type==='StructureRuined'&&e.targetId===target.id).length,1);
 const loaded=deserialize(serialize(s));assert.equal(loaded.structures.find(e=>e.id===target.id).status,'ruined');return loaded;
}

for(const [material,cost,hp] of [['zarzas',10,100],['empalizada',20,200],['adobe',35,300],['reforzado',55,400],['piedra',80,500]])test('QA-072: '+material+' paid enclosure has a deterministic gate at the same unit cost and 60% HP',()=>{
 const first=fixture(),second=fixture();for(const f of [first,second])transact(f.s.ledger,'qa-fixture-funding',rational(2000));
 const points=[[0,0],[8,0],[8,8],[0,8],[0,0]],options={smooth:false,snap:false},before=serialize(first.s),preview=Game.previewWallChain(first.s,material,points,first.nav,options);
 assert.equal(serialize(first.s),before);assert.equal(preview.gates,1);
 for(const f of [first,second])Game.buildWallChain(f.s,'closed-chain',material,points,f.nav,options);
 const walls=first.s.structures.filter(e=>e.kind==='wall'),gate=walls.find(e=>e.autoGate);
 assert.equal(walls.filter(e=>e.gate).length,1);assert.equal(gate.maxHp,hp*.6);assert.equal(gate.hp,gate.maxHp);assert.equal(gate.cost,cost);
 assert.equal(numberOf(first.s.ledger.entries['closed-chain']),-walls.length*cost);assert.equal(preview.cost,walls.length*cost);
 assert.deepEqual(walls,second.s.structures.filter(e=>e.kind==='wall'));
 const saved=serialize(first.s);assert.equal(Game.buildWallChain(first.s,'closed-chain',material,points,first.nav,options),false);assert.equal(serialize(first.s),saved);assert.equal(serialize(deserialize(saved)),saved);
});
test('QA-073: two committed warthog hits start bramble collapse at 20 HP, then 1.4 simulated seconds produce one persistent ruin',()=>{
 let {s,nav}=fixture();Game.placeStructure(s,'bramble',{kind:'wall',material:'zarzas',x:0,z:0},nav);let target=s.structures.at(-1);night(s);
 ({s,target}=committedStrike(s,nav,target,'warthog',0));assert.equal(target.hp,60);assert.equal(target.status,'intact');
 ({s,target}=committedStrike(s,nav,target,'warthog',1));assert.equal(target.hp,20);assert.equal(s.events.filter(e=>e.type==='StructureHit'&&e.targetId===target.id).length,2);
 completeCollapse(s,nav,target,1.4);
});
for(const [species,spec] of Object.entries(specs))test('QA-074: '+species+' collapses 600 HP centers after '+spec.hits+' committed hits in each culture',()=>{
 for(const culture of Game.CULTURES){let {s,nav}=fixture(culture),target=s.structures[0];transact(s.ledger,'qa-recovery-funding',rational(600));night(s);
  for(let i=0;i<spec.hits;i++){({s,target}=committedStrike(s,nav,target,species,i));assert.equal(target.status,i===spec.hits-1?'collapsing':'intact');}
  assert.equal(s.events.filter(e=>e.type==='StructureHit'&&e.targetId===target.id).length,spec.hits);
  completeCollapse(s,nav,target,3.2);
 }
});
test('QA-075: BAST 20% remaining and DEST 79% lost keep their distinct inclusive boundaries and irreversible transitions',()=>{
 for(const [kind,maxHp,boundary,seconds] of [['wall',100,20,1.4],['center',600,126,3.2]]){
  const target={kind,maxHp,hp:maxHp,status:'intact',collapseRemaining:0};hitStructure(target,maxHp-boundary-.01);assert.equal(target.status,'intact');
  hitStructure(target,.01);assert.ok(Math.abs(target.hp-boundary)<1e-8);assert.equal(target.status,'collapsing');assert.equal(target.collapseRemaining,seconds);
  const before=structuredClone(target);assert.equal(hitStructure(target,40),false);assert.deepEqual(target,before);
 }
 const center={kind:'center',maxHp:600,hp:600,status:'intact',collapseRemaining:0};hitStructure(center,480);assert.equal(center.hp,120);assert.equal(center.status,'collapsing');
});

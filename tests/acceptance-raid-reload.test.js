import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {rational} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
import {animalPose} from '../src/rendering/animal-actions.js';
import {AudioSystem} from '../src/audio/audio.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const species=['warthog','hyena','buffalo','lion','rhino'];
const checkpoints=['entry','walking','attack','mid-clip','hit','retreat'];
function navigation(s){const n=new Navigation(712,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.activeBounds=[-48,-48,48,48];n.setState(s);return n;}
function fixture(species,culture,seed=712,createRaid=true){
 const s=Game.newGame({seed,slotId:`raid-${species}-${culture}`,culture});Game.resume(s,'intro');s.ledger.balance=rational(10000);const nav=navigation(s);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);s.day=3;s.completedNights=2;s.time=400;s.initialPreparation=false;s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};
 // Explicit species/credit and flat terrain isolate deterministic live reload.
 // Natural composition probabilities and procedural terrain have separate QA.
 if(createRaid){spawnRaid(s,{group:[species]},nav);assert.ok(s.raid);}return {s,nav};
}
function until(s,nav,predicate){for(let i=0;!predicate()&&s.raid&&i<5000;i++)Game.tick(s,.05,nav);assert.ok(predicate(),`${s.time}/${JSON.stringify(s.raid)}`);}
function reach(s,nav,phase){
 if(phase==='entry')return;
 const a=s.raid.animals[0];until(s,nav,()=>a.status==='walking');if(phase==='walking')return;
 until(s,nav,()=>a.status==='attacking');if(phase==='attack')return;
 Game.tick(s,a.attackRemaining*.37,nav);assert.equal(a.status,'attacking');if(phase==='mid-clip')return;
 until(s,nav,()=>s.events.some(e=>e.type==='AnimalLogicalHit'));if(phase==='hit')return;
 until(s,nav,()=>a.status==='retreating');
}
function loaded(s){const map=new Map(),repo=new SaveRepository({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});repo.save(s);return repo.load(s.slotId);}
function domain(s){const copy=JSON.parse(serialize(s));for(const a of copy.raid?.animals??[])delete a.pathVersion;return copy;}
function poses(s){return s.raid?.animals.map(a=>({id:a.id,x:a.x,z:a.z,hits:a.hitsRemaining,status:a.status,...animalPose(a,s.elapsed)}))??[];}

for(const id of species)test(`QA-145: ${id} six live checkpoints reload identically across all five native center cultures`,()=>{
 for(const culture of Game.CULTURES)for(const phase of checkpoints){
  const {s,nav}=fixture(id,culture);reach(s,nav,phase);const before=serialize(s),restored=loaded(s),restoredNav=navigation(restored),raid=s.raid,budget=raid.animals[0].hitsRemaining;
  assert.equal(serialize(restored),before);assert.deepEqual(poses(restored),poses(s));assert.deepEqual(restored.raid.reservations,s.raid.reservations);
  const audio=new AudioSystem({sfx:1,music:1}),sounds=[];audio.sound=async name=>sounds.push(name);audio.remember(restored.events);
  Game.pause(s,'qa');Game.pause(restored,'qa');const frozen=serialize(s);Game.tick(s,30,nav);Game.tick(restored,30,restoredNav);
  assert.equal(serialize(s),frozen);assert.equal(serialize(restored),frozen);Game.resume(s,'qa');Game.resume(restored,'qa');
  let steps=0;
  while((s.raid||restored.raid)&&steps++<5000){
   Game.tick(s,.05,nav);Game.tick(restored,.05,restoredNav);audio.process(restored.events);
   assert.deepEqual(poses(restored),poses(s),`${id}/${culture}/${phase}/step ${steps}`);
   if(steps%20===0)assert.deepEqual(domain(restored),domain(s));
   if(s.raid)assert.ok(s.raid.animals[0].hitsRemaining<=budget&&s.raid.animals[0].hitsRemaining>=0);
  }
  assert.equal(s.raid,null);assert.equal(restored.raid,null);assert.equal(serialize(restored),serialize(s));
  assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,1);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
  assert.deepEqual(raid.reservations,{});assert.ok(raid.animals.every(a=>a.status==='gone'));
  if(id==='rhino')assert.ok(raid.animals[0].hitsRemaining>0,'No free target permits withdrawal without wasting remaining hits');
  assert.equal(sounds.filter(x=>x==='game_attack_over').length,1,'Native end notification must occur once, without replaying save history');
  const hits=s.events.filter(e=>['AnimalLogicalHit','AnimalLogicalMiss'].includes(e.type));assert.equal(new Set(hits.map(e=>e.attackId)).size,hits.length);
  assert.equal(s.events.filter(e=>e.type==='StructureHit').length,s.events.filter(e=>e.type==='AnimalLogicalHit').length);
  const settled=loaded(restored),silent=new AudioSystem({sfx:1,music:1}),replayed=[];silent.sound=async name=>replayed.push(name);silent.remember(settled.events);silent.process(settled.events);
  Game.tick(settled,.1,navigation(settled));silent.process(settled.events);assert.equal(replayed.filter(x=>x==='game_attack_over').length,0);
  assert.equal(settled.events.filter(e=>e.type==='RaidEnded').length,1);
 }
});

for(const id of species)test(`QA-099: ${id} both naturally selected native combos consume exactly one hit after the complete clip, including reload`,()=>{
 for(const animation of ['Weapon_Combo','Weapon_Combo_2']){
  let found=null;
  for(let seed=1;seed<=500&&!found;seed++){
   const candidate=fixture(id,'mapungubwe',seed);reach(candidate.s,candidate.nav,'attack');
   if(candidate.s.raid.animals[0].animation===animation)found=candidate;
  }
  assert.ok(found,'Actual PRNG seed must select the requested native combo');const {s,nav}=found,a=s.raid.animals[0],target=s.structures.find(t=>t.id===a.targetId),budget=a.hitsRemaining,hp=target.hp,attackId=a.attackId;
  assert.equal(a.attackDuration,ANIMAL_ACTIONS.animals[id].clips[animation].duration);
  Game.tick(s,a.attackRemaining-.001,nav);assert.equal(target.hp,hp);assert.equal(a.hitsRemaining,budget);assert.equal(s.events.filter(e=>e.attackId===attackId).length,0);
  const restored=loaded(s),restoredNav=navigation(restored);assert.deepEqual(poses(restored),poses(s));
  Game.tick(s,.001,nav);Game.tick(restored,.001,restoredNav);
  assert.equal(a.hitsRemaining,budget-1);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit'&&e.attackId===attackId).length,1);
  assert.equal(s.events.filter(e=>e.type==='StructureHit').length,1);assert.ok(target.hp<hp);assert.deepEqual(domain(restored),domain(s));
  Game.tick(s,.1,nav);Game.tick(restored,.1,restoredNav);assert.deepEqual(domain(restored),domain(s));
  assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit'&&e.attackId===attackId).length,1);
 }
});

for(const id of species)test(`QA-097: ${id} a destroyed crop releases its reservation and retargets with the same remaining budget`,()=>{
 const {s,nav}=fixture(id,'mapungubwe',712,false);
 // Prepare the paid crops through legal daytime commands before spawning an
 // explicit attack. Do not force a target, clip, animal position or hit count.
 s.time=100;Game.plant(s,'millet','mijo',8,4,nav);Game.plant(s,'banana','platano',12,4,nav);spawnRaid(s,{group:[id]},nav);
 const a=s.raid.animals[0],banana=s.plants[1],millet=s.plants[0];until(s,nav,()=>a.targetId===banana.id);const budget=a.hitsRemaining,reservation=a.reservation;
 until(s,nav,()=>!banana.alive);assert.equal(a.hitsRemaining,budget-1);assert.equal(millet.alive,true);
 until(s,nav,()=>a.targetId===millet.id);assert.equal(a.hitsRemaining,budget-1);assert.equal(s.raid.reservations[reservation],undefined);
 assert.equal(s.raid.reservations[a.reservation],a.id);assert.equal(Object.values(s.raid.reservations).filter(owner=>owner===a.id).length,1);
 until(s,nav,()=>!millet.alive);assert.equal(a.hitsRemaining,budget-2);assert.equal(s.events.filter(e=>e.type==='CropDestroyed').length,2);
});

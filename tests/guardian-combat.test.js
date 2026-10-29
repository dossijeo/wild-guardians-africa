import test from 'node:test';import assert from 'node:assert/strict';
import {Bone,Group,Quaternion} from 'three';
import {updateRaid} from '../src/simulation/raids.js';
import {applyAnimalImpact,captureAnimalImpact,restoreAnimalImpact} from '../src/rendering/animal-impact.js';
import * as Game from '../src/simulation/game.js';import {ATTACK} from '../src/simulation/guardian-combat.js';import {impactResponse} from '../src/rendering/animal-impact.js';import {castPickedSpell} from '../src/app/spell-placement.js';import {serialize,deserialize} from '../src/persistence/snapshots.js';
const nav={walkable:()=>true,terrainValid:()=>true,placement:()=>({valid:true}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}],field:{surface:()=>0}};
test('impact preserves the imported model orientation and never accumulates offsets',()=>{const model=new Group();model.rotation.x=-Math.PI/2;const base=model.quaternion.clone(),data={model},animal={species:'hyena',x:0,z:0,magicImpact:{at:0,point:{x:0,y:1,z:0},direction:{x:1,y:-.3,z:0}}};for(let i=0;i<20;i++){restoreAnimalImpact(data);applyAnimalImpact(data,animal,.12);assert.ok(model.quaternion.angleTo(base)<.1);}restoreAnimalImpact(data);assert.ok(model.quaternion.angleTo(base)<1e-7);});
function ready(species='hyena'){const s=Game.newGame({seed:712,slotId:'combat'});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:12,z:8},nav);s.day=5;s.time=400;s.initialPreparation=false;s.elapsed=10;const a={id:'beast',species,x:17,z:8,radius:.7,status:'attacking',heading:0,hitsRemaining:4,attackRemaining:1,targetId:s.structures[0].id,reservation:'r',spawn:{x:30,z:0}};s.raid={animals:[a],reservations:{r:a.id}};return {s,a};}
const fire=(s,id='hit',extra={})=>Game.cast(s,id,'attack',17,8,nav,{targetId:'beast',origin:{x:15,y:2,z:8},contact:{x:16.5,y:.8,z:8},...extra});

test('walking and newly retreating targets stay at the selected contact until projectile impact',()=>{
 for(const species of Object.keys(ATTACK.profiles))for(const exhaustsResistance of [false,true]){
  const {s,a}=ready(species);a.status='walking';
  if(exhaustsResistance)a.magicHealth=ATTACK.damage;
  fire(s);const position={x:a.x,z:a.z},contact={...a.magicImpact.point};
  assert.equal(a.status,exhaustsResistance?'retreating':'walking');
  assert.ok(a.magicStunUntil>=a.magicImpact.impactAt,`${species}: stun ends before contact`);
  const castTime=s.elapsed;
  for(const offset of [.05,.14,.239]){
   s.elapsed=castTime+offset;updateRaid(s,.05,nav);
   assert.deepEqual({x:a.x,z:a.z},position);
   assert.deepEqual(a.magicImpact.point,contact);
   assert.equal(impactResponse(a,s.elapsed),null);
  }
 }
});
test('rejected casts do no placement work, and placement failure cannot cancel damage',()=>{const {s,a}=ready();let calls=0;s.cooldowns.attack=1;assert.throws(()=>fire(s,'blocked',{origin:()=>{calls++;}}));assert.equal(calls,0);s.cooldowns.attack=0;assert.equal(fire(s,'valid',{origin:()=>{calls++;throw Error('visual failure');}}),true);assert.equal(calls,1);assert.equal(a.magicHealth,28);});
test('Attack uses native command deduplication, cooldown, and leaves other spell areas untouched',()=>{const {s,a}=ready();assert.equal(fire(s),true);assert.equal(a.magicHealth,28);assert.equal(a.status,'walking');assert.ok(a.magicStunUntil>s.elapsed);assert.equal(s.cooldowns.attack,12);assert.equal(s.spells.length,0);const before=serialize(s);assert.equal(fire(s),false);assert.equal(serialize(s),before);assert.throws(()=>fire(s,'second'),/recargando/);assert.equal(a.magicHealth,28);});
test('only the selected active beast is hit, with the real surface contact retained',()=>{const {s,a}=ready();assert.throws(()=>castPickedSpell(s,'bad','attack',{entityId:'tree',point:{x:17,z:8}},nav),/bestia/);assert.equal(s.cooldowns.attack,0);fire(s);assert.deepEqual(a.magicImpact.point,{x:16.5,y:.8,z:8});assert.equal(s.events.filter(e=>e.type==='GuardianMagicHit').length,1);assert.equal(s.events.filter(e=>e.type==='SpellActivated').length,1);});
test('species resistance differs and retreat releases the existing target reservation',()=>{for(const species of Object.keys(ATTACK.profiles)){const {s,a}=ready(species);const hits=Math.ceil(ATTACK.profiles[species].resilience/ATTACK.damage);for(let i=0;i<hits;i++){s.cooldowns.attack=0;fire(s,'hit-'+i);if(i<hits-1)assert.notEqual(a.status,'retreating');}assert.equal(a.status,'retreating');assert.equal(a.targetId,null);assert.equal(s.raid.reservations.r,undefined);assert.equal(s.events.filter(e=>e.type==='AnimalRetreating').length,1);s.cooldowns.attack=0;assert.throws(()=>fire(s,'again'),/bestia/);}});
test('invalid vectors and menu pause do not mutate health or spend cooldown',()=>{const {s,a}=ready();assert.throws(()=>fire(s,'bad',{contact:{x:NaN,y:0,z:0}}),/invÃ¡lido/);assert.equal(a.magicHealth,undefined);s.pauses.push('menu');assert.throws(()=>fire(s),/disponible/);assert.equal(s.cooldowns.attack,0);});
test('directional response distinguishes sides, descending hits and mass, and decays to rest',()=>{const {a}=ready();a.magicImpact={at:10,point:{x:17,y:1,z:8},direction:{x:1,y:0,z:0}};const lateral=impactResponse(a,10.12);a.magicImpact.direction.x=-1;assert.ok(lateral.roll*impactResponse(a,10.12).roll<0);a.magicImpact.direction={x:0,y:-.8,z:.6};assert.notEqual(impactResponse(a,10.12).pitch,0);a.magicImpact.direction={x:1,y:0,z:0};a.species='rhino';assert.ok(Math.abs(impactResponse(a,10.12).roll)<Math.abs(lateral.roll));assert.equal(impactResponse(a,12),null);});

test('impact contact, intensity and ground survive snapshots and reject invalid values',()=>{const {s,a}=ready();fire(s);assert.deepEqual(deserialize(serialize(s)).raid.animals[0].magicImpact,a.magicImpact);a.magicImpact.ground=NaN;assert.throws(()=>serialize(s),/Impacto/);a.magicImpact.ground=0;a.magicImpact.intensity=Infinity;assert.throws(()=>serialize(s),/Impacto/);});


test('expired impact stops touching the skeleton and a new hit resumes from the current pose',()=>{
 const model=new Group(),bone=new Bone();bone.name='Spine';model.add(bone);const data={model},animal={species:'hyena',x:0,z:0,magicImpact:{at:0,point:{x:0,y:1,z:0},direction:{x:1,y:0,z:0}}};
 captureAnimalImpact(data,animal,.1);applyAnimalImpact(data,animal,.1);assert.equal(data.impactApplied,true);restoreAnimalImpact(data);
 bone.rotation.y=.7;const walking=bone.quaternion.clone();let copies=0;const copy=bone.quaternion.copy;bone.quaternion.copy=function(q){copies++;return copy.call(this,q);};
 for(let i=0;i<100;i++){captureAnimalImpact(data,animal,2+i/30);applyAnimalImpact(data,animal,2+i/30);restoreAnimalImpact(data);}
 assert.equal(copies,0);assert.ok(bone.quaternion.angleTo(walking)<1e-7);
 animal.magicImpact={...animal.magicImpact,at:6};captureAnimalImpact(data,animal,6);bone.rotation.y=1;applyAnimalImpact(data,animal,6);assert.ok(bone.quaternion.angleTo(walking)<1e-7);restoreAnimalImpact(data);assert.ok(Math.abs(bone.rotation.y-1)<1e-7);
 const loaded={model:new Group()};captureAnimalImpact(loaded,animal,20);applyAnimalImpact(loaded,animal,20);assert.equal(loaded.impactBones,undefined);
});


test('presentation marker survives saves while damage and interruption remain immediate',()=>{
 const {s,a}=ready();fire(s);assert.equal(a.magicHealth,28);assert.ok(a.magicStunUntil>s.elapsed);assert.equal(impactResponse(a,s.elapsed+.18),null);assert.ok(impactResponse(a,s.elapsed+.3));
 assert.ok(Math.abs(a.magicImpact.impactAt-s.elapsed-.24)<1e-9);assert.equal(deserialize(serialize(s)).raid.animals[0].magicImpact.impactAt,a.magicImpact.impactAt);
 a.magicImpact.impactAt=s.elapsed+5;assert.throws(()=>serialize(s),/Impacto/);
});


test('Attack cooldown counts simulation time, survives saving and pauses, and prevents rapid recasts',()=>{
 const {s,a}=ready();fire(s);
 Game.tick(s,.1,nav);assert.ok(Math.abs(s.cooldowns.attack-11.9)<1e-8);
 assert.throws(()=>fire(s,'rapid'),/recargando/);
 const restored=deserialize(serialize(s));assert.equal(restored.cooldowns.attack,s.cooldowns.attack);
 Game.pause(s,'menu');Game.tick(s,5,nav);assert.equal(s.cooldowns.attack,restored.cooldowns.attack);
 Game.resume(s,'menu');
 for(let i=0;i<118;i++)Game.tick(s,.1,nav);
 assert.ok(Math.abs(s.cooldowns.attack-.1)<1e-8);assert.throws(()=>fire(s,'early'),/recargando/);
 Game.tick(s,.1,nav);assert.equal(s.cooldowns.attack,0);
 // Reposition the live target after its normal navigation during the cooldown.
 a.x=17;a.z=8;a.status='walking';assert.equal(fire(s,'ready-again'),true);
});
